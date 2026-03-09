import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Plus, Star, Clock, Search, Upload, Dna, Trash2, ExternalLink,
    Loader2, AlertCircle, Download, Check, Pencil, Share2,
    FileText, Filter, List, LayoutGrid, Database, NotebookPen,
    ChevronDown, ChevronUp, Import, Tag, Copy, X, Square, CheckSquare,
    Layers, Beaker, Microscope, Globe, Eye, Folder, ChevronRight, FolderInput
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
    listStructures, uploadStructure, toggleStar, deleteStructure,
    renameStructure, updateNotes, updateTags, importFromRCSB,
    duplicateStructure, getDownloadUrl, exportAllAsZip,
    listCollections, incrementViewCount, logActivity,
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
                    <span key={t} className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>
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
                                className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all hover:opacity-90 ${p.color}`}>
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
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-xs font-mono text-white/80 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md">{rcsbId}</span>
                </div>
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

// ── Folder card ───────────────────────────────────────────────────

function FolderCard({ collection, count, onOpen }: { collection: Collection, count: number, onOpen: () => void }) {
    return (
        <button onClick={onOpen}
            className="flex flex-col bg-neutral-900/80 border border-neutral-800 hover:border-neutral-600 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/30 group text-left">
            <div className={`h-1.5 w-full ${DOT[collection.color] ?? 'bg-blue-500'}`} />
            <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-neutral-800 group-hover:bg-neutral-700 transition-colors">
                    <Folder className={`w-5 h-5 ${COLOR_CLASSES[collection.color]?.split(' ')[0] ?? 'text-blue-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-neutral-200 text-sm truncate group-hover:text-white">{collection.name}</h3>
                    <p className="text-xs text-neutral-500">{count} items</p>
                </div>
            </div>
        </button>
    );
}

// ── Folder row ───────────────────────────────────────────────────

function FolderRow({ collection, count, onOpen }: { collection: Collection, count: number, onOpen: () => void }) {
    return (
        <tr className="group border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors cursor-pointer"
            onClick={onOpen}>
            <td className="px-4 py-3 w-8">
                <div className="w-4 h-4" /> {/* Spacer for checkbox col */}
            </td>
            <td className="px-3 py-3 relative">
                <div className="flex items-center gap-3">
                    <Folder className={`w-4 h-4 ${COLOR_CLASSES[collection.color]?.split(' ')[0] ?? 'text-blue-400'} shrink-0`} />
                    <span className="text-sm font-medium text-neutral-200 group-hover:text-white truncate">{collection.name}</span>
                </div>
            </td>
            <td className="px-3 py-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-neutral-800 text-neutral-400 border-neutral-700">Folder</span>
            </td>
            <td className="px-3 py-3 text-xs text-neutral-500">-</td>
            <td className="px-3 py-3 text-xs text-neutral-500">{count === 1 ? '1 item' : `${count} items`}</td>
            <td className="px-3 py-3 text-xs text-neutral-500">-</td>
            <td className="px-3 py-3"></td>
        </tr>
    );
}

// ── Structure card ────────────────────────────────────────────────

interface CardProps {
    item: Structure;
    selected: boolean;
    selectMode: boolean;
    onSelect: (id: string) => void;
    onToggleStar: (s: Structure) => void;
    onDelete: (s: Structure) => void;
    onRename: (id: string, name: string) => void;
    onNotesChange: (id: string, notes: string) => void;
    onTagsChange: (id: string, tags: string[]) => void;
    onDuplicate: (s: Structure) => void;
    onMove: (s: Structure) => void;
    onOpen: (s: Structure) => void;
    openingId: string | null;
    duplicatingId: string | null;
}

