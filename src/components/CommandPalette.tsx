
import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

export interface CommandAction {
    id: string;
    label: string;
    icon?: React.ElementType;
    shortcut?: string;
    perform: () => void;
    category?: string;
}

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    actions: CommandAction[];
    isLightMode: boolean;
}

export function CommandPalette({ isOpen, onClose, actions, isLightMode }: CommandPaletteProps) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Filter actions
    const filteredActions = actions.filter(action =>
        action.label.toLowerCase().includes(query.toLowerCase()) ||
        (action.category && action.category.toLowerCase().includes(query.toLowerCase()))
    );

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredActions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredActions[selectedIndex]) {
                    filteredActions[selectedIndex].perform();
                    onClose();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredActions, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (listRef.current) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white/80' : 'bg-black/80';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-neutral-200' : 'border-white/10';
    const selectedBg = isLightMode ? 'bg-neutral-100' : 'bg-white/10';
    const subTextColor = isLightMode ? 'text-neutral-500' : 'text-zinc-400';

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border ${bgColor} ${borderColor} backdrop-blur-xl transition-all animate-in fade-in zoom-in-95 duration-200`}>

                {/* Search Bar */}
                <div className={`flex items-center px-4 py-3 border-b ${borderColor}`}>
                    <Search className={`w-5 h-5 ${subTextColor} mr-3`} />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelectedIndex(0);
                        }}
                        placeholder={t.commandSearch as string}
                        className={`flex-1 bg-transparent border-none outline-none text-lg ${textColor} placeholder-opacity-50 placeholder-current`}
                    />
                    <div className="flex items-center gap-2">
                        <kbd className={`hidden sm:inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-50 ${isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-white/10 border-white/10'}`}>
                            <span className="text-xs">ESC</span>
                        </kbd>
                    </div>
                </div>

                {/* Results List */}
                <div
                    ref={listRef}
                    className="max-h-[60vh] overflow-y-auto py-2 scrollbar-hide"
                >
                    {filteredActions.length === 0 ? (
                        <div className={`px-4 py-8 text-center text-sm ${subTextColor}`}>
                            {t.noResults as string}
                        </div>
                    ) : (
                        <div className="px-2 space-y-0.5">
                            {filteredActions.map((action, index) => {
                                const isSelected = index === selectedIndex;
                                const ActionIcon = action.icon || Command;

                                return (
                                    <button
                                        key={action.id}
                                        onClick={() => {
                                            action.perform();
                                            onClose();
                                        }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? selectedBg : 'bg-transparent'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md ${isSelected ? (isLightMode ? 'bg-white shadow-sm' : 'bg-white/20') : 'bg-transparent text-opacity-50'}`}>
                                                <ActionIcon className={`w-4 h-4 ${textColor}`} />
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium ${textColor}`}>
                                                    {action.label}
                                                </div>
                                                {action.category && (
                                                    <div className={`text-[10px] uppercase tracking-wider font-bold ${subTextColor}`}>
                                                        {action.category}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {action.shortcut && (
                                            <div className="flex bg-transparent">
                                                <span className={`text-xs ${subTextColor}`}>{action.shortcut}</span>
                                            </div>
                                        )}

                                        {isSelected && !action.shortcut && (
                                            <ArrowRight className={`w-4 h-4 ${subTextColor}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-4 py-2 border-t ${borderColor} flex justify-between items-center bg-opacity-50 ${isLightMode ? 'bg-neutral-50' : 'bg-black/20'}`}>
                    <div className={`text-[10px] ${subTextColor}`}>
                        {t.cmdNavHint as string}
                    </div>
                    <div className={`text-[10px] ${subTextColor}`}>
                        Protein Viewer Pro
                    </div>
                </div>
            </div>
        </div>
    );
}
