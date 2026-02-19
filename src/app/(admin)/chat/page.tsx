'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type FileUIPart } from 'ai'
import { useChatStore } from '@/stores/chat-store'
import { createClient } from '@/lib/supabase/client'
import { type SubscriptionTier } from '@/lib/pricing'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { AVAILABLE_MODELS } from '@/types/chat'
import { cn } from '@/lib/utils'
import { Plus, Send, Bot, X, MessageSquare, Loader2, Paperclip, FileText } from 'lucide-react'
import { TokenUsageMeter } from '@/components/token-usage-meter'
import { ChatFileAttachment, type AttachedFile } from '@/components/chat/chat-file-attachment'

// ── File attachment constants ──────────────────────────────────────────────────
const ALLOWED_MEDIA_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
])
const PDF_MEDIA_TYPE = 'application/pdf'
const MAX_FILE_SIZE  = 5 * 1024 * 1024   // 5 MB
const MAX_FILES      = 3

// ── Lightweight hook: fetch the org's subscription tier ───────────────────────
function useOrgTier() {
    const [tier, setTier] = useState<SubscriptionTier>('free')

    useEffect(() => {
        const supabase = createClient()
        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase
                .from('profiles').select('tenant_id').eq('id', user.id).single()
            if (!profile?.tenant_id) return
            const { data: org } = await supabase
                .from('organizations').select('subscription_tier').eq('id', profile.tenant_id).single()
            if (org?.subscription_tier) setTier(org.subscription_tier as SubscriptionTier)
        }
        load()
    }, [])

    return tier
}