function StructureCard({
    item, selected, selectMode, onSelect,
    onToggleStar, onDelete, onRename, onNotesChange, onTagsChange,
    onDuplicate, onMove, onOpen, openingId, duplicatingId
}: CardProps) {
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);
    const [showNotes, setShowNotes] = useState(false);
    const [draftNotes, setDraftNotes] = useState(item.notes ?? '');
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Derive RCSB ID from name (4-char PDB format) or metadata
    const rcsbId = item.name.match(/^[1-9][A-Z0-9]{3}$/i)?.[0]?.toUpperCase();
    const hasThumbnail = !!(rcsbId && item.metadata);

    useEffect(() => { setDraftName(item.name); }, [item.name]);
    useEffect(() => { setDraftNotes(item.notes ?? ''); }, [item.notes]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    const commitRename = () => {
        setEditing(false);
        const t = draftName.trim();
        if (t && t !== item.name) onRename(item.id, t);
        else setDraftName(item.name);
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
            onClick={() => selectMode && onSelect(item.id)}
            onMouseEnter={() => !selectMode && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Hover preview popover (escapes bounds) */}
            {hovered && !selectMode && <HoverPreview item={item} />}

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
                    <div className={`h-1 w-full bg-gradient-to-r ${strip}`} />
                )}

                {/* Select checkbox */}
                {selectMode && (
                    <div className="absolute top-3 left-3 z-10">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                        ${selected ? 'bg-blue-500 border-blue-500' : 'bg-neutral-800 border-neutral-600 hover:border-blue-400'}`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                )}

                <div className={`p-5 flex flex-col flex-1 ${selectMode ? 'cursor-pointer' : ''}`}>
                    {/* Top row */}
                    <div className={`flex items-start justify-between mb-3 ${selectMode ? 'pl-6' : ''}`}>
                        <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                                <Dna className="w-4 h-4 text-white/50" />
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
                        </div>
                        {!selectMode && (
                            <button onClick={() => onToggleStar(item)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <Star className={`w-4 h-4 transition-all ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                            </button>
                        )}
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
                        <button onClick={e => { e.stopPropagation(); if (!selectMode) setEditing(true); }}
                            className="group/name flex items-center gap-1.5 text-left mb-1 w-full min-w-0" title="Click to rename">
                            <span className="text-sm font-semibold text-neutral-100 truncate">{item.name}</span>
                            {!selectMode && <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/name:opacity-100 transition-all shrink-0" />}
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
                    {!selectMode && (
                        <TagEditor
                            tags={item.tags ?? []}
                            onChange={tags => onTagsChange(item.id, tags)}
                        />
                    )}
                    {selectMode && item.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {item.tags.map(t => (
                                <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                            ))}
                        </div>
                    )}

                    {/* Notes */}
                    {!selectMode && (
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
                    )}

                    {/* Action bar */}
                    {!selectMode && (
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
                    )}
                </div>
            </div>
        </div>
    );
}

// ── List row ──────────────────────────────────────────────────────

