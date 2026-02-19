// Chat types for MenteIQ

export interface Message {
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createdAt: Date
}

export interface Conversation {
    id: string
    title: string
    messages: Message[]
    model: string
    createdAt: Date
    updatedAt: Date
}

export interface CreateConversationInput {
    title?: string
    model?: string
}

export const AVAILABLE_MODELS = [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable OpenAI model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'Previous generation flagship' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Best for complex tasks' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'Anthropic', description: 'Fast and efficient' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most intelligent Claude model' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', provider: 'Google', description: 'Fast multimodal model' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Advanced reasoning' },
] as const
