import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, Sparkles, Loader2, Paperclip, FileText, File, XCircle } from 'lucide-react';
import { sendChatMessage, type ChatMessageRequest, type ChatAttachment } from '../services/aiService';
import type { PDBMetadata } from '../types';
import { useTranslation } from '../lib/i18n';

interface AttachmentFile {
    id: string;
    name: string;
    mimeType: string;
    data?: string;
    textContent?: string;
    previewUrl?: string;
    kind: 'image' | 'pdf' | 'text' | 'unsupported';
}

interface AIChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    pdbId?: string | null;
    pdbMetadata?: PDBMetadata | null;
}

export const AIChatSidebar: React.FC<AIChatSidebarProps> = ({ isOpen, onClose, pdbId, pdbMetadata }) => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState<ChatMessageRequest[]>([
        { role: 'assistant', content: "Hello! I'm Quercus AI. Ask me anything about the loaded structure, your saved library, or upload images, PDFs, and data files for analysis." }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }, [inputValue]);

    const readFile = useCallback((file: File): Promise<AttachmentFile> => {
        return new Promise((resolve) => {
            const id = Math.random().toString(36).slice(2);
            const { type: mimeType, name } = file;

            if (mimeType.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target?.result as string;
                    resolve({ id, name, mimeType, data: dataUrl.split(',')[1], previewUrl: dataUrl, kind: 'image' });
                };
                reader.readAsDataURL(file);
            } else if (mimeType === 'application/pdf') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const dataUrl = e.target?.result as string;
                    resolve({ id, name, mimeType, data: dataUrl.split(',')[1], kind: 'pdf' });
                };
                reader.readAsDataURL(file);
            } else if (
                mimeType === 'text/csv' ||
                mimeType === 'text/tab-separated-values' ||
                mimeType === 'text/plain' ||
                name.endsWith('.csv') ||
                name.endsWith('.tsv')
            ) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const raw = e.target?.result as string;
                    const truncated = raw.length > 8000 ? raw.slice(0, 8000) + '\n…(truncated)' : raw;
                    resolve({ id, name, mimeType: 'text/plain', textContent: truncated, kind: 'text' });
                };
                reader.readAsText(file);
            } else {
                resolve({ id, name, mimeType, kind: 'unsupported' });
            }
        });
    }, []);

    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const arr = Array.from(files).slice(0, 5);
        const processed = await Promise.all(arr.map(readFile));
        setAttachments(prev => [...prev, ...processed].slice(0, 5));
    }, [readFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleSend = async () => {
        if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

        const userText = inputValue.trim() || 'Please analyze these attachments.';
        const userMsg: ChatMessageRequest = { role: 'user', content: userText };

        // Display label includes attachment names
        const attachmentLabels = attachments.map(a => `📎 ${a.name}`).join('  ');
        const displayContent = attachmentLabels ? `${userText}\n${attachmentLabels}` : userText;

        setMessages(prev => [...prev, { role: 'user', content: displayContent }, { role: 'assistant', content: '' }]);
        setInputValue('');
        const currentAttachments = [...attachments];
        setAttachments([]);
        setIsLoading(true);

        try {
            let viewerContext: string | undefined;
            if (pdbId || pdbMetadata) {
                const parts = ['The user currently has a 3D structure loaded in the viewer:'];
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

            const apiAttachments: ChatAttachment[] = currentAttachments
                .filter(a => a.kind !== 'unsupported')
                .map(a => ({
                    name: a.name,
                    mimeType: a.mimeType,
                    data: a.data,
                    textContent: a.textContent,
                    attachmentType: a.kind as 'image' | 'pdf' | 'text',
                }));

            const conversationHistory = messages.slice(1);
            const stream = await sendChatMessage(
                userMsg.content,
                [...conversationHistory, userMsg],
                5,
                viewerContext,
                apiAttachments.length > 0 ? apiAttachments : undefined
            );

            const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
            let assistantMessage = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                for (const line of value.split('\n').filter(l => l.trim())) {
                    let parsed: any;
                    try { parsed = JSON.parse(line); } catch { continue; }
                    if (parsed.error) throw new Error(parsed.error);
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
            console.error('Chat Error:', error);
            setMessages(prev => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: 'assistant', content: `Error: ${error.message}` };
                return copy;
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Mobile backdrop */}
            <div
                className="fixed inset-0 z-[99] bg-black/50 md:hidden"
                onClick={onClose}
            />

            <div
                className={[
                    // Mobile: bottom sheet
                    'fixed bottom-0 left-0 right-0 z-[100] flex flex-col',
                    'h-[82vh] rounded-t-2xl',
                    // Desktop: right sidebar
                    'md:absolute md:right-0 md:top-0 md:bottom-0 md:left-auto md:h-auto md:w-96 md:rounded-none',
                    'bg-neutral-950 border-t border-neutral-800 md:border-t-0 md:border-l',
                ].join(' ')}
                style={{ animation: 'slideInUp 0.25s ease-out' }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
            <style>{`
                @keyframes slideInUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes bounce-dot { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-4px); } }
                @media (min-width: 768px) {
                    .ai-sidebar-anim { animation-name: slideInRight !important; }
                }
            `}</style>

            {/* Mobile drag handle */}
            <div className="flex justify-center pt-2.5 pb-1 md:hidden shrink-0">
                <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>

            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-10 border-2 border-dashed border-indigo-500 bg-indigo-500/10 flex items-center justify-center pointer-events-none rounded-t-2xl md:rounded-none">
                    <p className="text-indigo-300 text-sm font-medium">{t.aiDropFiles as string}</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-sm font-semibold text-white">Quercus AI</span>
                    {(pdbId || pdbMetadata?.title) && (
                        <span className="text-[10px] text-neutral-500 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full truncate max-w-[110px]">
                            {pdbMetadata?.title || pdbId?.toUpperCase()}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-white shrink-0 ml-2"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scroll-smooth">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        {msg.role === 'assistant' && (
                            <div className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center mt-0.5">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[84%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                : 'bg-neutral-800 text-neutral-100 rounded-tl-sm'
                        }`}>
                            {msg.content
                                ? msg.content
                                : (msg.role === 'assistant' && isLoading)
                                    ? (
                                        <span className="flex gap-1 items-center py-0.5">
                                            {[0, 150, 300].map(delay => (
                                                <span
                                                    key={delay}
                                                    className="w-1.5 h-1.5 rounded-full bg-neutral-400"
                                                    style={{ animation: `bounce-dot 1s ease-in-out ${delay}ms infinite` }}
                                                />
                                            ))}
                                        </span>
                                    )
                                    : null
                            }
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Attachment chips */}
            {attachments.length > 0 && (
                <div className="px-3 py-2 border-t border-neutral-800 flex flex-wrap gap-2 shrink-0">
                    {attachments.map(att => (
                        <div
                            key={att.id}
                            className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 max-w-[160px]"
                        >
                            {att.kind === 'image' && att.previewUrl
                                ? <img src={att.previewUrl} className="w-4 h-4 rounded object-cover shrink-0" />
                                : att.kind === 'pdf'
                                    ? <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                    : <File className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            }
                            <span className="text-xs text-neutral-300 truncate">{att.name}</span>
                            <button
                                onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                                className="ml-auto text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
                            >
                                <XCircle className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-neutral-800 shrink-0">
                <div className="flex items-end gap-2 bg-neutral-900 border border-neutral-700 focus-within:border-indigo-500 rounded-xl px-3 py-2 transition-colors duration-150">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        title={t.aiAttachFile as string}
                        className="text-neutral-500 hover:text-indigo-400 transition-colors shrink-0 pb-0.5"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t.aiAskPlaceholder as string}
                        disabled={isLoading}
                        className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 resize-none focus:outline-none leading-5 py-0.5"
                    />
                    <button
                        onClick={handleSend}
                        disabled={(!inputValue.trim() && attachments.length === 0) || isLoading}
                        className="shrink-0 p-1.5 rounded-lg transition-all disabled:text-neutral-700 disabled:cursor-not-allowed text-indigo-400 hover:text-white hover:bg-indigo-600 active:scale-95"
                    >
                        {isLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Send className="w-4 h-4" />
                        }
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.csv,.tsv,.txt"
                    onChange={e => e.target.files && handleFiles(e.target.files)}
                />
                <p className="text-center text-[10px] text-neutral-700 mt-1.5">
                    Shift+Enter for new line · AI can make mistakes
                </p>
            </div>
        </div>
        </>
    );
};