function StructureRow({ item, selected, selectMode, onSelect, onToggleStar, onDelete, onRename, onOpen, onMove, openingId }: Pick<CardProps,
    'item' | 'selected' | 'selectMode' | 'onSelect' | 'onToggleStar' | 'onDelete' | 'onRename' | 'onOpen' | 'onMove' | 'openingId'>) {

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

    return (
        <tr className={`group border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors cursor-pointer
            ${selected ? 'bg-blue-500/5' : ''}`}
            onClick={() => selectMode && onSelect(item.id)}>
            <td className="px-4 py-3 w-8">
                {selectMode && (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected ? 'bg-blue-500 border-blue-500' : 'border-neutral-600 hover:border-blue-400'}`}>
                        {selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                )}
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
                            {!selectMode && <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/n:opacity-100 shrink-0" />}
                        </button>
                    )}
                </div>
            </td>
            <td className="px-3 py-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
            </td>
            <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                    {(item.tags ?? []).map(t => (
                        <span key={t} className={`text-[9px] font-medium px-1.5 py-0.5 rounded-md border ${tagColor(t)}`}>{t}</span>
                    ))}
                </div>
            </td>
            <td className="px-3 py-3 text-xs text-neutral-500">{formatBytes(item.file_size)}</td>
            <td className="px-3 py-3 text-xs text-neutral-500">{timeAgo(item.created_at)}</td>
            <td className="px-3 py-3">
                {!selectMode && (
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
                )}
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

    // Bulk select
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Collections
    const [collections, setCollections] = useState<Collection[]>([]);
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = '';
        setUploading(true);
        try {
            const s = await uploadStructure(file, user.id);
            setStructures(prev => [s, ...prev]);
        }
        catch (ex: any) { setError(ex.message ?? 'Upload failed'); }
        finally { setUploading(false); }
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
        if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
        setStructures(prev => prev.filter(x => x.id !== s.id));
        try { await deleteStructure(s.id, s.file_path); }
        catch (ex: any) { setError(ex.message ?? 'Delete failed'); reload(); }
    };

    const handleDuplicate = async (s: Structure) => {
        if (!user) return;
        setDuplicatingId(s.id);
        try { const copy = await duplicateStructure(s, user.id); setStructures(prev => [copy, ...prev]); }
        catch (ex: any) { setError(ex.message ?? 'Duplicate failed'); }
        finally { setDuplicatingId(null); }
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

    // Bulk actions
    const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const selectAll = () => setSelected(new Set(filtered.map(s => s.id)));
    const deselectAll = () => setSelected(new Set());
    const cancelSelect = () => { setSelectMode(false); setSelected(new Set()); };

    const handleBulkDelete = async () => {
        const ids = [...selected];
        if (!confirm(`Delete ${ids.length} structure${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
        const toDelete = structures.filter(s => ids.includes(s.id));
        setStructures(prev => prev.filter(s => !ids.includes(s.id)));
        setSelected(new Set());
        setSelectMode(false);
        for (const s of toDelete) {
            try { await deleteStructure(s.id, s.file_path); } catch { /* best effort */ }
        }
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
    for (const c of collections) collectionCounts[c.id] = structures.filter(s => s.collection_id === c.id).length;
    const uncategorizedCount = structures.filter(s => !s.collection_id).length;

    // Hierarchy computations
    const currentBreadcrumbs = useMemo(() => {
        if (!activeCollection || activeCollection === '__none__') return [];
        const path: Collection[] = [];
        let currId: string | null = activeCollection;
        while (currId) {
            const col = collections.find(c => c.id === currId);
            if (!col) break;
            path.unshift(col);
            currId = col.parent_id || null;
        }
        return path;
    }, [activeCollection, collections]);

    const activeSubfolders = useMemo(() => {
        if (activeCollection === '__none__') return [];
        return collections.filter(c => c.parent_id === activeCollection);
    }, [activeCollection, collections]);

    const handleCompareInMultiview = async () => {
        if (!user) return;
        const toCompare = structures.filter(s => selected.has(s.id)).slice(0, 4);
        const items = await Promise.all(toCompare.map(async s => {
            const url = await getDownloadUrl(s.file_path);
            return { url, name: s.name, fileType: s.file_type.toLowerCase() };
        }));
        sessionStorage.setItem('pendingStructures', JSON.stringify(items));
        navigate('/');
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

    // Filtering + sorting
    let filtered = structures.filter(s => {
        if (showStarred && !s.starred) return false;
        if (activeTag && !(s.tags ?? []).includes(activeTag)) return false;
        if (activeCollection === '__none__' && s.collection_id) return false;
        if (activeCollection && activeCollection !== '__none__' && s.collection_id !== activeCollection) return false;
        return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size') filtered = [...filtered].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));

    const sharedCardProps = { openingId, duplicatingId, onMove: setMovingStructure };

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-24 px-2">
            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} className="hidden" onChange={handleFileChange} />

            {/* Main layout with collections sidebar */}
            <div className="flex gap-2 sm:gap-6 relative">

                {/* Error floating */}
                {error && (
                    <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm shadow-xl shadow-black/50 backdrop-blur-md">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                        <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
                    </div>
                )}

                {/* Collections sidebar */}
                {!loading && user && (
                    <div className="hidden sm:block">
                        <FolderTreeSidebar
                            userId={user.id}
                            collections={collections}
                            activeCollection={activeCollection}
                            counts={collectionCounts}
                            uncategorizedCount={uncategorizedCount}
                            onSelect={setActiveCollection}
                            onCreated={c => setCollections(prev => [...prev, c])}
                            onRenamed={(id, name) => setCollections(prev => prev.map(c => c.id === id ? { ...c, name } : c))}
                            onDeleted={id => setCollections(prev => prev.filter(c => c.id !== id))}
                        />
                    </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0 flex flex-col pt-2">
                    {/* Breadcrumbs Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 min-h-[32px]">
                        {!loading && (
                            <div className="flex items-center gap-2 text-[15px] font-medium text-neutral-400 px-1 overflow-x-auto whitespace-nowrap hide-scrollbar">
                                <button onClick={() => setActiveCollection(null)} className="hover:text-white transition-colors">Projects</button>
                                {activeCollection && activeCollection !== '__none__' ? currentBreadcrumbs.map((crumb: Collection, idx: number) => (
                                    <React.Fragment key={crumb.id}>
                                        <span className="text-neutral-600">/</span>
                                        <button
                                            onClick={() => setActiveCollection(crumb.id)}
                                            className={idx === currentBreadcrumbs.length - 1 ? "text-neutral-200" : "hover:text-white transition-colors"}
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
                        <div className="relative flex-1 min-w-[140px] max-w-xs">
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

                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1 text-xs ml-auto">
                            <Filter className="w-3.5 h-3.5 text-neutral-500 ml-1 mr-0.5" />
                            {(['date', 'name', 'size'] as SortKey[]).map(k => (
                                <button key={k} onClick={() => setSortBy(k)}
                                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${sortBy === k ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>{k}</button>
                            ))}
                        </div>

                        {/* View toggle */}
                        <div className="flex items-center gap-0.5 bg-neutral-900 border border-neutral-700 rounded-lg p-1">
                            <button onClick={() => setViewMode('grid')} title="Grid view"
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setViewMode('list')} title="List view"
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
                                <List className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Bulk select toggle */}
                        {!selectMode ? (
                            <button onClick={() => setSelectMode(true)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-neutral-400 bg-neutral-900 border border-neutral-700 rounded-lg hover:text-white hover:border-neutral-600 transition-all">
                                <Square className="w-3.5 h-3.5" />Select
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                <button onClick={selected.size === filtered.length ? deselectAll : selectAll}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-all">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
                                </button>
                                <button onClick={cancelSelect} className="p-2 text-neutral-500 hover:text-white rounded-lg border border-neutral-700 hover:border-neutral-600 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Render Subfolders */}
                            {activeSubfolders.map((sub: Collection) => (
                                <FolderCard key={sub.id} collection={sub} count={collectionCounts[sub.id] || 0} onOpen={() => setActiveCollection(sub.id)} />
                            ))}

                            {/* Render Structures */}
                            {filtered.map(item => (
                                <StructureCard key={item.id} item={item}
                                    selected={selected.has(item.id)} selectMode={selectMode} onSelect={toggleSelect}
                                    onToggleStar={handleToggleStar} onDelete={handleDelete}
                                    onRename={handleRename} onNotesChange={handleNotesChange}
                                    onTagsChange={handleTagsChange} onDuplicate={handleDuplicate}
                                    onOpen={handleOpen} {...sharedCardProps} />
                            ))}

                            {!selectMode && (
                                <button onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[280px] group">
                                    <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium">Upload New Structure</span>
                                    <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500">.pdb · .cif · .sdf · .mol</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* List */}
                    {!loading && structures.length > 0 && viewMode === 'list' && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-neutral-800">
                                        <th className="px-4 py-3 w-8" />
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Name</th>
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Type</th>
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Tags</th>
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Size</th>
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Uploaded</th>
                                        <th className="px-3 py-3 text-xs font-medium text-neutral-500">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Render Subfolders inline in table */}
                                    {activeSubfolders.map((sub: Collection) => (
                                        <FolderRow key={sub.id} collection={sub} count={collectionCounts[sub.id] || 0} onOpen={() => setActiveCollection(sub.id)} />
                                    ))}

                                    {/* Render Structures */}
                                    {filtered.map(item => (
                                        <StructureRow key={item.id} item={item}
                                            selected={selected.has(item.id)} selectMode={selectMode} onSelect={toggleSelect}
                                            onToggleStar={handleToggleStar} onDelete={handleDelete}
                                            onRename={handleRename} onMove={setMovingStructure} onOpen={handleOpen} openingId={openingId} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {!loading && structures.length > 0 && filtered.length === 0 && (
                        <p className="text-center text-neutral-500 text-sm py-8">No structures match your filter.</p>
                    )}

                    {!loading && structures.length > 0 && !selectMode && (
                        <p className="text-xs text-neutral-600 text-center">
                            💡 Click a name to rename · Add tags and notes · Files auto-save when uploaded in the viewer
                        </p>
                    )}

                </div> {/* end main content */}
            </div> {/* end flex layout */}

            {/* Bulk action floating bar */}
            {selectMode && selected.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-800 border border-neutral-600 rounded-2xl px-5 py-3 shadow-2xl shadow-black/50">
                    <span className="text-sm font-medium text-white">{selected.size} selected</span>
                    <div className="w-px h-4 bg-neutral-600" />
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
                        <Trash2 className="w-4 h-4" />Delete all
                    </button>
                    <button onClick={cancelSelect} className="p-1.5 text-neutral-500 hover:text-white transition-colors">
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
                            {collections.map(c => {
                                let depth = 0;
                                let parent = c.parent_id;
                                while (parent) {
                                    depth++;
                                    const p = collections.find(x => x.id === parent);
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
        </div>
    );
}
