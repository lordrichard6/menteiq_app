'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useChatStore } from '@/stores/chat-store'
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
import { Plus, Send, Bot, X, MessageSquare, Loader2 } from 'lucide-react'
import { TokenUsageMeter } from '@/components/token-usage-meter'

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

    const activeConversation = activeConversationId ? getConversation(activeConversationId) : null

    // Sync selected model with active conversation
    useEffect(() => {
        if (activeConversation) {
            setSelectedModel(activeConversation.model || 'gpt-4o-mini')
        }
    }, [activeConversation])

    // Use the Vercel AI SDK's useChat hook for streaming.
    // @ai-sdk/react v3 breaking change: api/body/onFinish moved to transport + ChatInit.
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
                // UIMessage.parts contains text parts; join them to get full content
                const content = message.parts
                    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                    .map(p => p.text)
                    .join('')
                await addMessage(activeConversationId, {
                    role: 'assistant',
                    content,
                })
            }
        },
    })
    const isLoading = status === 'streaming' || status === 'submitted'
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        let conversationId = activeConversationId
        if (!conversationId) {
            const newConv = await createConversation({ model: selectedModel })
            if (!newConv) return
            conversationId = newConv.id
        }

        // Save user message to Supabase
        await addMessage(conversationId, {
            role: 'user',
            content: input,
        })

        // Send message via ai-sdk/react v3 sendMessage API and clear input
        const text = input
        setInput('')
        // AI SDK v3: sendMessage uses UIMessage shape — text goes in parts[], not content
        sendMessage({ role: 'user', parts: [{ type: 'text', text }] })
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
                    <form onSubmit={handleChatSubmit} className="mt-4 flex gap-2">
                        <Input
                            placeholder="Type your message... (Try: 'Help me draft an email' or 'Summarize my contacts')"
                            value={input}
                            onChange={handleInputChange}
                            disabled={isLoading}
                            className="flex-1 border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                        />
                        <Button
                            type="submit"
                            className="bg-[#3D4A67] hover:bg-[#2D3A57] text-white"
                            disabled={isLoading || !input.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
