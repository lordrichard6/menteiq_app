'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Sparkles } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export function Omnibox() {
    // AI SDK v3: manage input locally, use sendMessage()
    const [input, setInput] = React.useState('');
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({ api: '/api/chat' }),
    });

    const isLoading = status === 'streaming' || status === 'submitted';
    const scrollRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || isLoading) return;
        setInput('');
        sendMessage({ text });
    };

    return (
        <Card className="fixed bottom-4 right-4 w-[400px] h-[500px] shadow-2xl flex flex-col z-50 border-slate-200 dark:border-slate-800">
            <div className="p-3 border-b flex items-center bg-slate-50 dark:bg-slate-900 rounded-t-lg">
                <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                <span className="font-semibold text-sm">Mente AI</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-slate-400 text-sm mt-20">
                        <p>How can I help you today?</p>
                        <p className="text-xs mt-2">Example: &quot;Find documents about Taxes&quot;</p>
                    </div>
                )}
                <div className="space-y-4">
                    {messages.map((m) => {
                        const text = m.parts
                            .filter((p) => p.type === 'text')
                            .map((p) => (p as { type: 'text'; text: string }).text)
                            .join('');
                        return (
                            <div
                                key={m.id}
                                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg p-3 text-sm ${m.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                        }`}
                                >
                                    {text}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 text-sm text-slate-500 animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t flex gap-2">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Mente AI..."
                    className="flex-1"
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                    <Send className="w-4 h-4" />
                </Button>
            </form>
        </Card>
    );
}
