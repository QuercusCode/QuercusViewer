
import React, { useState } from 'react';
import { User, Check } from 'lucide-react';

interface IdentityModalProps {
    isOpen: boolean;
    onConfirm: (name: string) => void;
    currentName?: string;
    isLightMode: boolean;
}

export function IdentityModal({ isOpen, onConfirm, currentName, isLightMode }: IdentityModalProps) {
    const [name, setName] = useState(currentName || '');

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white' : 'bg-neutral-900';
    const textColor = isLightMode ? 'text-gray-900' : 'text-white';
    const borderColor = isLightMode ? 'border-gray-200' : 'border-neutral-800';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(name || 'Anonymous Peer');
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div role="dialog" aria-modal="true" className={`relative w-full max-w-sm ${bgColor} ${textColor} rounded-2xl shadow-2xl border ${borderColor} p-6 animate-in zoom-in-95 duration-200`}>

                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <User className="text-indigo-500" />
                    Who are you?
                </h2>

                <p className="text-sm opacity-70 mb-6">
                    Enter your name so your peers know who is guiding the session.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Dr. Smith, Alice..."
                        autoFocus
                        className={`w-full px-4 py-3 rounded-xl border ${borderColor} bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all`}
                    />

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="w-5 h-5" />
                        Join Session
                    </button>
                </form>
            </div>
        </div>
    );
}