export default function ChatPage() {
    const {
        conversations,
        activeConversationId,
        createConversation,
        deleteConversation,
        setActiveConversation,
        addMessage,
        getConversation,
        fetchConversations,
        updateConversationModel,
        isLoading: isLoadingConversations
    } = useChatStore()

    const [selectedModel, setSelectedModel] = useState('gpt-4o-mini')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const fileInputRef   = useRef<HTMLInputElement>(null)

    const activeConversation = activeConversationId ? getConversation(activeConversationId) : null
    const orgTier = useOrgTier()

    // ── File attachment state ──────────────────────────────────────────────────
    const [attachments, setAttachments] = useState<AttachedFile[]>([])
    const [fileError, setFileError]     = useState<string | null>(null)

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => { attachments.forEach(a => URL.revokeObjectURL(a.url)) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Sync selected model with active conversation
    useEffect(() => {
        if (activeConversation) {
            setSelectedModel(activeConversation.model || 'gpt-4o-mini')
        }
    }, [activeConversation])

    // Use the Vercel AI SDK's useChat hook for streaming.
    // @ai-sdk/react v3: api/body/onFinish moved to transport + ChatInit.
    // input/handleInputChange/handleSubmit removed — manage input locally, use sendMessage().
    const [input, setInput] = useState('')
    const { messages, sendMessage, status, setMessages } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
            prepareSendMessagesRequest: ({ messages: msgs, ...options }) => ({
                ...options,
                messages: msgs,
                body: {
                    ...options.body,
                    model: selectedModel,
                    conversationId: activeConversationId,
                },
            }),
        }),
        onFinish: async ({ message }) => {
            if (activeConversationId) {
                const content = message.parts
                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map(p => p.text)
                    .join('')
                await addMessage(activeConversationId, { role: 'assistant', content })
            }
        },
    })
    const isLoading = status === 'streaming' || status === 'submitted'

    // Fetch conversations on mount
    useEffect(() => {
        fetchConversations()
    }, [fetchConversations])

    // Sync messages with active conversation
    useEffect(() => {
        if (activeConversation) {
            const chatMessages = activeConversation.messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
            }))
            setMessages(chatMessages as any)
        } else {
            setMessages([])
        }
    }, [activeConversationId, setMessages])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // ── File handling ──────────────────────────────────────────────────────────

    const handleFiles = useCallback((incoming: FileList | File[]) => {
        setFileError(null)
        const candidates = Array.from(incoming)
        const rejected: string[] = []

        const valid = candidates.filter(f => {
            if (!ALLOWED_MEDIA_TYPES.has(f.type)) {
                rejected.push(`${f.name}: unsupported format`)
                return false
            }
            if (f.type === PDF_MEDIA_TYPE && orgTier === 'free') {
                rejected.push(`${f.name}: PDF requires Pro plan`)
                return false
            }
            if (f.size > MAX_FILE_SIZE) {
                rejected.push(`${f.name}: exceeds 5 MB limit`)
                return false
            }
            return true
        })

        if (rejected.length > 0) setFileError(rejected.join(' · '))

        if (valid.length === 0) return

        const newItems: AttachedFile[] = valid.map(file => ({
            id: crypto.randomUUID(),
            file,
            url: URL.createObjectURL(file),
            mediaType: file.type,
            filename: file.name,
        }))

        setAttachments(prev => {
            const combined = [...prev, ...newItems]
            // Revoke URLs for anything beyond the cap
            combined.slice(MAX_FILES).forEach(a => URL.revokeObjectURL(a.url))
            return combined.slice(0, MAX_FILES)
        })
    }, [orgTier])

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const images: File[] = []
        // Check .files first (screenshot paste)
        Array.from(e.clipboardData.files)
            .filter(f => f.type.startsWith('image/'))
            .forEach(f => images.push(f))
        // Fallback: .items (right-click-copy from browser)
        if (images.length === 0) {
            Array.from(e.clipboardData.items)
                .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
                .forEach(item => { const f = item.getAsFile(); if (f) images.push(f) })
        }
        if (images.length > 0) {
            e.preventDefault()
            handleFiles(images)
        }
    }, [handleFiles])

    const removeAttachment = useCallback((id: string) => {
        setAttachments(prev => {
            const removed = prev.find(a => a.id === id)
            if (removed) URL.revokeObjectURL(removed.url)
            return prev.filter(a => a.id !== id)
        })
    }, [])

    // ── Submit ─────────────────────────────────────────────────────────────────

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if ((!input.trim() && attachments.length === 0) || isLoading) return

        let conversationId = activeConversationId
        if (!conversationId) {
            const newConv = await createConversation({ model: selectedModel })
            if (!newConv) return
            conversationId = newConv.id
        }

        // DB-safe content — never store base64 in Supabase
        const dbContent = attachments.length > 0
            ? `${input}${input ? '\n' : ''}[${attachments.length} file(s) attached]`
            : input

        await addMessage(conversationId, { role: 'user', content: dbContent })

        // Encode attachments as data URLs (chunked btoa avoids stack overflow on large files)
        const fileParts: FileUIPart[] = await Promise.all(
            attachments.map(async ({ file, mediaType, filename }) => {
                const bytes = new Uint8Array(await file.arrayBuffer())
                const CHUNK = 0x8000
                let binary = ''
                for (let i = 0; i < bytes.length; i += CHUNK)
                    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
                return {
                    type: 'file' as const,
                    mediaType,
                    filename,
                    url: `data:${mediaType};base64,${btoa(binary)}`,
                }
            })
        )

        // Clear state before sending
        const text = input
        setInput('')
        setFileError(null)
        attachments.forEach(a => URL.revokeObjectURL(a.url))
        setAttachments([])

        // AI SDK v3: sendMessage with optional files array
        sendMessage({ text, files: fileParts.length > 0 ? fileParts : undefined })
    }

    const handleModelChange = async (newModel: string) => {
        setSelectedModel(newModel)
        if (activeConversationId) {
            await updateConversationModel(activeConversationId, newModel)
        }
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-[#3D4A67]">AI Chat</h1>
                    <p className="text-slate-600">Your intelligent CRM assistant</p>
                </div>
                <Button
                    className="bg-[#D1855C] hover:bg-[#B1653C] text-white gap-2"
                    onClick={() => { createConversation() }}
                >
                    <Plus className="h-4 w-4" />
                    New Chat
                </Button>
            </div>

            <div className="flex flex-1 gap-4 pt-4 overflow-hidden">
                {/* Conversations List */}
                <Card className="w-64 flex-shrink-0 border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardContent className="p-4 h-full overflow-y-auto">
                        <h3 className="mb-4 font-semibold text-[#3D4A67] flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Conversations
                        </h3>
                        {isLoadingConversations ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        ) : conversations.length === 0 ? (
                            <p className="text-sm text-slate-500">No conversations yet</p>
                        ) : (
                            <div className="space-y-2">
                                {conversations.slice().reverse().map((conv) => (
                                    <div
                                        key={conv.id}
                                        className={cn(
                                            "p-2 rounded-lg cursor-pointer text-sm group flex justify-between items-start transition-colors",
                                            activeConversationId === conv.id
                                                ? "bg-[#3D4A67]/10 text-[#3D4A67]"
                                                : "hover:bg-slate-100 text-slate-700"
                                        )}
                                        onClick={() => setActiveConversation(conv.id)}
                                    >
                                        <span className="truncate flex-1">{conv.title}</span>
                                        <button
                                            className="opacity-0 group-hover:opacity-100 text-[#D1855C] hover:text-[#B1653C] ml-2"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteConversation(conv.id)
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Token usage meter */}
                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <TokenUsageMeter />
                        </div>
                    </CardContent>
                </Card>

                {/* Chat Area */}
                <div className="flex flex-1 flex-col min-w-0">
                    <Card className="flex-1 border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                        {activeConversation ? (
                            <>
                                {/* Model selector */}
                                <div className="p-3 border-b border-slate-200 flex items-center gap-2">
                                    <span className="text-sm text-slate-600">Model:</span>
                                    <Select value={selectedModel} onValueChange={handleModelChange}>
                                        <SelectTrigger className="w-48 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AVAILABLE_MODELS.map((model) => (
                                                <SelectItem key={model.id} value={model.id}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{model.name}</span>
                                                        <span className="text-xs text-slate-500">{model.description}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-xs text-slate-500 ml-2">
                                        {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.provider}
                                    </span>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {messages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                "flex",
                                                message.role === 'user' ? 'justify-end' : 'justify-start'
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap",
                                                    message.role === 'user'
                                                        ? 'bg-[#3D4A67] text-white'
                                                        : 'bg-slate-100 text-slate-900'
                                                )}
                                            >
                                                {/* File attachments — rendered above the text */}
                                                {message.parts
                                                    .filter((p): p is FileUIPart => p.type === 'file')
                                                    .map((p, i) =>
                                                        p.mediaType?.startsWith('image/') ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img
                                                                key={i}
                                                                src={p.url}
                                                                alt={p.filename || 'attached image'}
                                                                className="max-w-xs max-h-48 rounded mb-2 object-contain block"
                                                            />
                                                        ) : (
                                                            <div key={i} className="flex items-center gap-1.5 text-xs mb-2 opacity-80">
                                                                <FileText className="h-4 w-4 flex-shrink-0" />
                                                                <span className="truncate">{p.filename || 'PDF attached'}</span>
                                                            </div>
                                                        )
                                                    )
                                                }
                                                {/* Text content */}
                                                {message.parts
                                                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                                                    .map(p => p.text)
                                                    .join('')}
                                            </div>
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 text-slate-600 rounded-lg px-4 py-2 flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Thinking...</span>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            </>
                        ) : (
                            <CardContent className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-[#D1855C]/10 flex items-center justify-center mb-4">
                                        <Bot className="h-8 w-8 text-[#D1855C]" />
                                    </div>
                                    <p className="text-slate-600">
                                        Start a new conversation or select one from the sidebar
                                    </p>
                                    <Button
                                        className="mt-4 bg-[#D1855C] hover:bg-[#B1653C] text-white gap-2"
                                        onClick={() => createConversation()}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Start New Chat
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Input Area */}
                    <div className="mt-4">
                        {/* Attachment preview strip */}
                        {attachments.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-2 px-1">
                                {attachments.map(att => (
                                    <ChatFileAttachment
                                        key={att.id}
                                        attachment={att}
                                        onRemove={removeAttachment}
                                    />
                                ))}
                            </div>
                        )}

                        {/* File error */}
                        {fileError && (
                            <p className="text-xs text-red-500 mb-1.5 px-1">{fileError}</p>
                        )}

                        <form onSubmit={handleChatSubmit} className="flex gap-2">
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                                onChange={(e) => {
                                    if (e.target.files) handleFiles(e.target.files)
                                    e.target.value = ''   // reset so same file can be picked again
                                }}
                            />

                            {/* Paperclip button */}
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={isLoading || !activeConversation || attachments.length >= MAX_FILES}
                                onClick={() => fileInputRef.current?.click()}
                                title={
                                    orgTier === 'free'
                                        ? 'Attach image (PDF requires Pro)'
                                        : 'Attach image or PDF (max 5 MB)'
                                }
                                className="flex-shrink-0"
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>

                            <Input
                                placeholder="Type your message… or paste a screenshot"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={handlePaste}
                                disabled={isLoading}
                                className="flex-1 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                            />

                            <Button
                                type="submit"
                                className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white flex-shrink-0"
                                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
