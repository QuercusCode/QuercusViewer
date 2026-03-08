import { useState, useRef, useEffect } from 'react';
import { FolderOpen, Folder, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { createCollection, renameCollection, deleteCollection, type Collection } from '../../lib/structuresService';

const COLORS = ['blue', 'violet', 'emerald', 'orange', 'pink', 'amber', 'cyan', 'rose'];

const COLOR_CLASSES: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
    violet: 'text-violet-400 bg-violet-500/15 border-violet-500/30',
    emerald: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    orange: 'text-orange-400 bg-orange-500/15 border-orange-500/30',
    pink: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
    amber: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    cyan: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    rose: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
};

const DOT: Record<string, string> = {
    blue: 'bg-blue-400',
    violet: 'bg-violet-400',
    emerald: 'bg-emerald-400',
    orange: 'bg-orange-400',
    pink: 'bg-pink-400',
    amber: 'bg-amber-400',
    cyan: 'bg-cyan-400',
    rose: 'bg-rose-400',
};

interface Props {
    userId: string;
    collections: Collection[];
    activeCollection: string | null;
    counts: Record<string, number>;  // collectionId → count
    uncategorizedCount: number;
    onSelect: (id: string | null) => void;
    onCreated: (c: Collection) => void;
    onRenamed: (id: string, name: string) => void;
    onDeleted: (id: string) => void;
}

export function CollectionsSidebar({
    userId, collections, activeCollection, counts, uncategorizedCount,
    onSelect, onCreated, onRenamed, onDeleted,
}: Props) {
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [saving, setSaving] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (creating || renamingId) inputRef.current?.focus(); }, [creating, renamingId]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const c = await createCollection(userId, newName.trim(), newColor);
            onCreated(c);
            setCreating(false);
            setNewName('');
            setNewColor('blue');
        } catch { /* ignore */ } finally { setSaving(false); }
    };

    const handleRename = async (id: string) => {
        if (!renameDraft.trim()) { setRenamingId(null); return; }
        try { await renameCollection(id, renameDraft.trim()); onRenamed(id, renameDraft.trim()); }
        catch { /* ignore */ } finally { setRenamingId(null); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this collection? Structures will become uncategorized.')) return;
        try { await deleteCollection(id); onDeleted(id); if (activeCollection === id) onSelect(null); }
        catch { /* ignore */ }
    };

    return (
        <div className="w-48 shrink-0 space-y-1">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider px-2 mb-2">Collections</p>

            {/* All structures */}
            <button onClick={() => onSelect(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all
                    ${activeCollection === null ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                <FolderOpen className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">All structures</span>
                <span className="text-[10px] text-neutral-500">{counts['__all__'] ?? 0}</span>
            </button>

            {/* Uncategorized */}
            {uncategorizedCount > 0 && (
                <button onClick={() => onSelect('__none__')}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all
                        ${activeCollection === '__none__' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                    <Folder className="w-4 h-4 shrink-0 text-neutral-500" />
                    <span className="truncate flex-1 text-left">Uncategorized</span>
                    <span className="text-[10px] text-neutral-500">{uncategorizedCount}</span>
                </button>
            )}

            {/* Named collections */}
            {collections.map(c => (
                <div key={c.id} className="group relative">
                    {renamingId === c.id ? (
                        <div className="flex items-center gap-1 px-2">
                            <input ref={inputRef} value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setRenamingId(null); }}
                                className="flex-1 bg-neutral-800 border border-blue-500/50 rounded px-2 py-0.5 text-xs text-white outline-none" />
                            <button onClick={() => handleRename(c.id)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                                <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setRenamingId(null)} className="text-neutral-500 hover:text-white p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => onSelect(c.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-all
                                ${activeCollection === c.id ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[c.color] ?? 'bg-neutral-400'}`} />
                            <span className="truncate flex-1 text-left">{c.name}</span>
                            <span className="text-[10px] text-neutral-500">{counts[c.id] ?? 0}</span>
                            <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                <button onClick={e => { e.stopPropagation(); setRenamingId(c.id); setRenameDraft(c.name); }}
                                    className="p-0.5 text-neutral-500 hover:text-white transition-colors">
                                    <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                                    className="p-0.5 text-neutral-500 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        </button>
                    )}
                </div>
            ))}

            {/* Create new */}
            {creating ? (
                <div className="bg-neutral-800 border border-neutral-700 rounded-xl p-3 space-y-2">
                    <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                        placeholder="Collection name…"
                        className="w-full bg-neutral-700 text-xs text-white placeholder-neutral-500 px-2.5 py-1.5 rounded-lg outline-none border border-transparent focus:border-blue-500/50" />
                    <div className="flex flex-wrap gap-1.5">
                        {COLORS.map(col => (
                            <button key={col} onClick={() => setNewColor(col)}
                                className={`w-5 h-5 rounded-full ${DOT[col]} transition-all ${newColor === col ? 'ring-2 ring-white/40 scale-110' : ''}`} />
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handleCreate} disabled={saving || !newName.trim()}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs transition-colors">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}Create
                        </button>
                        <button onClick={() => { setCreating(false); setNewName(''); }} className="px-2 text-neutral-500 hover:text-white transition-colors">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            ) : (
                <button onClick={() => setCreating(true)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-600 hover:text-neutral-400 hover:bg-neutral-800/50 border border-dashed border-neutral-800 hover:border-neutral-700 transition-all">
                    <Plus className="w-3 h-3" />New collection
                </button>
            )}
        </div>
    );
}

export { COLOR_CLASSES, DOT };
