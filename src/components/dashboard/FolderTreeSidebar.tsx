import { useState, useRef, useEffect } from 'react';
import { Database, Folder, Plus, Pencil, Trash2, Check, X, Loader2, ChevronRight, ChevronDown, Clock, Pin } from 'lucide-react';
import { createCollection, renameCollection, deleteCollection, type Collection, type Structure } from '../../lib/structuresService';
import { DOT } from './CollectionsSidebar'; // reuse colors

interface Props {
    userId: string;
    collections: Collection[];
    activeCollection: string | null;
    counts: Record<string, number>;
    uncategorizedCount: number;
    onSelect: (id: string | null) => void;
    onCreated: (c: Collection) => void;
    onRenamed: (id: string, name: string) => void;
    onDeleted: (id: string) => void;
    onDropStructure?: (structureId: string, folderId: string) => void;
    recentStructures?: Structure[];
    pinnedCollectionIds?: string[];
    onOpenStructure?: (s: Structure) => void;
    onTogglePin?: (id: string) => void;
}

export function FolderTreeSidebar({
    userId, collections, activeCollection, counts, uncategorizedCount,
    onSelect, onCreated, onRenamed, onDeleted, onDropStructure,
    recentStructures, pinnedCollectionIds, onOpenStructure
}: Props) {
    // Tree state
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Creation state
    const [creatingInId, setCreatingInId] = useState<string | 'root' | null>(null);
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('blue');
    const [saving, setSaving] = useState(false);

    // Rename state
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Drag-and-drop state
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    useEffect(() => { if (creatingInId || renamingId) inputRef.current?.focus(); }, [creatingInId, renamingId]);

    // Build the tree hierarchy
    const foldersByParent = new Map<string | null, Collection[]>();
    foldersByParent.set(null, []);

    collections.forEach(c => {
        const parent = c.parent_id || null;
        if (!foldersByParent.has(parent)) foldersByParent.set(parent, []);
        foldersByParent.get(parent)!.push(c);
    });

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedIds(next);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSaving(true);
        try {
            const parentId = creatingInId === 'root' ? null : creatingInId;
            const c = await createCollection(userId, newName.trim(), newColor, parentId);
            onCreated(c);
            setCreatingInId(null);
            setNewName('');
            setNewColor('blue');
            if (parentId) {
                const expl = new Set(expandedIds);
                expl.add(parentId);
                setExpandedIds(expl);
            }
        } catch { /* ignore */ } finally { setSaving(false); }
    };

    const handleRename = async (id: string) => {
        if (!renameDraft.trim()) { setRenamingId(null); return; }
        try { await renameCollection(id, renameDraft.trim()); onRenamed(id, renameDraft.trim()); }
        catch { /* ignore */ } finally { setRenamingId(null); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this folder? Nested items will become uncategorized.')) return;
        try { await deleteCollection(id); onDeleted(id); if (activeCollection === id) onSelect(null); }
        catch { /* ignore */ }
    };

    const renderTree = (parentId: string | null, depth: number) => {
        const children = foldersByParent.get(parentId) || [];
        if (children.length === 0 && depth > 0) return null;

        return children.map(c => {
            const hasChildren = (foldersByParent.get(c.id) || []).length > 0;
            const isExpanded = expandedIds.has(c.id);
            const isActive = activeCollection === c.id;

            return (
                <div key={c.id}>
                    <div className="group relative">
                        {renamingId === c.id ? (
                            <div className="flex items-center gap-1 px-2 my-0.5" style={{ marginLeft: depth * 12 }}>
                                <input ref={inputRef} value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRename(c.id); if (e.key === 'Escape') setRenamingId(null); }}
                                    className="flex-1 bg-neutral-800 border border-blue-500/50 rounded px-2 py-0.5 text-xs text-white outline-none" />
                                <button onClick={() => handleRename(c.id)} className="text-emerald-400 p-0.5"><Check className="w-3 h-3" /></button>
                                <button onClick={() => setRenamingId(null)} className="text-neutral-500 p-0.5"><X className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <button onClick={() => onSelect(c.id)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverId(c.id); }}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverId(null);
                                    if (onDropStructure) {
                                        const structureId = e.dataTransfer.getData('text/plain');
                                        if (structureId) onDropStructure(structureId, c.id);
                                    }
                                }}
                                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm transition-all text-left relative focus:outline-none
                                    ${dragOverId === c.id ? 'bg-blue-500/20 text-white ring-1 ring-blue-500 border border-blue-500/50' :
                                        isActive ? 'bg-neutral-800 text-white border border-transparent' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200 border border-transparent'}`}
                                style={{ paddingLeft: `${depth * 12 + 8}px` }}
                            >
                                {/* Expaner Icon */}
                                <div onClick={(e) => hasChildren ? toggleExpand(c.id, e) : undefined}
                                    className={`w-4 h-4 flex items-center justify-center shrink-0 ${hasChildren ? 'hover:bg-neutral-700 rounded-sm cursor-pointer' : 'opacity-0'}`}>
                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </div>

                                <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[c.color] ?? 'bg-neutral-400'}`} />
                                <span className="truncate flex-1 text-[13px]">{c.name}</span>
                                <span className="text-[10px] text-neutral-500 bg-neutral-900 px-1.5 rounded">{counts[c.id] ?? 0}</span>

                                <span className="hidden group-hover:flex items-center gap-0.5 absolute right-2 bg-neutral-800 pl-1">
                                    <button onClick={e => { e.stopPropagation(); setCreatingInId(c.id); }} className="p-0.5 text-neutral-500 hover:text-blue-400"><Plus className="w-3 h-3" /></button>
                                    <button onClick={e => { e.stopPropagation(); setRenamingId(c.id); setRenameDraft(c.name); }} className="p-0.5 text-neutral-500 hover:text-white"><Pencil className="w-3 h-3" /></button>
                                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id); }} className="p-0.5 text-neutral-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Render children if expanded */}
                    {isExpanded && renderTree(c.id, depth + 1)}

                    {/* Render new folder inline creator */}
                    {creatingInId === c.id && isExpanded && (
                        <div className="pl-6 pr-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
                            {renderCreatorBox()}
                        </div>
                    )}
                </div>
            );
        });
    };

    const renderCreatorBox = () => (
        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-2.5 space-y-2 relative shadow-xl z-10 w-full mt-1 overflow-hidden pointer-events-auto">
            <input ref={inputRef} value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreatingInId(null); }}
                placeholder="Folder name…"
                className="w-full bg-neutral-900 text-xs text-white placeholder-neutral-500 px-2.5 py-1.5 rounded border border-neutral-800 focus:border-blue-500/50 outline-none" />

            <div className="flex flex-wrap gap-1">
                {['blue', 'violet', 'emerald', 'orange', 'pink', 'amber', 'cyan', 'rose'].map(col => (
                    <button key={col} onClick={() => setNewColor(col)}
                        className={`w-3.5 h-3.5 rounded-full ${DOT[col]} transition-all ${newColor === col ? 'ring-2 ring-white/40 scale-125' : ''}`} />
                ))}
            </div>

            <div className="flex gap-1 pt-1">
                <button onClick={handleCreate} disabled={saving || !newName.trim()}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded text-xs">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Add
                </button>
                <button onClick={() => { setCreatingInId(null); setNewName(''); }} className="px-2 text-neutral-500 hover:text-white bg-neutral-800/50 rounded hover:bg-neutral-800">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="w-64 shrink-0 flex flex-col h-full bg-neutral-950/30 border-r border-neutral-800/50">
            <div className="p-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Projects</p>
                <button onClick={() => setCreatingInId('root')} className="p-1 text-neutral-500 hover:text-white rounded-md hover:bg-neutral-800 transition-colors">
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">

                {/* Pinned / Quick Access */}
                {((recentStructures && recentStructures.length > 0) || (pinnedCollectionIds && pinnedCollectionIds.length > 0)) && (
                    <div className="mb-4">
                        <p className="px-2 mb-1.5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-2">Quick Access</p>
                        {pinnedCollectionIds?.map(id => {
                            const c = collections.find(col => col.id === id);
                            if (!c) return null;
                            return (
                                <button key={`pin-${id}`} onClick={() => onSelect(c.id)}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all focus:outline-none mb-0.5
                                        ${activeCollection === c.id ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'}`}>
                                    <Pin className="w-3.5 h-3.5 shrink-0 text-blue-400/70 rotate-45" />
                                    <span className="truncate flex-1 text-left text-[13px]">{c.name}</span>
                                </button>
                            );
                        })}
                        {recentStructures?.map(s => (
                            <button key={`recent-${s.id}`} onClick={() => onOpenStructure?.(s)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200 transition-all focus:outline-none mb-0.5">
                                <Clock className="w-3.5 h-3.5 shrink-0 opacity-60" />
                                <span className="truncate flex-1 text-left text-[13px]">{s.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* All structures */}
                <button onClick={() => onSelect(null)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all focus:outline-none mb-2
                        ${activeCollection === null ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'}`}>
                    <Database className="w-4 h-4 shrink-0" />
                    <span className="truncate flex-1 text-left text-[13px]">Library Overview</span>
                    <span className="text-[10px] text-neutral-500 bg-neutral-900 px-1.5 rounded">{counts['__all__'] ?? 0}</span>
                </button>

                {/* Tree Root */}
                {renderTree(null, 0)}

                {/* Root Creator */}
                {creatingInId === 'root' && (
                    <div className="px-1 mt-2">
                        {renderCreatorBox()}
                    </div>
                )}

                {/* Uncategorized (bottom) */}
                {uncategorizedCount > 0 && (
                    <div className="pt-4 mt-4 border-t border-neutral-800/50">
                        <button onClick={() => onSelect('__none__')}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all focus:outline-none
                                ${activeCollection === '__none__' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-300'}`}>
                            <Folder className="w-4 h-4 shrink-0" />
                            <span className="truncate flex-1 text-left text-[13px]">Uncategorized</span>
                            <span className="text-[10px] text-neutral-600 bg-neutral-900 px-1.5 rounded">{uncategorizedCount}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
