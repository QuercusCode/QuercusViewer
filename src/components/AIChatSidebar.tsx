import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { sendChatMessage, type ChatMessageRequest } from '../services/aiService';
import type { PDBMetadata } from '../types';

interface AIChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    pdbId?: string | null;
    pdbMetadata?: PDBMetadata | null;
}

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ isOpen, onClose, pdbId, pdbMetadata }) => {
    const [messages, setMessages] = useState<ChatMessageRequest[]>([
        { role: 'assistant', content: "Hello! I am Quercus AI. I can search through your molecular structures and answer questions about biology and chemistry. How can I help you today?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg: ChatMessageRequest = { role: 'user', content: inputValue.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        // Placeholder for assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        try {
            // Build context about the currently loaded structure
            let viewerContext: string | undefined;
            if (pdbId || pdbMetadata) {
                const parts: string[] = ['The user currently has a 3D structure loaded in the viewer:'];
                if (pdbId) parts.push(`PDB/ID: ${pdbId.toUpperCase()}`);
                if (pdbMetadata?.title) parts.push(`Name: ${pdbMetadata.title}`);
                if (pdbMetadata?.organism) parts.push(`Organism: ${pdbMetadata.organism}`);
                if (pdbMetadata?.method) parts.push(`Method: ${pdbMetadata.method}`);
                if (pdbMetadata?.resolution) parts.push(`Resolution: ${pdbMetadata.resolution}`);
                if (pdbMetadata?.depositionDate) parts.push(`Deposited: ${pdbMetadata.depositionDate}`);
                if (pdbMetadata?.formula) parts.push(`Formula: ${pdbMetadata.formula}`);
                if (pdbMetadata?.molecularWeight) parts.push(`Molecular Weight: ${pdbMetadata.molecularWeight}`);
                viewerContext = parts.join('\n');
            }

            // Exclude the UI-only greeting (index 0) — Anthropic requires messages to start with 'user' role
            const conversationHistory = messages.slice(1);
            const stream = await sendChatMessage(userMsg.content, [...conversationHistory, userMsg], 5, viewerContext);
            
            const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
            
            let assistantMessage = '';
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                // value might contain multiple JSON lines
                const lines = value.split('\n').filter(line => line.trim() !== '');
                for (const line of lines) {
                    let parsed: any;
                    try {
                        parsed = JSON.parse(line);
                    } catch {
                        console.error("Could not parse stream chunk", line);
                        continue;
                    }
                    if (parsed.error) {
                        throw new Error(parsed.error);
                    }
                    if (parsed.text) {
                        assistantMessage += parsed.text;
                        setMessages(prev => {
                            const copy = [...prev];
                            copy[copy.length - 1] = { role: 'assistant', content: assistantMessage };
                            return copy;
                        });
                    }
                }
            }
        } catch (error: any) {
            console.error("Chat Error:", error);
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: `Sorry, I encountered an error: ${error.message}` };
                return copy;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
             handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="absolute right-0 top-0 bottom-0 w-80 md:w-96 bg-white/10 dark:bg-black/40 backdrop-blur-3xl border-l border-white/20 shadow-2xl flex flex-col z-[100] transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 text-primary-500 font-semibold text-lg">
                    <Sparkles className="w-5 h-5" />
                    Quercus AI
                </div>
                <button 
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        className={`flex gap-3 \${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center \${msg.role === 'user' ? 'bg-primary-600' : 'bg-secondary-600'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                        </div>
                        <div className={`flex flex-col max-w-[80%] \${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2 rounded-2xl \${msg.role === 'user' ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-white/10 dark:bg-white/5 border border-white/10 text-gray-800 dark:text-gray-100 rounded-tl-sm'}`}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content || (msg.role === 'assistant' && isLoading ? 'Thinking...' : '')}</p>
                            </div>
                        </div>
                    </div>
                ))}
                
                {isLoading && messages[messages.length - 1].role === 'user' && (
                    <div className="flex gap-3">
                         <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary-600">
                             <Bot className="w-4 h-4 text-white" />
                         </div>
                         <div className="flex px-4 py-3 bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm text-gray-400 items-center justify-center w-16">
                            <Loader2 className="w-4 h-4 animate-spin" />
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-white/5 shrink-0">
                <div className="relative flex items-center group">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about your structures..."
                        className="w-full bg-white/10 hover:bg-white/15 focus:bg-white/20 border border-white/20 rounded-full px-5 py-3 pr-12 text-sm text-gray-800 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                        className={`absolute right-2 p-2 rounded-full transition-all \${!inputValue.trim() || isLoading ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-white bg-primary-600 hover:bg-primary-500 hover:scale-105 active:scale-95 shadow-md'}`}
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <div className="text-center mt-2 text-xs text-gray-500">
                    AI can make mistakes. Consider verifying its answers.
                </div>
            </div>
        </div>
    );
};
