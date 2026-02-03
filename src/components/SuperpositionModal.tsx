import React, { useState } from 'react';
import { X, Plus, Eye, EyeOff, Trash2, Upload } from 'lucide-react';
import type { SuperposedStructure } from '../types';

interface SuperpositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    overlays: SuperposedStructure[];
    onAddOverlay: (structure: SuperposedStructure) => void;
    onRemoveOverlay: (id: string) => void;
    onToggleOverlay: (id: string) => void;
    onOpenAlignment: () => void; // New Prop
}

export const SuperpositionModal: React.FC<SuperpositionModalProps> = ({
    isOpen,
    onClose,
    overlays,
    onAddOverlay,
    onRemoveOverlay,
    onToggleOverlay,
    onOpenAlignment
}) => {
    const [pdbInput, setPdbInput] = useState('');
    const [colorInput, setColorInput] = useState('#FFA500'); // Default Orange

    if (!isOpen) return null;

    const handleAddPdb = () => {
        if (!pdbInput || pdbInput.length < 3) return;

        onAddOverlay({
            id: `pdb-${pdbInput}-${Date.now()}`,
            pdbId: pdbInput,
            color: colorInput,
            isVisible: true,
            description: `PDB: ${pdbInput.toUpperCase()}`
        });
        setPdbInput('');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            onAddOverlay({
                id: `file-${file.name}-${Date.now()}`,
                file: file,
                color: colorInput,
                isVisible: true,
                description: file.name
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
                    <h2 className="text-lg font-semibold text-white">Structure Superposition</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={onOpenAlignment}
                            title="View Sequence Alignment"
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-colors"
                        >
                            Align Sequences
                        </button>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* Add New Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Add Overlay</h3>

                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">PDB</span>
                                <input
                                    type="text"
                                    value={pdbInput}
                                    onChange={(e) => setPdbInput(e.target.value)}
                                    placeholder="e.g. 1u19"
                                    className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddPdb()}
                                />
                            </div>
                            <input
                                type="color"
                                value={colorInput}
                                onChange={(e) => setColorInput(e.target.value)}
                                className="w-10 h-10 rounded shadow-sm cursor-pointer bg-transparent border-0"
                            />
                            <button
                                onClick={handleAddPdb}
                                disabled={!pdbInput}
                                className="bg-cyan-500/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg px-3 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdb,.cif,.ent"
                            />
                            <div className="flex items-center justify-center gap-2 w-full bg-neutral-800/30 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-lg py-3 transition-colors">
                                <Upload size={16} className="text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                                <span className="text-sm text-neutral-400 group-hover:text-neutral-200">Upload File</span>
                            </div>
                        </div>
                    </div>

                    {/* List Section */}
                    {overlays.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Active Overlays</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {overlays.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-neutral-800/40 border border-neutral-700/50 rounded-lg p-3">
                                        <div className="flex items-center gap-3 min-w-0 overflow-hidden flex-1 mr-2">
                                            <div
                                                className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <div className="flex flex-col min-w-0 overflow-hidden">
                                                <span className="text-sm font-medium text-neutral-200 truncate" title={item.description}>{item.description || 'Unknown Structure'}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-neutral-500 font-mono truncate" title={item.id}>{item.id}</span>

                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => onToggleOverlay(item.id)}
                                                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                            >
                                                {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                            </button>
                                            <button
                                                onClick={() => onRemoveOverlay(item.id)}
                                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
