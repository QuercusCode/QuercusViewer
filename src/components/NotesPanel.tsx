import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Trash2, Check } from 'lucide-react';

const STORAGE_KEY = 'quercus_viewer_notes';

interface NotesPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NotesPanel({ isOpen, onClose }: NotesPanelProps) {
    const [notes, setNotes] = useState('');
    const [saved, setSaved] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) setNotes(stored);
    }, []);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const save = useCallback((value: string) => {
        localStorage.setItem(STORAGE_KEY, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 1400);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setNotes(value);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => save(value), 600);
    };

    const handleClear = () => {
        if (!notes.trim()) return;
        setNotes('');
        localStorage.removeItem(STORAGE_KEY);
        textareaRef.current?.focus();
    };

    const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

    if (!isOpen) return null;

    return (
        <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 w-80 z-[200] flex flex-col"
            style={{
                animation: 'notesPopIn 0.15s ease-out',
                filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))',
            }}
        >
            <style>{`
                @keyframes notesPopIn {
                    from { transform: translateX(-50%) translateY(8px); opacity: 0; }
                    to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
                }
            `}</style>

            <div className="rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950/95 backdrop-blur-xl flex flex-col" style={{ height: '340px' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/60 shrink-0">
                    <span className="text-[11px] font-semibold text-neutral-400 tracking-widest uppercase">Notes</span>
                    <div className="flex items-center gap-1.5">
                        {saved && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                                <Check className="w-3 h-3" />
                                Saved
                            </span>
                        )}
                        {notes.trim() && !saved && (
                            <button
                                onClick={handleClear}
                                title="Clear"
                                className="p-1 rounded-lg text-neutral-700 hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 rounded-lg text-neutral-700 hover:text-neutral-300 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={handleChange}
                    placeholder="Start typing…"
                    className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-700 resize-none focus:outline-none px-4 py-3 leading-relaxed"
                    spellCheck
                />

                {/* Footer */}
                <div className="px-4 py-2 border-t border-neutral-800/40 shrink-0">
                    <p className="text-[10px] text-neutral-700">
                        {wordCount} {wordCount === 1 ? 'word' : 'words'} · saved locally
                    </p>
                </div>
            </div>
        </div>
    );
}
