import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, StickyNote, Trash2, Check } from 'lucide-react';

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
            setTimeout(() => textareaRef.current?.focus(), 120);
        }
    }, [isOpen]);

    const save = useCallback((value: string) => {
        localStorage.setItem(STORAGE_KEY, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
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
            className="absolute left-0 top-0 bottom-0 w-72 bg-neutral-950 border-r border-neutral-800/60 flex flex-col z-[100]"
            style={{ animation: 'slideInLeft 0.18s ease-out' }}
        >
            <style>{`
                @keyframes slideInLeft {
                    from { transform: translateX(-12px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/60 shrink-0">
                <div className="flex items-center gap-2">
                    <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-semibold text-neutral-200 tracking-wide">Notes</span>
                </div>
                <div className="flex items-center gap-1">
                    {saved && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500 animate-in fade-in duration-200">
                            <Check className="w-3 h-3" />
                            Saved
                        </span>
                    )}
                    {notes.trim() && !saved && (
                        <button
                            onClick={handleClear}
                            title="Clear notes"
                            className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-neutral-800 text-neutral-600 hover:text-neutral-300 transition-colors ml-1"
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
                className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-700 resize-none focus:outline-none px-4 py-3 leading-relaxed font-mono"
                spellCheck
            />

            {/* Footer */}
            <div className="px-4 py-2 border-t border-neutral-800/60 shrink-0">
                <p className="text-[10px] text-neutral-700">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'} · auto-saved locally
                </p>
            </div>
        </div>
    );
}
