import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Star, Clock, Search, Upload, Dna, Trash2, ExternalLink,
    Loader2, AlertCircle, Download, Check, Pencil, Share2,
    FileText, Filter, List, LayoutGrid, Database, NotebookPen,
    ChevronDown, ChevronUp, Import
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
    listStructures,
    uploadStructure,
    toggleStar,
    deleteStructure,
    renameStructure,
    updateNotes,
    importFromRCSB,
    getDownloadUrl,
    type Structure,
} from '../../lib/structuresService';

const ACCEPTED_EXTS = '.pdb,.cif,.mmcif,.sdf,.mol';

function formatBytes(bytes: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

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

// ─── Structure Card (Grid view) ───────────────────────────────────

interface CardProps {
    item: Structure;
    onToggleStar: (s: Structure) => void;
    onDelete: (s: Structure) => void;
    onRename: (id: string, name: string) => void;
    onNotesChange: (id: string, notes: string) => void;
    onOpen: (s: Structure) => void;
    openingId: string | null;
}

function StructureCard({ item, onToggleStar, onDelete, onRename, onNotesChange, onOpen, openingId }: CardProps) {
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);
    const [showNotes, setShowNotes] = useState(false);
    const [draftNotes, setDraftNotes] = useState(item.notes ?? '');
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

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
            a.href = url;
            a.download = `${item.name}.${item.file_type.toLowerCase()}`;
            a.click();
        } catch { /* ignore */ } finally { setDownloading(false); }
    };

    const strip = TYPE_STRIP[item.file_type] ?? 'from-neutral-500 to-neutral-700';
    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';

    return (
        <div className="group bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-600 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 flex flex-col">
            {/* Gradient strip */}
            <div className={`h-1 w-full bg-gradient-to-r ${strip}`} />

            <div className="p-5 flex flex-col flex-1">
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                            <Dna className="w-4.5 h-4.5 text-white/50" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span>
                    </div>
                    <button onClick={() => onToggleStar(item)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                        <Star className={`w-4 h-4 transition-all ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                    </button>
                </div>

                {/* Name */}
                {editing ? (
                    <input
                        ref={inputRef}
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(item.name); } }}
                        className="text-sm font-semibold text-white bg-neutral-800 border border-blue-500/60 rounded-lg px-2.5 py-1 w-full outline-none focus:ring-1 focus:ring-blue-500 mb-1"
                    />
                ) : (
                    <button onClick={() => setEditing(true)} className="group/name flex items-center gap-1.5 text-left mb-1 w-full min-w-0" title="Click to rename">
                        <span className="text-sm font-semibold text-neutral-100 truncate">{item.name}</span>
                        <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/name:opacity-100 transition-all shrink-0" />
                    </button>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-3 text-xs text-neutral-500 mb-4">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{formatBytes(item.file_size)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(item.created_at)}</span>
                </div>

                {/* Notes section */}
                <div className="mb-4">
                    <button
                        onClick={() => setShowNotes(p => !p)}
                        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-1.5"
                    >
                        <NotebookPen className="w-3 h-3" />
                        {draftNotes ? 'Notes' : 'Add notes'}
                        {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showNotes && (
                        <textarea
                            value={draftNotes}
                            onChange={e => setDraftNotes(e.target.value)}
                            onBlur={() => { if (draftNotes !== (item.notes ?? '')) onNotesChange(item.id, draftNotes); }}
                            placeholder="E.g. wild-type structure from PDB, used in paper doi:10.1234/..."
                            rows={3}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    )}
                </div>

                {/* Action bar */}
                <div className="mt-auto grid grid-cols-4 gap-1.5">
                    <button onClick={() => onOpen(item)} disabled={!!openingId} title="Open in 3D Viewer"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 transition-all disabled:opacity-50">
                        {openingId === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                        <span className="text-[9px] font-medium">Open</span>
                    </button>
                    <button onClick={handleDownload} disabled={downloading} title="Download file"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 hover:border-neutral-600 text-neutral-400 hover:text-white transition-all disabled:opacity-50">
                        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        <span className="text-[9px] font-medium">Download</span>
                    </button>
                    <button onClick={handleShare} title="Copy share link"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 hover:border-neutral-600 text-neutral-400 hover:text-white transition-all">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        <span className={`text-[9px] font-medium ${copied ? 'text-emerald-400' : ''}`}>{copied ? 'Copied!' : 'Share'}</span>
                    </button>
                    <button onClick={() => onDelete(item)} title="Delete"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-red-500/15 border border-neutral-700/50 hover:border-red-500/30 text-neutral-600 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── List row ──────────────────────────────────────────────────────

function StructureRow({ item, onToggleStar, onDelete, onRename, onOpen, openingId }: Omit<CardProps, 'onNotesChange'>) {
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
        try {
            const url = await getDownloadUrl(item.file_path);
            const a = document.createElement('a');
            a.href = url; a.download = `${item.name}.${item.file_type.toLowerCase()}`; a.click();
        } catch { /* ignore */ } finally { setDownloading(false); }
    };

    const badge = TYPE_BADGE[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';

    return (
        <tr className="group border-b border-neutral-800 hover:bg-neutral-800/40 transition-colors">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <Dna className="w-4 h-4 text-neutral-600 shrink-0" />
                    {editing ? (
                        <input ref={inputRef} value={draftName} onChange={e => setDraftName(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setEditing(false); setDraftName(item.name); } }}
                            className="text-sm text-white bg-neutral-700 border border-blue-500/60 rounded px-2 py-0.5 outline-none w-40" />
                    ) : (
                        <button onClick={() => setEditing(true)} className="group/n flex items-center gap-1 min-w-0">
                            <span className="text-sm text-neutral-100 truncate max-w-[160px]">{item.name}</span>
                            <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/n:opacity-100 shrink-0" />
                        </button>
                    )}
                </div>
            </td>
            <td className="px-3 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badge}`}>{item.file_type}</span></td>
            <td className="px-3 py-3 text-xs text-neutral-500">{formatBytes(item.file_size)}</td>
            <td className="px-3 py-3 text-xs text-neutral-500">{timeAgo(item.created_at)}</td>
            <td className="px-3 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => onOpen(item)} disabled={!!openingId} title="Open" className="p-1.5 rounded-lg hover:bg-blue-500/20 text-neutral-500 hover:text-blue-400 transition-colors disabled:opacity-50">
                        {openingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={handleDownload} disabled={downloading} title="Download" className="p-1.5 rounded-lg hover:bg-neutral-700 text-neutral-500 hover:text-white transition-colors disabled:opacity-50">
                        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => onToggleStar(item)} className="p-1.5 rounded-lg hover:bg-neutral-700 transition-colors">
                        <Star className={`w-3.5 h-3.5 ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                    </button>
                    <button onClick={() => onDelete(item)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ─── Storage bar ──────────────────────────────────────────────────

const MAX_FREE_BYTES = 1024 * 1024 * 1024; // 1 GB display cap (Supabase free tier is 1 GB storage)

function StorageBar({ structures }: { structures: Structure[] }) {
    const used = structures.reduce((sum, s) => sum + (s.file_size ?? 0), 0);
    const pct = Math.min((used / MAX_FREE_BYTES) * 100, 100);
    const color = pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-blue-500';
    return (
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <Database className="w-4 h-4 text-neutral-500 shrink-0" />
            <div className="flex-1">
                <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
                    <span>Storage used</span>
                    <span className="text-neutral-300 font-medium">{formatBytes(used)} <span className="text-neutral-600">/ 1 GB</span></span>
                </div>
                <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                </div>
            </div>
        </div>
    );
}

// ─── RCSB Import bar ─────────────────────────────────────────────

interface RCSBImportProps {
    userId: string;
    onImported: (s: Structure) => void;
}

function RCSBImport({ userId, onImported }: RCSBImportProps) {
    const [pdbId, setPdbId] = useState('');
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [ok, setOk] = useState('');

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(''); setOk('');
        setLoading(true);
        try {
            const s = await importFromRCSB(pdbId, userId);
            onImported(s);
            setOk(`"${s.name}" imported!`);
            setPdbId('');
            setTimeout(() => setOk(''), 3000);
        } catch (ex: any) {
            setErr(ex.message ?? 'Import failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleImport} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
            <Import className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="text-xs text-neutral-500 whitespace-nowrap hidden sm:block">Import from RCSB</span>
            <input
                value={pdbId}
                onChange={e => { setPdbId(e.target.value.toUpperCase()); setErr(''); setOk(''); }}
                placeholder="PDB ID (e.g. 1CRN)"
                maxLength={4}
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-neutral-600 outline-none uppercase font-mono tracking-widest"
            />
            {err && <span className="text-xs text-red-400 whitespace-nowrap">{err}</span>}
            {ok && <span className="text-xs text-emerald-400 whitespace-nowrap flex items-center gap-1"><Check className="w-3 h-3" />{ok}</span>}
            <button
                type="submit"
                disabled={pdbId.length !== 4 || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors shrink-0"
            >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Import className="w-3.5 h-3.5" />}
                Import
            </button>
        </form>
    );
}

// ─── Page ─────────────────────────────────────────────────────────

type SortKey = 'date' | 'name' | 'size';
type ViewMode = 'grid' | 'list';

export const MyStructures = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [structures, setStructures] = useState<Structure[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showStarred, setShowStarred] = useState(false);
    const [sortBy, setSortBy] = useState<SortKey>('date');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [openingId, setOpeningId] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!user) return;
        try { setError(null); setStructures(await listStructures(user.id)); }
        catch (ex: any) { setError(ex.message ?? 'Failed to load'); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { reload(); }, [reload]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = '';
        setUploading(true);
        try { const s = await uploadStructure(file, user.id); setStructures(prev => [s, ...prev]); }
        catch (ex: any) { setError(ex.message ?? 'Upload failed'); }
        finally { setUploading(false); }
    };

    const handleToggleStar = async (s: Structure) => {
        const next = !s.starred;
        setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: next } : x));
        try { await toggleStar(s.id, next); }
        catch { setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: s.starred } : x)); }
    };

    const handleRename = async (id: string, name: string) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, name } : x));
        try { await renameStructure(id, name); } catch { reload(); }
    };

    const handleNotesChange = async (id: string, notes: string) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, notes } : x));
        try { await updateNotes(id, notes); } catch { reload(); }
    };

    const handleDelete = async (s: Structure) => {
        if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
        setStructures(prev => prev.filter(x => x.id !== s.id));
        try { await deleteStructure(s.id, s.file_path); }
        catch (ex: any) { setError(ex.message ?? 'Delete failed'); reload(); }
    };

    const handleOpen = async (s: Structure) => {
        setOpeningId(s.id);
        try {
            const url = await getDownloadUrl(s.file_path);
            sessionStorage.setItem('pendingStructure', JSON.stringify({ url, name: s.name, fileType: s.file_type.toLowerCase() }));
            navigate('/');
        } catch (ex: any) { setError(ex.message ?? 'Could not open'); }
        finally { setOpeningId(null); }
    };

    // Sorting + filtering
    let filtered = structures.filter(s => {
        if (showStarred && !s.starred) return false;
        return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size') filtered = [...filtered].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));

    return (
        <div className="max-w-6xl mx-auto space-y-5">
            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} className="hidden" onChange={handleFileChange} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">My Structures</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {loading ? 'Loading…' : `${structures.length} structure${structures.length !== 1 ? 's' : ''} · ${structures.filter(s => s.starred).length} starred`}
                    </p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-fit">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload Structure</>}
                </button>
            </div>

            {/* Info bars: Storage + RCSB Import */}
            {!loading && user && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <StorageBar structures={structures} />
                    <RCSBImport userId={user.id} onImported={s => setStructures(prev => [s, ...prev])} />
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Filter structures…"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button onClick={() => setShowStarred(p => !p)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${showStarred ? 'text-amber-400 border-amber-400/50 bg-amber-500/5' : 'text-neutral-400 bg-neutral-900 border-neutral-700 hover:text-amber-400'}`}>
                    <Star className={`w-4 h-4 ${showStarred ? 'fill-amber-400' : ''}`} />Starred
                </button>
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1 text-xs">
                    <Filter className="w-3.5 h-3.5 text-neutral-500 ml-1 mr-0.5" />
                    {(['date', 'name', 'size'] as SortKey[]).map(k => (
                        <button key={k} onClick={() => setSortBy(k)}
                            className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${sortBy === k ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>{k}</button>
                    ))}
                </div>
                {/* Grid/List toggle */}
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
            </div>

            {/* Loading */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse h-60" />)}
                </div>
            )}

            {/* Empty */}
            {!loading && structures.length === 0 && (
                <div className="text-center py-20">
                    <Dna className="w-12 h-12 mx-auto mb-4 text-neutral-700" />
                    <p className="text-base font-medium text-neutral-400 mb-1">No structures yet</p>
                    <p className="text-sm text-neutral-600 mb-4">Upload a file or import by PDB ID above.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" />Upload your first structure
                    </button>
                </div>
            )}

            {/* Grid view */}
            {!loading && structures.length > 0 && viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => (
                        <StructureCard key={item.id} item={item}
                            onToggleStar={handleToggleStar} onDelete={handleDelete}
                            onRename={handleRename} onNotesChange={handleNotesChange}
                            onOpen={handleOpen} openingId={openingId} />
                    ))}
                    <button onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[240px] group">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Upload New Structure</span>
                        <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500 transition-colors">.pdb · .cif · .sdf · .mol</span>
                    </button>
                </div>
            )}

            {/* List view */}
            {!loading && structures.length > 0 && viewMode === 'list' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-neutral-800">
                                <th className="px-4 py-3 text-xs font-medium text-neutral-500">Name</th>
                                <th className="px-3 py-3 text-xs font-medium text-neutral-500">Type</th>
                                <th className="px-3 py-3 text-xs font-medium text-neutral-500">Size</th>
                                <th className="px-3 py-3 text-xs font-medium text-neutral-500">Uploaded</th>
                                <th className="px-3 py-3 text-xs font-medium text-neutral-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <StructureRow key={item.id} item={item}
                                    onToggleStar={handleToggleStar} onDelete={handleDelete}
                                    onRename={handleRename} onOpen={handleOpen} openingId={openingId} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && structures.length > 0 && filtered.length === 0 && (
                <p className="text-center text-neutral-500 text-sm py-8">No structures match your filter.</p>
            )}

            {!loading && structures.length > 0 && (
                <p className="text-xs text-neutral-600 text-center pb-2">
                    💡 Click a name to rename · Click notes to add a description · Files auto-save when uploaded in the viewer
                </p>
            )}
        </div>
    );
};
