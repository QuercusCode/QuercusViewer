import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Plus, Star, Clock, Search, Upload, Dna, Trash2, ExternalLink,
    Loader2, AlertCircle, Download, Check, Pencil, Share2,
    FileText, Filter, List, LayoutGrid, Database, NotebookPen,
    ChevronDown, ChevronUp, Import, Tag, Copy, X, CheckSquare,
    Layers, Beaker, Microscope, Globe, Eye, Folder, ChevronRight, FolderInput, Pin, PanelRight, Settings2, Menu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
    listStructures, uploadStructure, toggleStar, deleteStructure,
    renameStructure, updateNotes, updateTags, importFromRCSB,
    duplicateStructure, getDownloadUrl, exportAllAsZip,
    listCollections, incrementViewCount, logActivity, deleteCollection, toggleCollectionPublic,
    type Structure, type Collection,
} from '../../lib/structuresService';
// Re-using the constants since I deleted CollectionsSidebar
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

export type FilterRule = {
    id: string;
    field: 'size' | 'type' | 'name';
    operator: 'contains' | '>' | '<' | '==';
    value: string;
};

import { FolderTreeSidebar } from './FolderTreeSidebar';

const ACCEPTED_EXTS = '.pdb,.cif,.mmcif,.sdf,.mol';

