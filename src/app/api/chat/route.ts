
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { RagService } from '@/lib/ai/rag';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { chatLimiter, rateLimitResponse } from '@/lib/rate-limit';
import {
  canAccessModel,
  calculateEffectiveTokens,
  getSuggestedUpgrade,
  type AIModel,
  type SubscriptionTier,
} from '@/lib/pricing';

export const maxDuration = 30;

// Helper to get the correct model based on provider and model ID
function getModel(modelId: string) {
    if (modelId.startsWith('gpt-'))    return openai(modelId);
    if (modelId.startsWith('claude-')) return anthropic(modelId);
    if (modelId.startsWith('gemini-')) return google(modelId);
    return openai('gpt-4o-mini');
}

// Helper to determine provider from model ID
function getProvider(modelId: string): string {
    if (modelId.startsWith('gpt-'))    return 'OpenAI';
    if (modelId.startsWith('claude-')) return 'Anthropic';
    if (modelId.startsWith('gemini-')) return 'Google';
    return 'Unknown';
}

// Pre-flight estimate: assume 2,000 effective tokens worst-case.
// Blocks the request early if the balance is already critically low.
// Actual deduction uses real token counts in onFinish.
const PRE_FLIGHT_ESTIMATE = 2_000;

export async function POST(req: Request) {
    const { messages, model, conversationId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    // ── Rate limit: 20 AI requests per minute per user ──
    const rl = chatLimiter.check(user.id);
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    // ── Load profile + org ──
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

    const tenantId = profile?.tenant_id;
    const role = profile?.role || 'member';

    if (!tenantId) {
        return new Response('No organization found', { status: 400 });
    }

    const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier, token_balance, token_pack_balance, token_daily_balance')
        .eq('id', tenantId)
        .single();

    const tier = (org?.subscription_tier ?? 'free') as SubscriptionTier;

    // ── Model access check ──
    const selectedModel = (model || 'gpt-4o-mini') as AIModel;
    if (!canAccessModel(tier, selectedModel)) {
        const upgrade = getSuggestedUpgrade(tier);
        return Response.json(
            {
                error: 'model_not_available',
                message: `${selectedModel} requires the ${upgrade} plan or higher.`,
                upgrade_to: upgrade,
            },
            { status: 403 }
        );
    }

    // ── Pre-flight token check ──
    // We check before calling the AI to avoid burning an API call on a zero-balance user.
    const estimatedEffective = calculateEffectiveTokens(PRE_FLIGHT_ESTIMATE, selectedModel);
    const totalAvailable = (org?.token_balance ?? 0) + (org?.token_pack_balance ?? 0);

    if (totalAvailable < estimatedEffective) {
        const upgrade = getSuggestedUpgrade(tier);
        return Response.json(
            {
                error: 'insufficient_tokens',
                message: 'You have used all your AI tokens for this period.',
                remaining: totalAvailable,
                upgrade_to: upgrade,
                reset_info: tier === 'free'
                    ? 'Your daily allowance resets at midnight UTC. Monthly allocation resets on the 1st.'
                    : 'Your monthly allocation resets on the 1st of next month.',
            },
            { status: 402 }
        );
    }

    // ── Security Filter: Owners see Internal + Shared, Members see Shared only ──
    const visibilityFilter = role === 'owner' ? ['internal', 'shared'] : ['shared'];

    const aiModel = getModel(selectedModel);

    const result = await streamText({
        model: aiModel,
        messages,
        tools: {
            search_documents: {
                description: 'Search for documents in the vault based on query',
                inputSchema: z.object({
                    query: z.string().describe('The search query')
                }),
                execute: async ({ query }: { query: string }) => {
                    // @ts-ignore
                    const docs = await RagService.searchSimilarDocuments(query, tenantId, visibilityFilter);
                    return docs.length > 0 ? JSON.stringify(docs) : 'No relevant documents found.';
                }
            }
        },
        system: `You are Orbit, an AI assistant for service professionals using OrbitCRM.
Current User Role: ${role}.

You help users manage their CRM, draft emails, create tasks, analyse contacts, and find information.

You have access to tools:
- Always use 'search_documents' if the user asks about files, contracts, or specific client info.
- If you find documents, cite them in your answer.

Be concise, professional, and helpful.`,
        onFinish: async ({ usage }) => {
            if (!usage) return;

            const realTokens = (usage.inputTokens || 0) + (usage.outputTokens || 0);
            const effectiveTokens = calculateEffectiveTokens(realTokens, selectedModel);

            // ── Deduct effective tokens atomically (pack first, then plan balance) ──
            try {
                await supabase.rpc('check_and_deduct_tokens', {
                    p_tenant_id: tenantId,
                    p_tokens:    effectiveTokens,
                });
            } catch (err) {
                console.error('Token deduction failed:', err);
                // Non-fatal — response already delivered
            }

            // ── Record detailed usage for analytics / billing audit ──
            if (conversationId) {
                try {
                    await supabase.from('token_usage').insert({
                        tenant_id:            tenantId,
                        user_id:              user.id,
                        conversation_id:      conversationId,
                        model:                selectedModel,
                        provider:             getProvider(selectedModel),
                        prompt_tokens:        usage.inputTokens    || 0,
                        completion_tokens:    usage.outputTokens   || 0,
                        total_tokens:         realTokens,
                        estimated_cost_cents: 0,
                    });
                } catch (error) {
                    console.error('Failed to record token usage:', error);
                }
            }
        },
    });

    return (result as any).toDataStreamResponse();
}
