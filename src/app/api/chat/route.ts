
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { RagService } from '@/lib/ai/rag';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const maxDuration = 30;

// Helper to get the correct model based on provider and model ID
function getModel(modelId: string) {
    // OpenAI models
    if (modelId.startsWith('gpt-')) {
        return openai(modelId);
    }

    // Anthropic models
    if (modelId.startsWith('claude-')) {
        return anthropic(modelId);
    }

    // Google models
    if (modelId.startsWith('gemini-')) {
        return google(modelId);
    }

    // Default to GPT-4o Mini
    return openai('gpt-4o-mini');
}

// Helper to determine provider from model ID
function getProvider(modelId: string): string {
    if (modelId.startsWith('gpt-')) return 'OpenAI';
    if (modelId.startsWith('claude-')) return 'Anthropic';
    if (modelId.startsWith('gemini-')) return 'Google';
    return 'Unknown';
}

export async function POST(req: Request) {
    const { messages, model, conversationId } = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Get User Role to determine RAG permissions
    const { data: profile } = await supabase.from('profiles').select('tenant_id, role').eq('id', user.id).single();
    const tenantId = profile?.tenant_id;
    const role = profile?.role || 'member';

    if (!tenantId) {
        return new Response('No organization found', { status: 400 });
    }

    // Security Filter: Owners see Internal + Shared, Members see Shared only
    const visibilityFilter = role === 'owner' ? ['internal', 'shared'] : ['shared'];

    // Select the AI model
    const selectedModel = model || 'gpt-4o-mini';
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
                    return docs.length > 0 ? JSON.stringify(docs) : "No relevant documents found.";
                }
            }
        },
        system: `You are Orbit, an AI assistant for service professionals using OrbitCRM.
Current User Role: ${role}.

You help users manage their CRM, draft emails, create tasks, analyze contacts, and find information.

You have access to tools:
- Always use 'search_documents' if the user asks about files, contracts, or specific client info.
- If you find documents, cite them in your answer.

Be concise, professional, and helpful.`,
        onFinish: async ({ usage }) => {
            // Record token usage for billing and analytics
            if (usage && conversationId) {
                try {
                    await supabase.from('token_usage').insert({
                        tenant_id: tenantId,
                        user_id: user.id,
                        conversation_id: conversationId,
                        model: selectedModel,
                        provider: getProvider(selectedModel),
                        prompt_tokens: usage.promptTokens || 0,
                        completion_tokens: usage.completionTokens || 0,
                        total_tokens: usage.totalTokens || 0,
                        estimated_cost_cents: 0, // TODO: Calculate based on pricing
                    });
                } catch (error) {
                    console.error('Failed to record token usage:', error);
                    // Don't fail the request if token tracking fails
                }
            }
        },
    });

    return (result as any).toDataStreamResponse();
}