function formatBytes(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function timeAgo(iso: string): string {
    const d = Date.now() - new Date(iso).getTime(), m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(h / 24);
    return dy < 7 ? `${dy}d ago` : new Date(iso).toLocaleDateString();
}

// ── Tag system ────────────────────────────────────────────────────

const PRESET_TAGS: { label: string; color: string }[] = [
    { label: 'Protein', color: 'bg-blue-500/15 border-blue-500/30 text-blue-400' },
    { label: 'Ligand', color: 'bg-violet-500/15 border-violet-500/30 text-violet-400' },
    { label: 'Drug target', color: 'bg-orange-500/15 border-orange-500/30 text-orange-400' },
    { label: 'Published', color: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
    { label: 'In progress', color: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' },
    { label: 'Mutant', color: 'bg-pink-500/15 border-pink-500/30 text-pink-400' },
    { label: 'Control', color: 'bg-neutral-500/15 border-neutral-500/30 text-neutral-400' },
    { label: 'Complex', color: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' },
];

function tagColor(label: string): string {
    return PRESET_TAGS.find(t => t.label.toLowerCase() === label.toLowerCase())?.color
        ?? 'bg-neutral-500/15 border-neutral-500/30 text-neutral-400';
}

interface TagEditorProps {
    tags: string[];
    onChange: (tags: string[]) => void;
}

function TagEditor({ tags, onChange }: TagEditorProps) {
    const [open, setOpen] = useState(false);
    const [custom, setCustom] = useState('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const addTag = (label: string) => {
        const t = label.trim();
        if (!t || tags.includes(t)) return;
        onChange([...tags, t]);
    };
    const removeTag = (label: string) => onChange(tags.filter(t => t !== label));

    return (
        <div className="mb-3" ref={ref}>
            <div className="flex flex-wrap gap-1.5 items-center">
                {tags.map(t => (
                    <span key={t} className={`inline - flex items - center gap - 1 text - [10px] font - medium px - 1.5 py - 0.5 rounded - md border ${tagColor(t)} `}>
                        {t}
                        <button onClick={() => removeTag(t)} className="opacity-60 hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
                    </span>
                ))}
                <button onClick={() => setOpen(p => !p)}
                    className="inline-flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-300 border border-dashed border-neutral-700 hover:border-neutral-500 rounded-md px-1.5 py-0.5 transition-all">
                    <Tag className="w-2.5 h-2.5" />Add tag
                </button>
            </div>

            {open && (
                <div className="mt-2 bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 shadow-xl">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {PRESET_TAGS.filter(p => !tags.includes(p.label)).map(p => (
                            <button key={p.label} onClick={() => { addTag(p.label); setOpen(false); }}
                                className={`text - [10px] font - medium px - 2 py - 1 rounded - md border transition - all hover: opacity - 90 ${p.color} `}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1">
                        <input value={custom} onChange={e => setCustom(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { addTag(custom); setCustom(''); setOpen(false); } }}
                            placeholder="Custom tag…"
                            className="flex-1 bg-neutral-700 rounded-lg text-xs text-white placeholder-neutral-500 px-2.5 py-1.5 outline-none border border-transparent focus:border-blue-500/50" />
                        <button onClick={() => { addTag(custom); setCustom(''); setOpen(false); }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors">+</button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Skeleton card (shimmer while loading) ─────────────────────────

function SkeletonCard() {
    return (
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col animate-pulse">
            <div className="h-1 w-full bg-neutral-800" />
            <div className="h-36 bg-neutral-800/60" />
            <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-neutral-800" />
                    <div className="h-5 w-12 rounded-md bg-neutral-800" />
                </div>
                <div className="h-4 w-3/4 rounded-lg bg-neutral-800" />
                <div className="flex gap-3">
                    <div className="h-3 w-16 rounded bg-neutral-800" />
                    <div className="h-3 w-12 rounded bg-neutral-800" />
                </div>
                <div className="h-8 w-full rounded-xl bg-neutral-800 mt-2" />
            </div>
        </div>
    );
}

// ── Hover preview popover ─────────────────────────────────────────

function HoverPreview({ item }: { item: Structure }) {
    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
    const rcsbId = item.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();
    return (
        <div
            className="absolute z-50 top-0 left-0 w-full bg-neutral-900 border border-neutral-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden pointer-events-none flex flex-col"
            style={{ maxHeight: 'calc(100% - 48px)' }}
        >
            {/* Thumbnail */}
            {rcsbId && (
                <div className="relative h-36 bg-neutral-800 overflow-hidden">
                    <img
                        src={`https://cdn.rcsb.org/images/structures/${rcsbId.toLowerCase()}_assembly-1.jpeg`}
                        alt={rcsbId}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    < div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-xs font-mono text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">{rcsbId}</span>
                </div >
            )}
            <div className="p-4 space-y-3 overflow-y-auto overflow-x-hidden flex-1 scrollbar-hide">
                {/* Name */}
                <div>
                    <p className="text-sm font-semibold text-white leading-snug">{item.metadata?.title || item.name}</p>
                    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-1 ${badge}`}>{item.file_type}</span>
                </div>
                {/* RCSB metadata grid */}
                {item.metadata && (
                    <div className="grid grid-cols-2 gap-2">
                        {item.metadata.organism && (
                            <div>
                                <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-0.5">Organism</p>
                                <p className="text-xs text-neutral-300 truncate">{item.metadata.organism}</p>
                            </div>
                        )}
                        {item.metadata.method && (
                            <div>
                                <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-0.5">Method</p>
                                <p className="text-xs text-neutral-300">{item.metadata.method}</p>
                            </div>
                        )}
                        {item.metadata.resolution != null && (
                            <div>
                                <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-0.5">Resolution</p>
                                <p className="text-xs text-neutral-300">{item.metadata.resolution.toFixed(2)} Å</p>
                            </div>
                        )}
                        <div>
                            <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-0.5">Uploaded</p>
                            <p className="text-xs text-neutral-300">{timeAgo(item.created_at)}</p>
                        </div>
                    </div>
                )}
                {/* Notes preview */}
                {item.notes && (
                    <div className="pt-2 border-t border-neutral-800">
                        <p className="text-[9px] text-neutral-600 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">{item.notes}</p>
                    </div>
                )}
                {/* Tags */}
                {(item.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map(t => (
                            <span key={t} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                        ))}
                    </div>
                )}
                {/* Stats */}
                <div className="flex items-center gap-3 pt-1 border-t border-neutral-800 text-[10px] text-neutral-600">
                    <span>{formatBytes(item.file_size)}</span>
                    {(item.view_count ?? 0) > 0 && <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{item.view_count} opens</span>}
                </div>
            </div>
        </div >
    );
}

// ── Quick Look Modal ──────────────────────────────────────────────

function QuickLookModal({ item, onClose, onOpen }: { item: Structure; onClose: () => void; onOpen: (s: Structure) => void }) {
    if (!item) return null;
    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
    const rcsbId = item.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();

    // Close on click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-8" onClick={handleBackdropClick}>
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Visual Preview Side (Left) */}
                <div className="md:w-3/5 bg-neutral-950 relative flex items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800 p-8 min-h-[300px]">
                    {rcsbId ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                            <img
                                src={`https://cdn.rcsb.org/images/structures/${rcsbId.toLowerCase()}_assembly-1.jpeg`}
                                alt={rcsbId}
                                className="w-full h-full object-contain max-h-[60vh]"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent pointer-events-none" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-600">
                            <Dna className="w-24 h-24 mb-4 opacity-50" />
                            <p className="text-lg font-medium text-neutral-500">No Preview Available</p>
                            <p className="text-sm">Cannot fetch RCSB thumbnail for this uploaded file.</p>
                        </div>
                    )}

                    {/* Action Float */}
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                        <button onClick={() => onOpen(item)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-medium shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" /> Open in Viewer
                        </button>
                    </div>
                </div>

                {/* Metadata Side (Right) */}
                <div className="md:w-2/5 flex flex-col overflow-y-auto scrollbar-hide bg-neutral-900">
                    <div className="p-6 md:p-8 space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold text-white leading-tight mb-2">{item.metadata?.title || item.name}</h2>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
                                {item.starred && <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> Starred</span>}
                                {(item.view_count ?? 0) > 0 && <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-400"><Eye className="w-3 h-3 inline mr-1" />{item.view_count} views</span>}
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Information</h3>
                            <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Size</p>
                                    <p className="text-sm font-medium text-neutral-200">{formatBytes(item.file_size)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Uploaded</p>
                                    <p className="text-sm font-medium text-neutral-200">{timeAgo(item.created_at)}</p>
                                </div>
                                {item.metadata?.resolution != null && (
                                    <div>
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Resolution</p>
                                        <p className="text-sm font-medium text-neutral-200">{item.metadata.resolution.toFixed(2)} Å</p>
                                    </div>
                                )}
                                {item.metadata?.method && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Method</p>
                                        <p className="text-sm font-medium text-neutral-200">{item.metadata.method}</p>
                                    </div>
                                )}
                                {item.metadata?.organism && (
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Organism</p>
                                        <p className="text-sm font-medium text-neutral-200">{item.metadata.organism}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags */}
                        {(item.tags ?? []).length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tags</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {item.tags.map(t => (
                                        <span key={t} className={`text-xs font-medium px-2 py-1 rounded-md border ${tagColor(t)}`}>{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        {item.notes && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Notes</h3>
                                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                                    {item.notes}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Close Button Cross */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-neutral-900/50 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full backdrop-blur transition-colors hidden md:block z-10">
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

// ── File type styles ──────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
    PDB: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    CIF: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    MMCIF: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    SDF: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    MOL: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
};
const TYPE_STRIP: Record<string, string> = {
    PDB: 'from-blue-500 to-blue-700',
    CIF: 'from-violet-500 to-violet-700',
    MMCIF: 'from-violet-500 to-violet-700',
    SDF: 'from-emerald-500 to-emerald-700',
    MOL: 'from-orange-500 to-orange-700',
};

// ── Context Menu ──────────────────────────────────────────────────

type ContextMenuPayload = {
    x: number;
    y: number;
    type: 'folder' | 'structure';
    item: any;
};

// ── Folder card ───────────────────────────────────────────────────

function FolderCard({ collection, count, onOpen, onDropStructure, onContextMenu, previews = [] }: { collection: Collection, count: number, onOpen: () => void, onDropStructure: (structureId: string, folderId: string) => void, onContextMenu: (e: React.MouseEvent, type: 'folder', item: any) => void, previews?: Structure[] }) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <button onClick={onOpen}
            onContextMenu={e => onContextMenu(e, 'folder', collection)}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
                e.preventDefault();
                setIsDragOver(false);
                const id = e.dataTransfer.getData('text/plain');
                if (id) onDropStructure(id, collection.id);
            }}
            className={`flex flex-col bg-neutral-900/80 border hover:border-neutral-600 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/30 group text-left ${isDragOver ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-500/10' : 'border-neutral-800'}`}>
            <div className={`h-1.5 w-full ${DOT[collection.color] ?? 'bg-blue-500'}`} />
            <div className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-neutral-800 group-hover:bg-neutral-700 transition-colors relative isolate">
                    {collection.is_public && <div title="Public" className="absolute top-1 right-1 z-20 drop-shadow-md flex items-center justify-center"><Globe className="w-3.5 h-3.5 text-blue-400" /></div>}
                    {previews.length > 0 ? (
                        <>
                            <Folder className={`w-6 h-6 absolute opacity-20 ${COLOR_CLASSES[collection.color]?.split(' ')[0] ?? 'text-blue-400'}`} />
                            <div className="flex -space-x-1.5 z-10 w-full h-full items-center justify-center">
                                {previews.map((p, i) => (
                                    <div key={p.id} className="w-[18px] h-6 rounded-[3px] border border-neutral-700/80 bg-neutral-900 shadow-sm flex items-center justify-center relative shadow-black/40" style={{ zIndex: 10 - i }}>
                                        <span className={`text-[5px] font-bold ${TYPE_BADGE[p.file_type]?.split(' ')[2] ?? 'text-white'}`}>{p.file_type}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <Folder className={`w-6 h-6 ${COLOR_CLASSES[collection.color]?.split(' ')[0] ?? 'text-blue-400'}`} />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-200 text-sm truncate group-hover:text-white">{collection.name}</h3>
                    <p className="text-xs text-neutral-500">{count} items</p>
                </div>
            </div>
        </button>
    );
}

const AVAILABLE_COLUMNS = [
    { id: 'type', label: 'Type' },
    { id: 'tags', label: 'Tags' },
    { id: 'size', label: 'Size' },
    { id: 'uploaded', label: 'Uploaded' },
    { id: 'resolution', label: 'Resolution' },
    { id: 'organism', label: 'Organism' },
    { id: 'method', label: 'Exp. Method' }
] as const;
export type ColumnId = typeof AVAILABLE_COLUMNS[number]['id'];

// ── Folder row ───────────────────────────────────────────────────

function FolderRow({ collection, count, onOpen, onDropStructure, onContextMenu, visibleColumns }: { collection: Collection, count: number, onOpen: () => void, onDropStructure: (structureId: string, folderId: string) => void, onContextMenu: (e: React.MouseEvent, type: 'folder', item: any) => void, visibleColumns: Record<ColumnId, boolean> }) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <tr className={`group border-b transition-colors cursor-pointer ${isDragOver ? 'bg-blue-500/10 border-blue-500/50' : 'border-neutral-800 hover:bg-neutral-800/40'}`}
            onClick={onOpen}
            onContextMenu={e => onContextMenu(e, 'folder', collection)}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={e => {
                e.preventDefault();
                setIsDragOver(false);
                const id = e.dataTransfer.getData('text/plain');
                if (id) onDropStructure(id, collection.id);
            }}>
            <td className="px-4 py-3 w-8">
                <div className="w-4 h-4" /> {/* Spacer for checkbox col */}
            </td>
            <td className="px-3 py-3 relative">
                <div className="flex items-center gap-3">
                    <Folder className={`w-4 h-4 ${COLOR_CLASSES[collection.color]?.split(' ')[0] ?? 'text-blue-400'} shrink-0`} />
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">{collection.name}</span>
                    {collection.is_public && <div title="Public Share Link Enabled" className="flex items-center shrink-0 ml-1"><Globe className="w-3.5 h-3.5 text-blue-400" /></div>}
                </div>
            </td>
            {visibleColumns.type && <td className="px-3 py-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-neutral-800 text-neutral-400 border-neutral-700">Folder</span></td>}
            {visibleColumns.tags && <td className="px-3 py-3 text-xs text-neutral-500">-</td>}
            {visibleColumns.size && <td className="px-3 py-3 text-xs text-neutral-500">{count === 1 ? '1 item' : `${count} items`}</td>}
            {visibleColumns.uploaded && <td className="px-3 py-3 text-xs text-neutral-500">-</td>}
            {visibleColumns.resolution && <td className="px-3 py-3 text-xs text-neutral-500">-</td>}
            {visibleColumns.organism && <td className="px-3 py-3 text-xs text-neutral-500">-</td>}
            {visibleColumns.method && <td className="px-3 py-3 text-xs text-neutral-500">-</td>}
            <td className="px-3 py-3"></td>
        </tr>
    );
}

// ── Structure card ────────────────────────────────────────────────

interface CardProps {
    item: Structure;
    selected: boolean;
    onSelect: (e: React.MouseEvent, id: string) => void;
    onDoubleClick?: (id: string) => void;
    onToggleStar: (s: Structure) => Promise<void>;
    onDelete: (s: Structure) => Promise<void>;
    onRename: (id: string, name: string) => Promise<void>;
    onNotesChange: (id: string, notes: string) => void;
    onTagsChange: (id: string, tags: string[]) => void;
    onDuplicate: (s: Structure) => void;
    onMove: (s: Structure) => void;
    onOpen: (s: Structure) => void;
    openingId: string | null;
    duplicatingId: string | null;
    onContextMenu: (e: React.MouseEvent, type: 'structure', item: any) => void;
    visibleColumns?: Record<ColumnId, boolean>;
}

function StructureCard({
    item, selected, onSelect,
    onToggleStar, onDelete, onRename, onNotesChange, onTagsChange,
    onDuplicate, onMove, onOpen, openingId, duplicatingId, onContextMenu, onDoubleClick
}: CardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);
    const [showNotes, setShowNotes] = useState(false);
    const [draftNotes, setDraftNotes] = useState(item.notes ?? '');
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Use a ref for the dropdown container to detect outside clicks
    const menuRef = useRef<HTMLDivElement>(null);

    // Derive RCSB ID from name (4-char PDB format) or metadata
    const rcsbId = item.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();
    const hasThumbnail = !!(rcsbId && item.metadata);

    useEffect(() => { setDraftName(item.name); }, [item.name]);
    useEffect(() => { setDraftNotes(item.notes ?? ''); }, [item.notes]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const commitRename = () => {
        setEditing(false);
        const t = draftName.trim();
        if (t && t !== item.name) onRename(item.id, t);
        else setDraftName(item.name);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleShare = async () => {
        try {
            const url = await getDownloadUrl(item.file_path);
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* ignore */ }
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const url = await getDownloadUrl(item.file_path);
            const a = document.createElement('a');
            a.href = url; a.download = `${item.name}.${item.file_type.toLowerCase()}`; a.click();
        } catch { /* ignore */ } finally { setDownloading(false); }
    };

    const strip = TYPE_STRIP[item.file_type] ?? 'from-neutral-500 to-neutral-700';
    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';

    return (
        <div
            className={`group rounded-2xl transition-all duration-200 hover:shadow-xl hover:shadow-black/30 flex flex-col relative z-0 hover:z-50
                ${selected ? 'shadow-blue-500/10 shadow-lg' : ''}`}
            onClick={e => onSelect(e, item.id)}
            onDoubleClick={() => onDoubleClick?.(item.id)}
            onContextMenu={e => onContextMenu(e, 'structure', item)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            draggable
            onDragStart={handleDragStart}
        >
            {/* Hover preview popover (escapes bounds) */}
            {hovered && <HoverPreview item={item} />}

            {/* Inner clipping wrapper */}
            <div className={`flex-1 flex flex-col bg-neutral-900/80 border rounded-2xl overflow-hidden transition-colors
                ${selected ? 'border-blue-500/60' : 'border-neutral-800 group-hover:border-neutral-600'}`}>

                {/* Gradient strip or RCSB Thumbnail */}
                {hasThumbnail ? (
                    <div className="relative h-36 overflow-hidden bg-neutral-800">
                        <img
                            src={`https://cdn.rcsb.org/images/structures/${rcsbId!.toLowerCase()}_assembly-1.jpeg`}
                            alt={rcsbId}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={e => {
                                const el = e.target as HTMLImageElement;
                                el.parentElement!.style.display = 'none';
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/70 via-transparent to-transparent" />
                        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-sm ${badge}`}>{item.file_type}</span>
                    </div>
                ) : (
                    <div className={`h-1 w-full bg-gradient-to-r ${strip}`} >
                        <div className={`absolute top-2 left-2 z-10 
                ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                transition-opacity duration-200`}>
                            <button onClick={(e) => {
                                e.stopPropagation();
                                onSelect(e, item.id);
                            }}
                                className={`p-1.5 rounded-md backdrop-blur-md border shadow-sm transition-all
                    ${selected
                                        ? 'bg-blue-500/90 border-blue-400 text-white'
                                        : 'bg-black/40 border-white/20 text-neutral-300 hover:bg-black/60 hover:text-white hover:border-white/40'}`}>
                                <CheckSquare className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className={`p-5 flex flex-col flex-1`}>
                    {/* Top row */}
                    <div className={`flex items-start justify-between mb-3 ${selected ? 'pl-6' : ''}`}>
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                <Dna className="w-4 h-4 text-white/50" />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
                        </div>
                        <button onClick={() => onToggleStar(item)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                            <Star className={`w-4 h-4 transition-all ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                        </button>
                    </div>

                    {/* Name */}
                    {editing ? (
                        <input ref={inputRef} value={draftName}
                            onChange={e => setDraftName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(item.name); } }}
                            onClick={e => e.stopPropagation()}
                            className="text-sm font-semibold text-white bg-neutral-800 border border-blue-500/60 rounded-lg px-2.5 py-1 w-full outline-none focus:ring-1 focus:ring-blue-500 mb-1" />
                    ) : (
                        <button onClick={e => { e.stopPropagation(); setEditing(true); }}
                            className="group/name flex items-center gap-1.5 text-left mb-1 w-full min-w-0" title="Click to rename">
                            <span className="text-sm font-semibold text-neutral-100 truncate">{item.name}</span>
                            <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/name:opacity-100 transition-all shrink-0" />
                        </button>
                    )}

                    {/* File metadata */}
                    <div className="flex items-center gap-3 text-xs text-neutral-500 mb-2">
                        <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{formatBytes(item.file_size)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(item.created_at)}</span>
                        {(item.view_count ?? 0) > 0 && (
                            <span className="flex items-center gap-1 ml-auto text-neutral-600">
                                <Eye className="w-3 h-3" />{item.view_count}
                            </span>
                        )}
                    </div>

                    {/* RCSB metadata */}
                    {item.metadata && (
                        <div className="grid grid-cols-2 gap-1.5 mb-3">
                            {item.metadata.organism && (
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500 truncate" title={item.metadata.organism}>
                                    <Globe className="w-2.5 h-2.5 shrink-0" />{item.metadata.organism}
                                </div>
                            )}
                            {item.metadata.method && (
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500 truncate" title={item.metadata.method}>
                                    <Microscope className="w-2.5 h-2.5 shrink-0" />{item.metadata.method}
                                </div>
                            )}
                            {item.metadata.resolution != null && (
                                <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                                    <Beaker className="w-2.5 h-2.5 shrink-0" />{item.metadata.resolution.toFixed(2)} Å
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tags */}
                    <TagEditor
                        tags={item.tags ?? []}
                        onChange={tags => onTagsChange(item.id, tags)}
                    />
                    {item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {item.tags.map(t => (
                                <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    <div className="mb-4">
                        <button onClick={e => { e.stopPropagation(); setShowNotes(p => !p); }}
                            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-1.5">
                            <NotebookPen className="w-3 h-3" />
                            {draftNotes ? 'Notes' : 'Add notes'}
                            {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {showNotes && (
                            <textarea value={draftNotes}
                                onChange={e => setDraftNotes(e.target.value)}
                                onBlur={() => { if (draftNotes !== (item.notes ?? '')) onNotesChange(item.id, draftNotes); }}
                                onClick={e => e.stopPropagation()}
                                placeholder="Source, experiment notes, doi:10.1234/…"
                                rows={3}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                        )}
                    </div>

                    {/* Action bar */}
                    <div className="mt-auto space-y-1.5">
                        {/* Primary: Open */}
                        <button onClick={() => onOpen(item)} disabled={!!openingId}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 text-xs font-medium transition-all disabled:opacity-50">
                            {openingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                            Open in Viewer
                        </button>
                        {/* Secondary: 5 small buttons */}
                        <div className="grid grid-cols-5 gap-1.5">
                            <button onClick={handleDownload} disabled={downloading} title="Download"
                                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 text-neutral-400 hover:text-white transition-all disabled:opacity-50">
                                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                <span className="text-[9px]">Downld</span>
                            </button>
                            <button onClick={handleShare} title="Copy link"
                                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 text-neutral-400 hover:text-white transition-all">
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                                <span className={`text-[9px] ${copied ? 'text-emerald-400' : ''}`}>{copied ? 'Copied' : 'Share'}</span>
                            </button>
                            <button onClick={() => onDuplicate(item)} disabled={duplicatingId === item.id} title="Duplicate"
                                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 text-neutral-400 hover:text-white transition-all disabled:opacity-50">
                                {duplicatingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                                <span className="text-[9px]">Clone</span>
                            </button>
                            <button onClick={() => onMove(item)} title="Move to folder"
                                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 text-neutral-400 hover:text-white transition-all">
                                <FolderInput className="w-3.5 h-3.5" />
                                <span className="text-[9px]">Move</span>
                            </button>
                            <button onClick={() => onDelete(item)} title="Delete"
                                className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-red-500/15 border border-neutral-700/50 hover:border-red-500/30 text-neutral-600 hover:text-red-400 transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[9px]">Delete</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


// ── List row ──────────────────────────────────────────────────────

function StructureRow({ item, selected, onSelect, onToggleStar, onDelete, onRename, onOpen, onMove, openingId, onContextMenu, onDoubleClick, visibleColumns }: Pick<CardProps,
    'item' | 'selected' | 'onSelect' | 'onToggleStar' | 'onDelete' | 'onRename' | 'onOpen' | 'onMove' | 'openingId' | 'onContextMenu' | 'onDoubleClick' | 'visibleColumns'>) {

    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);
    const [downloading, setDownloading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setDraftName(item.name); }, [item.name]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    const commitRename = () => {
        setEditing(false);
        const t = draftName.trim();
        if (t && t !== item.name) onRename(item.id, t);
        else setDraftName(item.name);
    };
    const handleDownload = async () => {
        setDownloading(true);
        try { const url = await getDownloadUrl(item.file_path); const a = document.createElement('a'); a.href = url; a.download = `${item.name}.${item.file_type.toLowerCase()}`; a.click(); }
        catch { /* ignore */ } finally { setDownloading(false); }
    };
    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <tr className={`group border-b transition-colors cursor-pointer
            ${selected ? 'bg-blue-500/10 border-blue-500/50' : 'border-neutral-800 hover:bg-neutral-800/40'}
            ${openingId === item.id ? 'opacity-50' : ''}`}
            onContextMenu={e => onContextMenu(e, 'structure', item)}
            onClick={(e) => onSelect(e, item.id)}
            onDoubleClick={() => onDoubleClick?.(item.id)}
            draggable
            onDragStart={handleDragStart}>
            <td className="px-4 py-3 w-8">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected ? 'bg-blue-500 border-blue-500' : 'border-neutral-600 group-hover:border-blue-400'}`}>
                    {selected && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
            </td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                    <Dna className="w-4 h-4 text-neutral-600 shrink-0" />
                    {editing ? (
                        <input ref={inputRef} value={draftName} onChange={e => setDraftName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(item.name); } }}
                            onClick={e => e.stopPropagation()}
                            className="text-sm text-white bg-neutral-700 border border-blue-500/60 rounded px-2 py-0.5 outline-none w-40" />
                    ) : (
                        <button onClick={e => { e.stopPropagation(); setEditing(true); }} className="group/n flex items-center gap-1 min-w-0">
                            <span className="text-sm text-neutral-100 truncate max-w-[160px]">{item.name}</span>
                            <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/n:opacity-100 shrink-0" />
                        </button>
                    )}
                </div>
            </td>
            {visibleColumns?.type && (
                <td className="px-3 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
                </td>
            )}
            {visibleColumns?.tags && (
                <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                        {(item.tags ?? []).map(t => (
                            <span key={t} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                        ))}
                    </div>
                </td>
            )}
            {visibleColumns?.size && <td className="px-3 py-3 text-xs text-neutral-500">{formatBytes(item.file_size)}</td>}
            {visibleColumns?.uploaded && <td className="px-3 py-3 text-xs text-neutral-500">{timeAgo(item.created_at)}</td>}
            {visibleColumns?.resolution && <td className="px-3 py-3 text-xs text-neutral-500">{item.metadata?.resolution ? `${item.metadata.resolution.toFixed(2)} Å` : '-'}</td>}
            {visibleColumns?.organism && <td className="px-3 py-3 text-xs text-neutral-500 truncate max-w-[120px]" title={item.metadata?.organism || ''}>{item.metadata?.organism || '-'}</td>}
            {visibleColumns?.method && <td className="px-3 py-3 text-xs text-neutral-500 truncate max-w-[120px]" title={item.metadata?.method || ''}>{item.metadata?.method || '-'}</td>}
            <td className="px-3 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={e => { e.stopPropagation(); onOpen(item); }} disabled={!!openingId} title="Open"
                        className="p-1.5 rounded-lg hover:bg-blue-500/20 text-neutral-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                        {openingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDownload(); }} disabled={downloading} title="Download"
                        className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-500 hover:text-white transition-colors disabled:opacity-50">
                        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); onToggleStar(item); }} className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors">
                        <Star className={`w-3.5 h-3.5 ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onMove(item); }} title="Move to folder"
                        className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-500 hover:text-white transition-colors">
                        <FolderInput className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(item); }} title="Delete"
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ── RCSB Import bar ───────────────────────────────────────────────

function RCSBImport({ userId, onImported }: { userId: string; onImported: (s: Structure) => void }) {
    const [pdbId, setPdbId] = useState('');
    const [loading, setLoading] = useState(false);

    const handle = async (e: React.FormEvent) => {
        e.preventDefault(); setLoading(true);
        try {
            const s = await importFromRCSB(pdbId, userId);
            onImported(s); setPdbId('');
        } catch (ex: any) { alert(ex.message ?? 'Import failed'); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={handle} className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 hover:border-neutral-600 focus-within:border-blue-500/50 rounded-lg px-2.5 py-1.5 transition-colors w-40 shrink-0">
            <Import className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            <input value={pdbId} onChange={e => setPdbId(e.target.value.toUpperCase())}
                placeholder="PDB" maxLength={4}
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-neutral-500 outline-none uppercase font-mono tracking-widest" />
            <button type="submit" disabled={pdbId.length !== 4 || loading} title="Import from RCSB"
                className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
        </form>
    );
}

// ── Page ──────────────────────────────────────────────────────────

type SortKey = 'date' | 'name' | 'size';
type ViewMode = 'grid' | 'list';

// ── ZIP export progress ────────────────────────────────────────────
function ExportZipButton({ structures }: { structures: Structure[] }) {
    const [exporting, setExporting] = useState(false);
    const handle = async () => {
        setExporting(true);
        try { await exportAllAsZip(structures); }
        catch (e: any) { alert(e.message ?? 'Export failed'); }
        finally { setExporting(false); }
    };
    return (
        <button onClick={handle} disabled={exporting || structures.length === 0}
            title="Export all as ZIP"
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 bg-neutral-900 border border-neutral-700 rounded-lg hover:text-white hover:border-neutral-600 disabled:opacity-50 transition-all">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export ZIP
        </button>
    );
}

export const MyStructures = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [structures, setStructures] = useState<Structure[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [quickLookId, setQuickLookId] = useState<string | null>(null);

    // New State for Moving Structure
    const [movingStructure, setMovingStructure] = useState<Structure | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showStarred, setShowStarred] = useState(false);
    const [sortBy, setSortBy] = useState<SortKey>('date');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [openingId, setOpeningId] = useState<string | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [activeTag, setActiveTag] = useState<string | null>(null);

    // Context Menu State
    const [contextMenu, setContextMenu] = useState<ContextMenuPayload | null>(null);

    // Global Dropzone State
    const [isWindowDragOver, setIsWindowDragOver] = useState(false);
    const [dragOverBreadcrumb, setDragOverBreadcrumb] = useState<string | null | undefined>(undefined);

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    // Inspector Sidebar
    const [showInspector, setShowInspector] = useState(() => localStorage.getItem('quercus_show_inspector') === 'true');
    useEffect(() => { localStorage.setItem('quercus_show_inspector', showInspector.toString()); }, [showInspector]);

    // Mobile Sidebar
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Advanced Filters
    const [filters, setFilters] = useState<FilterRule[]>([]);

    // Column resizing and visibility
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        name: 300,
        type: 100,
        tags: 150,
        size: 100,
        uploaded: 120,
        resolution: 120,
        organism: 150,
        method: 150
    });

    const [visibleColumns, setVisibleColumns] = useState<Record<ColumnId, boolean>>(() => {
        const stored = localStorage.getItem('quercus_visible_columns');
        return stored ? JSON.parse(stored) : {
            type: true, tags: true, size: true, uploaded: true,
            resolution: false, organism: false, method: false
        };
    });
    useEffect(() => { localStorage.setItem('quercus_visible_columns', JSON.stringify(visibleColumns)); }, [visibleColumns]);

    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const columnDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (columnDropdownRef.current && !columnDropdownRef.current.contains(e.target as Node)) {
                setShowColumnDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleResize = (colKey: string, e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = columnWidths[colKey];

        const onMouseMove = (moveEvent: MouseEvent) => {
            requestAnimationFrame(() => {
                const newWidth = Math.max(50, startWidth + moveEvent.clientX - startX);
                setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
            });
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
        };

        document.body.style.cursor = 'col-resize';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Pinned folders
    const [pinnedCollectionIds, setPinnedCollectionIds] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('quercus_pinned_folders') || '[]'); } catch { return []; }
    });
    useEffect(() => { localStorage.setItem('quercus_pinned_folders', JSON.stringify(pinnedCollectionIds)); }, [pinnedCollectionIds]);

    const handleTogglePin = (id: string) => {
        setPinnedCollectionIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
    };

    // Collections
    const [collections, setCollections] = useState<Collection[]>([]);

    // Custom folder colors
    const [folderColors, setFolderColors] = useState<Record<string, string>>(() => {
        try { return JSON.parse(localStorage.getItem('quercus_folder_colors') || '{}'); } catch { return {}; }
    });
    useEffect(() => { localStorage.setItem('quercus_folder_colors', JSON.stringify(folderColors)); }, [folderColors]);

    const handleSetFolderColor = (id: string, color: string) => {
        setFolderColors(prev => ({ ...prev, [id]: color }));
    };

    const mappedCollections = useMemo(() => collections.map(c => ({
        ...c,
        color: folderColors[c.id] || c.color
    })), [collections, folderColors]);
    const [activeCollection, setActiveCollection] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!user) return;
        try {
            setError(null);
            const [structs, cols] = await Promise.all([listStructures(user.id), listCollections(user.id)]);
            setStructures(structs);
            setCollections(cols);
        }
        catch (ex: any) { setError(ex.message ?? 'Failed to load'); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { reload(); }, [reload]);

    // All unique tags in library
    const allTags = [...new Set(structures.flatMap(s => s.tags ?? []))].sort();

    // Filtering + sorting
    const filtered = useMemo(() => {
        let result = structures;

        const isTrashView = activeCollection === '__trash__';

        if (isTrashView) {
            result = result.filter(s => s.metadata?.is_deleted);
        } else {
            result = result.filter(s => !s.metadata?.is_deleted);

            if (showStarred) result = result.filter(s => s.starred);
            if (activeTag) result = result.filter(s => (s.tags ?? []).includes(activeTag));
            if (activeCollection === '__none__') result = result.filter(s => !s.collection_id);
            else if (activeCollection) result = result.filter(s => s.collection_id === activeCollection);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(s => s.name.toLowerCase().includes(q));
        }

        // Apply advanced filters
        for (const f of filters) {
            if (!f.value) continue;
            if (f.field === 'type') {
                const val = f.value.toLowerCase();
                if (f.operator === '==') result = result.filter(s => s.file_type.toLowerCase() === val);
                else if (f.operator === 'contains') result = result.filter(s => s.file_type.toLowerCase().includes(val));
            } else if (f.field === 'size') {
                const mb = parseFloat(f.value);
                if (isNaN(mb)) continue;
                const bytes = mb * 1024 * 1024;
                if (f.operator === '>') result = result.filter(s => (s.file_size || 0) > bytes);
                if (f.operator === '<') result = result.filter(s => (s.file_size || 0) < bytes);
            } else if (f.field === 'name') {
                const val = f.value.toLowerCase();
                if (f.operator === 'contains') result = result.filter(s => s.name.toLowerCase().includes(val));
                if (f.operator === '==') result = result.filter(s => s.name.toLowerCase() === val);
            }
        }

        return [...result].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'size') return (b.file_size ?? 0) - (a.file_size ?? 0);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [structures, activeCollection, showStarred, activeTag, searchQuery, sortBy, filters]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = '';
        setUploading(true);
        try {
            const destId = activeCollection === '__none__' ? null : activeCollection;
            const s = await uploadStructure(file, user.id, { collection_id: destId });
            setStructures(prev => [s, ...prev]);
        } catch (ex: any) {
            setError(ex.message ?? 'Failed to upload');
        } finally {
            setUploading(false);
        }
    };

    const handleGlobalDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsWindowDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0 || !user) return;

        setUploading(true);
        try {
            const destId = activeCollection === '__none__' ? null : activeCollection;
            for (const file of files) {
                // Check if it's a valid extension, but for now we attempt all dropped files
                const s = await uploadStructure(file, user.id, { collection_id: destId });
                setStructures(prev => [s, ...prev]);
            }
        } catch (ex: any) {
            setError(ex.message ?? 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStar = async (s: Structure) => {
        const next = !s.starred;
        setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: next } : x));
        try { await toggleStar(s.id, next); } catch { setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: s.starred } : x)); }
    };

    const handleRename = async (id: string, name: string) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, name } : x));
        try { await renameStructure(id, name); } catch { reload(); }
    };

    const handleNotesChange = async (id: string, notes: string) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, notes } : x));
        try { await updateNotes(id, notes); } catch { reload(); }
    };

    const handleTagsChange = async (id: string, tags: string[]) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, tags } : x));
        try { await updateTags(id, tags); } catch { reload(); }
    };

    const handleDelete = async (s: Structure) => {
        const isTrash = activeCollection === '__trash__';
        if (isTrash) {
            if (!confirm(`Permanently delete "${s.name}"? This cannot be undone.`)) return;
            setStructures(prev => prev.filter(x => x.id !== s.id));
            try { await deleteStructure(s.id, s.file_path); }
            catch (ex: any) { setError(ex.message ?? 'Delete failed'); reload(); }
        } else {
            // Soft delete
            setStructures(prev => prev.map(x => x.id === s.id ? { ...x, metadata: { ...x.metadata, is_deleted: true } as any } : x));
            try {
                const { moveToTrash } = await import('../../lib/structuresService');
                await moveToTrash(s.id, s.metadata);
            }
            catch (ex: any) { setError(ex.message ?? 'Move to Trash failed'); reload(); }
        }
    };

    const handleDuplicate = async (s: Structure) => {
        if (!user) return;
        setDuplicatingId(s.id);
        try {
            const copy = await duplicateStructure(s, user.id);
            setStructures(prev => [copy, ...prev]);
        } catch (ex: any) {
            setError(ex.message || 'Failed to duplicate');
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleOpen = async (s: Structure) => {
        setOpeningId(s.id);
        try {
            const url = await getDownloadUrl(s.file_path);
            sessionStorage.setItem('pendingStructure', JSON.stringify({ url, name: s.name, fileType: s.file_type.toLowerCase() }));
            // Fire analytics (non-blocking)
            if (user) {
                incrementViewCount(s.id).then(() => {
                    setStructures(prev => prev.map(p => p.id === s.id ? { ...p, view_count: (p.view_count ?? 0) + 1 } : p));
                }).catch(() => { });
                logActivity(user.id, 'open', s.id, s.name).catch(() => { });
            }
            navigate('/');
        } catch (ex: any) { setError(ex.message ?? 'Could not open'); }
        finally { setOpeningId(null); }
    };

    // Advanced Selection Handling
    const toggleSelect = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        if (e.shiftKey && lastSelectedId) {
            // Range select
            const startIdx = filtered.findIndex(s => s.id === lastSelectedId);
            const endIdx = filtered.findIndex(s => s.id === id);
            if (startIdx !== -1 && endIdx !== -1) {
                const sIdx = Math.min(startIdx, endIdx);
                const eIdx = Math.max(startIdx, endIdx);
                const rangeIds = filtered.slice(sIdx, eIdx + 1).map(s => s.id);

                // If Cmd/Ctrl is also held, add to existing selection, otherwise replace
                if (e.metaKey || e.ctrlKey) {
                    setSelected(prev => new Set([...prev, ...rangeIds]));
                } else {
                    setSelected(new Set(rangeIds));
                }
            }
        } else if (e.metaKey || e.ctrlKey) {
            // Toggle select
            setSelected(prev => {
                const s = new Set(prev);
                s.has(id) ? s.delete(id) : s.add(id);
                return s;
            });
            setLastSelectedId(id);
        } else {
            // Single select (or deselect if clicking the only selected item)
            setSelected(prev => {
                if (prev.size === 1 && prev.has(id)) return new Set();
                return new Set([id]);
            });
            setLastSelectedId(id);
        }
    };

    const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
    const deselectAll = () => { setSelected(new Set()); setLastSelectedId(null); };

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.preventDefault();
                selectAll();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected.size > 0) {
                e.preventDefault();
                if (confirm(`Are you sure you want to delete ${selected.size} item(s)?`)) {
                    const toDelete = structures.filter(s => selected.has(s.id));
                    Promise.all(toDelete.map(handleDelete));
                    deselectAll();
                }
            } else if (e.key === 'F2' && selected.size === 1) {
                e.preventDefault();
                setOpeningId("rename-" + Array.from(selected)[0]);
            } else if (e.code === 'Space') {
                e.preventDefault();
                if (quickLookId) {
                    setQuickLookId(null);
                } else if (selected.size === 1) {
                    setQuickLookId(Array.from(selected)[0]);
                }
            } else if (e.key === 'Escape') {
                if (quickLookId) setQuickLookId(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selected, structures, filtered, quickLookId]);

    const handleBulkDelete = async () => {
        const ids = [...selected];
        const isTrash = activeCollection === '__trash__';

        if (isTrash) {
            if (!confirm(`Permanently delete ${ids.length} structure${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
            const toDelete = structures.filter(s => ids.includes(s.id));
            setStructures(prev => prev.filter(s => !ids.includes(s.id)));
            setSelected(new Set());
            for (const s of toDelete) {
                try { await deleteStructure(s.id, s.file_path); } catch { /* best effort */ }
            }
        } else {
            const toDelete = structures.filter(s => ids.includes(s.id));
            setStructures(prev => prev.map(s => ids.includes(s.id) ? { ...s, metadata: { ...s.metadata, is_deleted: true } as any } : s));
            setSelected(new Set());
            const { moveToTrash } = await import('../../lib/structuresService');
            for (const s of toDelete) {
                try { await moveToTrash(s.id, s.metadata); } catch { /* best effort */ }
            }
        }
    };

    const handleRestore = async (s: Structure) => {
        setStructures(prev => prev.map(x => {
            if (x.id !== s.id) return x;
            const updatedMeta = { ...x.metadata };
            delete updatedMeta.is_deleted;
            delete updatedMeta.deleted_at;
            return { ...x, metadata: updatedMeta as any };
        }));
        try {
            const { restoreFromTrash } = await import('../../lib/structuresService');
            await restoreFromTrash(s.id, s.metadata);
        }
        catch (ex: any) { setError(ex.message ?? 'Restore failed'); reload(); }
    };

    const handleBulkRestore = async () => {
        const ids = [...selected];
        if (!confirm(`Restore ${ids.length} structure${ids.length > 1 ? 's' : ''}?`)) return;
        const toRestore = structures.filter(s => ids.includes(s.id));
        setStructures(prev => prev.map(x => {
            if (!ids.includes(x.id)) return x;
            const updatedMeta = { ...x.metadata };
            delete updatedMeta.is_deleted;
            delete updatedMeta.deleted_at;
            return { ...x, metadata: updatedMeta as any };
        }));
        setSelected(new Set());
        try {
            const { restoreFromTrash } = await import('../../lib/structuresService');
            for (const s of toRestore) {
                await restoreFromTrash(s.id, s.metadata);
            }
        }
        catch (ex: any) { setError(ex.message ?? 'Bulk restore failed'); reload(); }
    };

    const handleBulkDownload = async () => {
        const toDownload = structures.filter(s => selected.has(s.id));
        for (const s of toDownload) {
            try {
                const url = await getDownloadUrl(s.file_path);
                const a = document.createElement('a');
                a.href = url; a.download = `${s.name}.${s.file_type.toLowerCase()}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                await new Promise(r => setTimeout(r, 300)); // small delay between downloads
            } catch { /* best effort */ }
        }
    };

    // Collections counts
    const collectionCounts: Record<string, number> = { '__all__': structures.length };
    for (const c of mappedCollections) collectionCounts[c.id] = structures.filter(s => s.collection_id === c.id).length;
    const uncategorizedCount = structures.filter(s => !s.collection_id).length;

    // Hierarchy computations
    const currentBreadcrumbs = useMemo(() => {
        if (!activeCollection || activeCollection === '__none__') return [];
        const path: Collection[] = [];
        let currId: string | null = activeCollection;
        while (currId) {
            const col = mappedCollections.find(c => c.id === currId);
            if (!col) break;
            path.unshift(col);
            currId = col.parent_id || null;
        }
        return path;
    }, [activeCollection, mappedCollections]);

    const activeSubfolders = useMemo(() => {
        if (activeCollection === '__none__') return [];
        return mappedCollections.filter(c => c.parent_id === activeCollection);
    }, [activeCollection, mappedCollections]);

    const recentStructures = useMemo(() => {
        return [...structures].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    }, [structures]);

    const handleCompareInMultiview = async () => {
        if (!user) return;
        const toCompare = structures.filter(s => selected.has(s.id)).slice(0, 4);
        const items = await Promise.all(toCompare.map(async s => {
            const url = await getDownloadUrl(s.file_path);
            return { url, name: s.name, fileType: s.file_type.toLowerCase() };
        }));
        sessionStorage.setItem('pendingStructures', JSON.stringify(items));
        navigate('/');
        window.dispatchEvent(new CustomEvent('quercus:load-structure'));
    };

    const handleMoveConfirm = async (destId: string | null) => {
        if (!movingStructure) return;
        try {
            // Import dynamically since it's added in structuresService
            const { moveStructure } = await import('../../lib/structuresService');
            await moveStructure(movingStructure.id, destId);
            setStructures(prev => prev.map(s => s.id === movingStructure.id ? { ...s, collection_id: destId } : s));
        } catch (e: any) {
            setError(e.message || 'Failed to move structure');
        } finally {
            setMovingStructure(null);
        }
    };

    const handleDropMove = async (structureId: string, destCollectionId: string) => {
        // Prevent moving to same folder
        const struct = structures.find(s => s.id === structureId);
        if (!struct || struct.collection_id === destCollectionId) return;

        try {
            const { moveStructure } = await import('../../lib/structuresService');
            await moveStructure(structureId, destCollectionId);
            setStructures(prev => prev.map(s => s.id === structureId ? { ...s, collection_id: destCollectionId } : s));
        } catch (e: any) {
            setError(e.message || 'Failed to move structure via drag and drop');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'structure', item: any) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            type,
            item
        });
    };

    // Close context menu on click anywhere
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);


    const sharedCardProps = { openingId, duplicatingId, onMove: setMovingStructure, onContextMenu: handleContextMenu };

    return (
        <div
            className="max-w-7xl mx-auto space-y-4 pb-24 px-2 relative min-h-[calc(100vh-80px)]"
            onDragOver={e => {
                // Only show dropzone for actual files, not for dragging internal structure cards
                if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    setIsWindowDragOver(true);
                }
            }}
            onDragLeave={() => setIsWindowDragOver(false)}
            onDrop={handleGlobalDrop}
        >
            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} className="hidden" onChange={handleFileChange} />

            {/* Global Dropzone Overlay */}
            {isWindowDragOver && (
                <div className="absolute inset-x-2 inset-y-0 z-[200] max-h-[80vh] bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-3xl flex flex-col items-center justify-center backdrop-blur-[2px]">
                    <div className="bg-neutral-900 border border-neutral-700 shadow-2xl rounded-2xl p-8 flex flex-col items-center animate-in zoom-in duration-200">
                        <Upload className="w-12 h-12 text-blue-400 mb-4 animate-bounce" />
                        <h2 className="text-xl font-bold text-white mb-1">Drop files to upload</h2>
                        <p className="text-neutral-400 text-sm">
                            {activeCollection && activeCollection !== '__none__'
                                ? `Adding to: ${collections.find(c => c.id === activeCollection)?.name}`
                                : 'Adding to Library root'}
                        </p>
                    </div>
                </div>
            )}

            {/* Main layout with collections sidebar */}
            <div className="flex gap-2 sm:gap-6 relative">

                {/* Error floating */}
                {error && (
                    <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm shadow-xl shadow-black/50 backdrop-blur-md">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                {/* Collections sidebar - Desktop */}
                {!loading && user && (
                    <div className="hidden sm:block relative z-10 w-64 shrink-0">
                        <FolderTreeSidebar
                            userId={user.id}
                            collections={mappedCollections}
                            activeCollection={activeCollection}
                            counts={collectionCounts}
                            uncategorizedCount={uncategorizedCount}
                            onSelect={setActiveCollection}
                            onCreated={c => setCollections(prev => [...prev, c])}
                            onRenamed={(id, name) => setCollections(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
                            onDeleted={id => setCollections(prev => prev.filter(c => c.id !== id))}
                            onDropStructure={handleDropMove}
                            recentStructures={recentStructures}
                            pinnedCollectionIds={pinnedCollectionIds}
                            onOpenStructure={handleOpen}
                            onTogglePin={handleTogglePin}
                        />
                    </div>
                )}

                {/* Collections sidebar - Mobile Drawer */}
                {!loading && user && (
                    <div className={`sm:hidden fixed inset-0 z-[100] transition-opacity duration-300 ${showMobileSidebar ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)} />
                        {/* Drawer */}
                        <div className={`absolute inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-out flex ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
                            <FolderTreeSidebar
                                userId={user.id}
                                collections={mappedCollections}
                                activeCollection={activeCollection}
                                counts={collectionCounts}
                                uncategorizedCount={uncategorizedCount}
                                onSelect={(id) => { setActiveCollection(id); setShowMobileSidebar(false); }}
                                onCreated={c => setCollections(prev => [...prev, c])}
                                onRenamed={(id, name) => setCollections(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
                                onDeleted={id => setCollections(prev => prev.filter(c => c.id !== id))}
                                onDropStructure={handleDropMove}
                                recentStructures={recentStructures}
                                pinnedCollectionIds={pinnedCollectionIds}
                                onOpenStructure={handleOpen}
                                onTogglePin={handleTogglePin}
                                onClose={() => setShowMobileSidebar(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0 flex flex-col pt-2">
                    {/* Breadcrumbs Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-h-[32px]">
                        {!loading && (
                            <div className="flex items-center gap-2 text-[15px] font-medium text-neutral-400 px-1 py-1 w-full sm:w-auto">
                                <button onClick={() => setShowMobileSidebar(true)}
                                    className="sm:hidden p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors shrink-0">
                                    <Menu className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar flex-1">
                                    <button
                                        onClick={() => setActiveCollection(null)}
                                        // Root library dropzone
                                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverBreadcrumb(null); }}
                                        onDragLeave={() => setDragOverBreadcrumb(undefined)}
                                        onDrop={e => {
                                            e.preventDefault(); setDragOverBreadcrumb(undefined);
                                            const id = e.dataTransfer.getData('text/plain');
                                            if (id) {
                                                if (activeCollection) handleDropMove(id, ''); // move to root
                                            }
                                        }}
                                        className={`transition-colors px-1.5 py-0.5 rounded ${dragOverBreadcrumb === null ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' : 'hover:text-white'}`}>
                                        Projects
                                    </button>
                                    {activeCollection && activeCollection !== '__none__' ? currentBreadcrumbs.map((crumb: Collection, idx: number) => (
                                        <React.Fragment key={crumb.id}>
                                            <span className="text-neutral-600">/</span>
                                            <button
                                                onClick={() => setActiveCollection(crumb.id)}
                                                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverBreadcrumb(crumb.id); }}
                                                onDragLeave={() => setDragOverBreadcrumb(undefined)}
                                                onDrop={e => {
                                                    e.preventDefault(); setDragOverBreadcrumb(undefined);
                                                    const id = e.dataTransfer.getData('text/plain');
                                                    if (id && crumb.id !== activeCollection) { // If dropped onto a non-active breadcrumb ancestor
                                                        handleDropMove(id, crumb.id);
                                                    }
                                                }}
                                                className={`transition-colors px-1.5 py-0.5 rounded ${dragOverBreadcrumb === crumb.id ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50' : (idx === currentBreadcrumbs.length - 1 ? "text-neutral-200" : "hover:text-white")}`}
                                            >
                                                {crumb.name}
                                            </button>
                                        </React.Fragment>
                                    )) : activeCollection === '__none__' && (
                                        <>
                                            <span className="text-neutral-600">/</span>
                                            <span className="text-neutral-200">Uncategorized</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto shrink-0">
                            {!loading && <ExportZipButton structures={structures} />}
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-500 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-sm transition-colors shadow-sm">
                                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                Upload
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="relative flex-1 min-w-[200px] w-full sm:w-auto sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter structures…"
                                className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                        </div>

                        {!loading && user && <RCSBImport userId={user.id} onImported={s => setStructures(prev => [s, ...prev])} />}

                        <button onClick={() => setShowStarred(p => !p)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg transition-all ${showStarred ? 'text-amber-400 border-amber-400/50 bg-amber-500/5' : 'text-neutral-400 bg-neutral-900 border-neutral-700 hover:text-amber-400 hover:border-neutral-600'}`}>
                            <Star className={`w-3.5 h-3.5 ${showStarred ? 'fill-amber-400' : ''}`} />Starred
                        </button>

                        {/* Tag filter */}
                        {allTags.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto">
                                {activeTag && (
                                    <button onClick={() => setActiveTag(null)}
                                        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white border border-neutral-700 rounded-lg px-2 py-1.5 transition-all">
                                        <X className="w-3 h-3" />Clear
                                    </button>
                                )}
                                {allTags.map(t => (
                                    <button key={t} onClick={() => setActiveTag(activeTag === t ? null : t)}
                                        className={`text-[10px] font-medium px-2 py-1 rounded-md border whitespace-nowrap transition-all ${activeTag === t ? tagColor(t) : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:text-neutral-300'}`}>
                                        {t}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1 text-xs w-full sm:w-auto mt-2 sm:mt-0 sm:ml-auto">
                            <button onClick={() => setFilters(prev => [...prev, { id: Date.now().toString(), field: 'type', operator: '==', value: '' }])}
                                className="flex items-center gap-1 px-2.5 py-1 text-blue-400 hover:text-blue-300 font-medium transition-colors border-r border-neutral-700 mr-1 pr-3">
                                <Filter className="w-3.5 h-3.5" />+ Rule
                            </button>
                            <div className="flex items-center text-neutral-500 mr-0.5"><Filter className="w-3.5 h-3.5 ml-1 mr-1" />Sort</div>
                            {(['date', 'name', 'size'] as SortKey[]).map(k => (
                                <button key={k} onClick={() => setSortBy(k)}
                                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${sortBy === k ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>{k}</button>
                            ))}
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center gap-0.5 bg-neutral-900 border border-neutral-700 rounded-lg p-1 w-full sm:w-auto justify-center">
                            <button onClick={() => setViewMode('grid')} title="Grid view"
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setViewMode('list')} title="List view"
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <div className="w-px h-4 mx-1.5 bg-neutral-700" />
                            <div className="relative" ref={columnDropdownRef}>
                                <button onClick={() => setShowColumnDropdown(p => !p)} title="Columns"
                                    className={`p-1.5 rounded-md transition-all ${showColumnDropdown ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                    <Settings2 className="w-3.5 h-3.5" />
                                </button>
                                {showColumnDropdown && (
                                    <div className="absolute top-full right-0 mt-2 w-52 bg-neutral-900 border border-neutral-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                        <div className="px-3 py-2 border-b border-neutral-800 text-[10px] uppercase tracking-wider font-bold text-neutral-500 bg-neutral-800/50">Visible Columns</div>
                                        <div className="p-1.5 flex flex-col gap-0.5">
                                            {AVAILABLE_COLUMNS.map(col => (
                                                <label key={col.id} className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-neutral-800 rounded-lg cursor-pointer transition-colors group">
                                                    <div className="relative flex items-center justify-center">
                                                        <input type="checkbox" className="appearance-none w-4 h-4 rounded border border-neutral-600 bg-neutral-900 checked:bg-blue-500 checked:border-blue-500 focus:bg-white/5 transition-colors cursor-pointer"
                                                            checked={visibleColumns[col.id]} onChange={e => setVisibleColumns(p => ({ ...p, [col.id]: e.target.checked }))} />
                                                        {visibleColumns[col.id] && <Check className="absolute w-3 h-3 text-white pointer-events-none" />}
                                                    </div>
                                                    <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">{col.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="w-px h-4 mx-1.5 bg-neutral-700" />
                            <button onClick={() => setShowInspector(prev => !prev)} title="Toggle Inspector"
                                className={`p-1.5 rounded-md transition-all ${showInspector ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                <PanelRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Removed Bulk select toggle */}
                    </div>

                    {/* Advanced Filters Builder UI */}
                    {filters.length > 0 && (
                        <div className="flex flex-col gap-2 w-full mb-4 bg-neutral-900 overflow-hidden rounded-xl border border-neutral-800 animate-in fade-in slide-in-from-top-4 duration-200">
                            <div className="bg-neutral-800/50 px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                    <Filter className="w-3.5 h-3.5" /> Advanced Rules
                                </span>
                                <button onClick={() => setFilters([])} className="text-[10px] font-medium text-neutral-500 hover:text-red-400 uppercase tracking-wide transition-colors">Clear all</button>
                            </div>
                            <div className="p-3 flex flex-wrap gap-2.5">
                                {filters.map(f => (
                                    <div key={f.id} className="flex items-center bg-black/40 border border-neutral-700/60 rounded-lg text-sm shadow-sm ring-1 ring-white/5 overflow-hidden">
                                        <select value={f.field} onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, field: e.target.value as any } : x))} className="bg-neutral-800 text-white outline-none px-2 py-1.5 font-medium border-r border-neutral-700/60 cursor-pointer appearance-none">
                                            <option value="name">Name</option>
                                            <option value="type">Type</option>
                                            <option value="size">Size (MB)</option>
                                        </select>
                                        <select value={f.operator} onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, operator: e.target.value as any } : x))} className="bg-transparent text-neutral-400 outline-none px-2 py-1.5 cursor-pointer appearance-none border-r border-neutral-700/60 hover:text-white transition-colors">
                                            <option value="contains">contains</option>
                                            <option value="==">is exactly</option>
                                            {f.field === 'size' && <><option value=">">greater than</option><option value="<">less than</option></>}
                                        </select>
                                        <input type={f.field === 'size' ? "number" : "text"} value={f.value} onChange={e => setFilters(prev => prev.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))} placeholder="Value" className="w-24 bg-transparent px-2 py-1.5 text-white outline-none placeholder-neutral-600 focus:bg-white/5 transition-colors" />
                                        <button onClick={() => setFilters(prev => prev.filter(x => x.id !== f.id))} className="px-2 py-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors border-l border-neutral-700/60">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                        </div>
                    )}

                    {/* Empty */}
                    {!loading && structures.length === 0 && (
                        <div className="text-center py-20">
                            <Dna className="w-12 h-12 mx-auto mb-4 text-neutral-700" />
                            <p className="text-base font-medium text-neutral-400 mb-1">No structures yet</p>
                            <p className="text-sm text-neutral-600 mb-4">Upload a file or import by PDB ID above.</p>
                            <button onClick={() => fileInputRef.current?.click()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                                <Upload className="w-4 h-4" />Upload your first structure
                            </button>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && structures.length === 0 && (
                        <div className="text-center py-32 bg-neutral-900/50 border border-neutral-800 rounded-xl mt-4">
                            <Database className="w-12 h-12 mx-auto mb-4 text-neutral-700" />
                            <p className="text-[15px] font-medium text-neutral-300 mb-1">Your library is empty</p>
                            <p className="text-sm text-neutral-500 mb-6 max-w-sm mx-auto">Upload a molecular file or import from the RCSB database to get started.</p>
                            <div className="flex items-center justify-center gap-3">
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow shadow-blue-900/20">
                                    <Upload className="w-4 h-4" />Upload File
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Grid */}
                    {!loading && viewMode === 'grid' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 lg:gap-4">
                            {/* Render Subfolders */}
                            {activeSubfolders.map((sub: Collection) => (
                                <FolderCard key={sub.id} collection={sub} count={collectionCounts[sub.id] || 0} onOpen={() => setActiveCollection(sub.id)} onDropStructure={handleDropMove} onContextMenu={handleContextMenu} previews={structures.filter(s => s.collection_id === sub.id).slice(0, 3)} />
                            ))}

                            {/* Render Structures */}
                            {filtered.map(item => (
                                <StructureCard key={item.id} item={item}
                                    selected={selected.has(item.id)} onSelect={toggleSelect}
                                    onToggleStar={handleToggleStar} onDelete={handleDelete}
                                    onRename={handleRename} onNotesChange={handleNotesChange}
                                    onTagsChange={handleTagsChange} onDuplicate={handleDuplicate}
                                    onOpen={handleOpen} {...sharedCardProps} />
                            ))}

                            <button onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[280px] group">
                                <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-sm font-medium">Upload New Structure</span>
                                <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500">.pdb · .cif · .sdf · .mol</span>
                            </button>
                        </div>
                    )}

                    {/* List */}
                    {!loading && structures.length > 0 && viewMode === 'list' && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left table-fixed min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-neutral-800">
                                        <th className="px-4 py-3 w-8" />
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.name }}>
                                            Name
                                            <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('name', e)} />
                                        </th>
                                        {visibleColumns.type && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.type }}>
                                                Type
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('type', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.tags && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.tags }}>
                                                Tags
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('tags', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.size && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.size }}>
                                                Size
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('size', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.uploaded && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.uploaded }}>
                                                Uploaded
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('uploaded', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.resolution && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.resolution }}>
                                                Resolution
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('resolution', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.organism && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.organism }}>
                                                Organism
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('organism', e)} />
                                            </th>
                                        )}
                                        {visibleColumns.method && (
                                            <th className="px-3 py-3 text-xs font-medium text-neutral-500 relative group/th" style={{ width: columnWidths.method }}>
                                                Exp. Method
                                                <div className="absolute right-0 top-0 bottom-0 w-1 flex items-center justify-center cursor-col-resize hover:bg-blue-500 transition-colors z-10" onMouseDown={e => handleResize('method', e)} />
                                            </th>
                                        )}
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Render Subfolders inline in table */}
                                    {activeSubfolders.map((sub: Collection) => (
                                        <FolderRow key={sub.id} collection={sub} count={collectionCounts[sub.id] || 0} onOpen={() => setActiveCollection(sub.id)} onDropStructure={handleDropMove} onContextMenu={handleContextMenu} visibleColumns={visibleColumns} />
                                    ))}

                                    {/* Render Structures */}
                                    {filtered.map(item => (
                                        <StructureRow key={item.id} item={item}
                                            selected={selected.has(item.id)} onSelect={toggleSelect}
                                            onToggleStar={handleToggleStar} onDelete={handleDelete}
                                            onRename={handleRename} onMove={setMovingStructure} onOpen={handleOpen} openingId={openingId} onContextMenu={handleContextMenu} visibleColumns={visibleColumns} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && structures.length > 0 && filtered.length === 0 && (
                        <p className="text-center text-neutral-500 text-sm py-8">No structures match your filter.</p>
                    )}

                    {!loading && structures.length > 0 && selected.size === 0 && (
                        <p className="text-xs text-neutral-600 text-center">
                            💡 Click a name to rename · Add tags and notes · Files auto-save when uploaded in the viewer
                        </p>
                    )}

                </div> {/* end main content */}

                {/* Inspector Pane Container - Responsive overlay on mobile */}
                <div className={`
                    fixed xl:relative inset-y-0 right-0 z-[100] xl:z-auto 
                    bg-neutral-900 border-l border-neutral-800 
                    transform transition-all duration-300 ease-out flex flex-col pt-14 xl:pt-0
                    ${showInspector ? 'translate-x-0 w-80 shadow-2xl xl:shadow-none' : 'translate-x-[100%] xl:translate-x-0 w-0 pointer-events-none xl:pointer-events-auto overflow-hidden hidden'}
                    xl:rounded-2xl h-screen xl:h-[calc(100vh-140px)] xl:top-6 sticky
                `}>
                    {showInspector && (
                        <div className="w-80 h-full overflow-y-auto custom-scrollbar bg-neutral-900 xl:bg-transparent">
                            <InspectorPane
                                item={selected.size === 1 ? structures.find(s => s.id === Array.from(selected)[0]) || null : null}
                                selectionCount={selected.size}
                                onClose={() => setShowInspector(false)}
                                onNotesChange={handleNotesChange}
                                onRestore={handleRestore}
                                onDelete={handleDelete}
                            />
                        </div>
                    )}
                </div>

                {/* Mobile Backdrop for Inspector */}
                <div
                    className={`xl:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${showInspector ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setShowInspector(false)}
                />
            </div> {/* end flex layout */}

            {/* Quick Look Modal */}
            {quickLookId && (
                <QuickLookModal
                    item={structures.find(s => s.id === quickLookId)!}
                    onClose={() => setQuickLookId(null)}
                    onOpen={(s) => { setQuickLookId(null); handleOpen(s); }}
                />
            )}

            {/* Bulk action floating bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-800 border border-neutral-600 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50">
                    <span className="text-sm font-medium text-white">{selected.size} selected</span>
                    <div className="w-px h-4 bg-neutral-600" />
                    {activeCollection === '__trash__' ? (
                        <>
                            <button onClick={handleBulkRestore}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all">
                                <FolderInput className="w-4 h-4" />Restore all
                            </button>
                            <button onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />Delete permanently
                            </button>
                        </>
                    ) : (
                        <>
                            {selected.size >= 2 && selected.size <= 4 && (
                                <button onClick={handleCompareInMultiview}
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all">
                                    <Layers className="w-4 h-4" />Compare in Viewer
                                </button>
                            )}
                            <button onClick={handleBulkDownload}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:bg-neutral-700 rounded-lg transition-all">
                                <Download className="w-4 h-4" />Download all
                            </button>
                            <button onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />Move to Trash
                            </button>
                        </>
                    )}
                    <button onClick={deselectAll} className="p-1.5 text-neutral-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {/* Move Modal */}
            {movingStructure && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-neutral-800 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-sm font-semibold text-white">Move Structure</h3>
                                <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">{movingStructure.name}</p>
                            </div>
                            <button onClick={() => setMovingStructure(null)} className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-2 overflow-y-auto flex-1 custom-scrollbar">
                            <button onClick={() => handleMoveConfirm(null)}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none mb-1 text-left
                                    ${movingStructure.collection_id === null ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-neutral-300 hover:bg-neutral-800/50'}`}>
                                <Database className="w-4 h-4 shrink-0" />
                                <span className="flex-1">Library Overview</span>
                                {movingStructure.collection_id === null && <Check className="w-4 h-4 text-blue-400" />}
                            </button>

                            {/* Flat rendered list indicating nesting depth */}
                            {mappedCollections.map(c => {
                                let depth = 0;
                                let parent = c.parent_id;
                                while (parent) {
                                    depth++;
                                    const p = mappedCollections.find(x => x.id === parent);
                                    parent = p?.parent_id || null;
                                }

                                const isCurrent = movingStructure.collection_id === c.id;
                                return (
                                    <button key={c.id} onClick={() => handleMoveConfirm(c.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all focus:outline-none text-left
                                            ${isCurrent ? 'bg-blue-500/10 text-blue-400 font-medium' : 'text-neutral-300 hover:bg-neutral-800/50'}`}
                                        style={{ paddingLeft: `${depth * 16 + 12}px` }}>
                                        <Folder className="w-4 h-4 shrink-0 opacity-50" />
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${DOT[c.color] ?? 'bg-neutral-400'}`} />
                                        <span className="flex-1 truncate">{c.name}</span>
                                        {isCurrent && <Check className="w-4 h-4 text-blue-400" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-neutral-800 flex justify-end gap-2 shrink-0 bg-neutral-900/50 rounded-b-2xl">
                            <button onClick={() => setMovingStructure(null)}
                                className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
                                Cancel
                            </button>
                            {/* Disabled: The user has to click a row to instantly move, so explicit Move button is purely visual/optional */}
                        </div>
                    </div>
                </div>
            )}

            {/* Global Context Menu Render */}
            {contextMenu && (
                <div
                    className="fixed z-[100] w-48 bg-neutral-900 border border-neutral-700/60 rounded-xl shadow-2xl shadow-black overflow-hidden flex flex-col py-1 text-[13px] font-medium animate-in fade-in zoom-in duration-150"
                    style={{
                        left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
                        top: `${Math.min(contextMenu.y, window.innerHeight - 250)}px`
                    }}
                >
                    {contextMenu.type === 'structure' ? (
                        <>
                            {activeCollection === '__trash__' ? (
                                <>
                                    <button onClick={() => { handleRestore(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-blue-400 hover:text-white hover:bg-blue-500/10 text-left">
                                        <FolderInput className="w-4 h-4" /> Restore
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1 mx-2" />
                                    <button onClick={() => { handleDelete(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 text-left">
                                        <Trash2 className="w-4 h-4" /> Delete Permanently
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { handleOpen(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-blue-500/20 text-left">
                                        <ExternalLink className="w-4 h-4 text-blue-400" /> Open in Viewer
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1 mx-2" />
                                    <button onClick={() => { setOpeningId("rename-" + contextMenu.item.id); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 text-left">
                                        <Pencil className="w-4 h-4" /> Rename...
                                    </button>
                                    <button onClick={() => { setMovingStructure(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 text-left">
                                        <FolderInput className="w-4 h-4" /> Move to...
                                    </button>
                                    <button onClick={() => { handleDuplicate(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 text-left">
                                        <Copy className="w-4 h-4" /> Duplicate
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1 mx-2" />
                                    <button onClick={async () => {
                                        const url = await getDownloadUrl(contextMenu.item.file_path);
                                        const a = document.createElement('a'); a.href = url; a.download = `${contextMenu.item.name}.${contextMenu.item.file_type.toLowerCase()}`; a.click();
                                        setContextMenu(null);
                                    }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 text-left">
                                        <Download className="w-4 h-4" /> Download File
                                    </button>
                                    <div className="h-px bg-neutral-800 my-1 mx-2" />
                                    <button onClick={() => { handleDelete(contextMenu.item); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 text-left">
                                        <Trash2 className="w-4 h-4" /> Move to Trash
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <button onClick={() => { setActiveCollection(contextMenu.item.id); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 text-left">
                                <Folder className="w-4 h-4 text-blue-400" /> Open Folder
                            </button>
                            <button onClick={async () => {
                                try {
                                    const isPublic = !contextMenu.item.is_public;
                                    await toggleCollectionPublic(contextMenu.item.id, isPublic);
                                    setCollections(prev => prev.map(c => c.id === contextMenu.item.id ? { ...c, is_public: isPublic } : c));
                                    if (isPublic) {
                                        const url = `${window.location.origin}/share/${contextMenu.item.id}`;
                                        await navigator.clipboard.writeText(url);
                                        alert(`Public link copied to clipboard!\n${url}`);
                                    }
                                } catch (e: any) {
                                    setError(e.message || 'Failed to update visibility');
                                } finally {
                                    setContextMenu(null);
                                }
                            }} className="flex items-center gap-2.5 px-3 py-1.5 text-blue-400 hover:text-white hover:bg-neutral-800 text-left font-medium">
                                <Globe className="w-4 h-4" /> {contextMenu.item.is_public ? 'Make Private' : 'Share Public Link'}
                            </button>
                            <button onClick={() => { handleTogglePin(contextMenu.item.id); setContextMenu(null); }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 text-left">
                                <Pin className={`w-4 h-4 ${pinnedCollectionIds.includes(contextMenu.item.id) ? 'text-blue-400 rotate-45' : 'text-neutral-500'}`} />
                                {pinnedCollectionIds.includes(contextMenu.item.id) ? 'Unpin from Quick Access' : 'Pin to Quick Access'}
                            </button>
                            <div className="h-px bg-neutral-800 my-1 mx-2" />

                            {/* Color Tag Picker row */}
                            <div className="px-3 py-2 flex gap-1.5 flex-wrap items-center">
                                <Tag className="w-3.5 h-3.5 text-neutral-500 mr-1" />
                                {Object.keys(COLOR_CLASSES).map(colorKey => (
                                    <button
                                        key={colorKey}
                                        onClick={(e) => { e.stopPropagation(); handleSetFolderColor(contextMenu.item.id, colorKey); setContextMenu(null); }}
                                        className={`w-4 h-4 rounded-full shadow-sm hover:scale-125 transition-transform ${DOT[colorKey] || 'bg-neutral-500'} ${contextMenu.item.color === colorKey ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900 pointer-events-none' : 'border border-neutral-800'}`}
                                        title={colorKey.charAt(0).toUpperCase() + colorKey.slice(1)}
                                    />
                                ))}
                            </div>

                            <div className="h-px bg-neutral-800 my-1 mx-2" />
                            <button onClick={async () => {
                                try {
                                    if (!user?.id) return;
                                    // 1. Get all structures inside this folder
                                    const { listStructures } = await import('../../lib/structuresService');
                                    // listStructures takes userId
                                    const folderStructures = await listStructures(user.id);

                                    // We need to filter them locally since listStructures doesn't take folder ID officially in the current sig
                                    const filtered = folderStructures.filter(s => s.collection_id === contextMenu.item.id);

                                    if (filtered.length === 0) {
                                        setError('This folder is empty.');
                                    } else {
                                        // 2. Pass them to exportAllAsZip
                                        await exportAllAsZip(filtered);
                                    }
                                } catch (e: any) {
                                    setError(e.message || 'Failed to download folder');
                                } finally {
                                    setContextMenu(null);
                                }
                            }} className="flex items-center gap-2.5 px-3 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 text-left">
                                <Download className="w-4 h-4" /> Download ZIP
                            </button>
                            <div className="h-px bg-neutral-800 my-1 mx-2" />
                            <button onClick={() => {
                                if (!confirm('This will delete the folder. Its items will become uncategorized. Proceed?')) return;
                                deleteCollection(contextMenu.item.id).then(() => {
                                    setCollections(prev => prev.filter(c => c.id !== contextMenu.item.id));
                                    if (activeCollection === contextMenu.item.id) setActiveCollection(null);
                                });
                                setContextMenu(null);
                            }} className="flex items-center gap-2.5 px-3 py-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 text-left">
                                <Trash2 className="w-4 h-4" /> Delete Folder
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Inspector Pane ────────────────────────────────────────────────

function InspectorPane({ item, selectionCount, onClose, onNotesChange, onRestore, onDelete }: {
    item: Structure | null;
    selectionCount: number;
    onClose: () => void;
    onNotesChange: (id: string, notes: string) => void;
    onRestore: (s: Structure) => void;
    onDelete: (s: Structure) => void;
}) {
    const [draftNotes, setDraftNotes] = useState('');

    useEffect(() => {
        if (item) setDraftNotes(item.notes || '');
    }, [item?.id]);

    if (!item) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-neutral-500">
                <PanelRight className="w-12 h-12 mb-4 opacity-20" />
                <h3 className="font-medium text-neutral-400 mb-1">Inspector</h3>
                <p className="text-sm">
                    {selectionCount === 0
                        ? "Select a single file to view its details."
                        : `${selectionCount} files selected.`}
                </p>
                {selectionCount > 1 && <p className="text-xs mt-2 opacity-70">Bulk editing is available in the bottom bar.</p>}
            </div>
        );
    }

    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0 sticky top-0 bg-neutral-900/90 backdrop-blur-md">
                <h3 className="font-semibold text-white capitalize">Get Info</h3>
                <button onClick={onClose} className="p-1 rounded-md text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="flex-1 p-4 space-y-6">

                {/* Header section */}
                <div>
                    <h2 className="text-lg font-bold text-neutral-200 leading-tight mb-2 break-words">{item.name}</h2>
                    <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badge}`}>{item.file_type.toUpperCase()}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md border border-neutral-700 bg-neutral-800 text-neutral-400">{formatBytes(item.file_size)}</span>
                    </div>
                </div>

                {/* Notes Editor */}
                <div>
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        Notes
                        {draftNotes !== (item.notes || '') && <span className="text-[10px] text-blue-400 lowercase italic normal-case">Unsaved changes</span>}
                    </h4>
                    <textarea
                        value={draftNotes}
                        onChange={e => setDraftNotes(e.target.value)}
                        onBlur={() => {
                            const t = draftNotes.trim();
                            if (t !== (item.notes || '')) onNotesChange(item.id, t);
                        }}
                        placeholder="Add notes, context, or observations..."
                        className="w-full h-32 bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 resize-y transition-colors"
                    />
                </div>

                {/* Tags Read-only view (for now) */}
                {(item.tags ?? []).length > 0 && (
                    <div>
                        <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-1">
                            {item.tags.map(t => (
                                <span key={t} className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Metadata */}
                <div>
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-3 bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                        <div>
                            <p className="text-[10px] text-neutral-600 mb-0.5">Uploaded</p>
                            <p className="text-xs text-neutral-300 font-medium">{timeAgo(item.created_at)}</p>
                        </div>
                        {item.metadata?.resolution != null && (
                            <div>
                                <p className="text-[10px] text-neutral-600 mb-0.5">Resolution</p>
                                <p className="text-xs text-neutral-300 font-medium">{item.metadata.resolution.toFixed(2)} Å</p>
                            </div>
                        )}
                        {item.metadata?.method && (
                            <div className="col-span-2">
                                <p className="text-[10px] text-neutral-600 mb-0.5">Exp. Method</p>
                                <p className="text-xs text-neutral-300 font-medium">{item.metadata.method}</p>
                            </div>
                        )}
                        {item.metadata?.organism && (
                            <div className="col-span-2">
                                <p className="text-[10px] text-neutral-600 mb-0.5">Organism</p>
                                <p className="text-xs text-neutral-300 font-medium">{item.metadata.organism}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Activity stats */}
                <div>
                    <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Activity Tracker</h4>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                            <Star className={`w-4 h-4 mb-1 ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600'}`} />
                            <p className="text-xs text-neutral-400">{item.starred ? 'Starred' : 'Not Starred'}</p>
                        </div>
                        <div className="flex flex-col items-center flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                            <Eye className="w-4 h-4 mb-1 text-blue-400" />
                            <p className="text-xs text-neutral-400">{item.view_count || 0} Opens</p>
                        </div>
                    </div>
                </div>

                {/* Trash Actions */}
                {item.metadata?.is_deleted && (
                    <div className="pt-2">
                        <h4 className="text-[11px] font-bold text-red-500/80 uppercase tracking-wider mb-2">Trash Actions</h4>
                        <div className="flex gap-2">
                            <button onClick={() => onRestore(item)} className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 py-2 rounded-xl text-sm font-medium transition-colors">
                                <FolderInput className="w-4 h-4" /> Restore
                            </button>
                            <button onClick={() => onDelete(item)} className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 py-2 rounded-xl text-sm font-medium transition-colors">
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
