import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Star, Clock, Search, Upload, Dna, Trash2, ExternalLink,
    Loader2, AlertCircle, Download, Check, Pencil, Share2,
    FileText, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
    listStructures,
    uploadStructure,
    toggleStar,
    deleteStructure,
    renameStructure,
    getDownloadUrl,
    type Structure,
} from '../../lib/structuresService';

const ACCEPTED_EXTS = '.pdb,.cif,.mmcif,.sdf,.mol';

function formatBytes(bytes: number | null): string {
    if (!bytes) return '';
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

const FILE_TYPE_COLORS: Record<string, string> = {
    PDB: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    CIF: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    MMCIF: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    SDF: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    MOL: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
};
const FILE_TYPE_BG: Record<string, string> = {
    PDB: 'from-blue-600/20 to-blue-900/10',
    CIF: 'from-violet-600/20 to-violet-900/10',
    MMCIF: 'from-violet-600/20 to-violet-900/10',
    SDF: 'from-emerald-600/20 to-emerald-900/10',
    MOL: 'from-orange-600/20 to-orange-900/10',
};

// ── Single card ──────────────────────────────────────────────────

interface CardProps {
    item: Structure;
    onToggleStar: (s: Structure) => void;
    onDelete: (s: Structure) => void;
    onRename: (id: string, name: string) => void;
    onOpen: (s: Structure) => void;
    openingId: string | null;
}

function StructureCard({ item, onToggleStar, onDelete, onRename, onOpen, openingId }: CardProps) {
    const [editing, setEditing] = useState(false);
    const [draftName, setDraftName] = useState(item.name);
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setDraftName(item.name); }, [item.name]);
    useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

    const commitRename = () => {
        setEditing(false);
        const trimmed = draftName.trim();
        if (trimmed && trimmed !== item.name) onRename(item.id, trimmed);
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
        } catch { /* ignore */ } finally {
            setDownloading(false);
        }
    };

    const typeBadge = FILE_TYPE_COLORS[item.file_type] ?? 'bg-neutral-500/10 border-neutral-500/30 text-neutral-400';
    const typeBg = FILE_TYPE_BG[item.file_type] ?? 'from-neutral-700/20 to-neutral-900/10';
    const isOpening = openingId === item.id;

    return (
        <div className="group relative bg-neutral-900/80 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-600 transition-all duration-200 hover:shadow-xl hover:shadow-black/30 flex flex-col">

            {/* Gradient header strip */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${typeBg}`} />

            <div className="p-5 flex flex-col flex-1">
                {/* Top row: icon + badge + star */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${typeBg} border border-white/5 flex items-center justify-center shrink-0`}>
                            <Dna className="w-5 h-5 text-white/60" />
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeBadge}`}>
                            {item.file_type}
                        </span>
                    </div>
                    <button
                        onClick={() => onToggleStar(item)}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title={item.starred ? 'Unstar' : 'Star'}
                    >
                        <Star className={`w-4 h-4 transition-all ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-amber-400'}`} />
                    </button>
                </div>

                {/* Name — inline editable */}
                {editing ? (
                    <input
                        ref={inputRef}
                        value={draftName}
                        onChange={e => setDraftName(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') { setEditing(false); setDraftName(item.name); }
                        }}
                        className="text-sm font-semibold text-white bg-neutral-800 border border-blue-500/60 rounded-lg px-2.5 py-1 w-full outline-none mb-1 focus:ring-1 focus:ring-blue-500"
                    />
                ) : (
                    <button
                        onClick={() => setEditing(true)}
                        className="group/name flex items-center gap-1.5 text-left mb-1 w-full min-w-0"
                        title="Click to rename"
                    >
                        <span className="text-sm font-semibold text-neutral-100 truncate">{item.name}</span>
                        <Pencil className="w-3 h-3 text-neutral-600 opacity-0 group-hover/name:opacity-100 transition-all shrink-0" />
                    </button>
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-3 text-xs text-neutral-500 mb-5">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{formatBytes(item.file_size)}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(item.created_at)}</span>
                </div>

                {/* Action bar — always visible */}
                <div className="mt-auto grid grid-cols-4 gap-1.5">
                    {/* Open */}
                    <button
                        onClick={() => onOpen(item)}
                        disabled={!!openingId}
                        title="Open in 3D Viewer"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/25 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 transition-all disabled:opacity-50"
                    >
                        {isOpening
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <ExternalLink className="w-4 h-4" />}
                        <span className="text-[9px] font-medium">Open</span>
                    </button>

                    {/* Download */}
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        title="Download file"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 hover:border-neutral-600 text-neutral-400 hover:text-white transition-all disabled:opacity-50"
                    >
                        {downloading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Download className="w-4 h-4" />}
                        <span className="text-[9px] font-medium">Download</span>
                    </button>

                    {/* Share / Copy URL */}
                    <button
                        onClick={handleShare}
                        title="Copy share link"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 hover:border-neutral-600 text-neutral-400 hover:text-white transition-all"
                    >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        <span className={`text-[9px] font-medium ${copied ? 'text-emerald-400' : ''}`}>{copied ? 'Copied!' : 'Share'}</span>
                    </button>

                    {/* Delete */}
                    <button
                        onClick={() => onDelete(item)}
                        title="Delete structure"
                        className="flex flex-col items-center gap-1 py-2 rounded-xl bg-neutral-800 hover:bg-red-500/15 border border-neutral-700/50 hover:border-red-500/30 text-neutral-600 hover:text-red-400 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="text-[9px] font-medium">Delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────

type SortKey = 'date' | 'name' | 'size';

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
    const [openingId, setOpeningId] = useState<string | null>(null);

    const reload = useCallback(async () => {
        if (!user) return;
        try {
            setError(null);
            const data = await listStructures(user.id);
            setStructures(data);
        } catch (err: any) {
            setError(err.message ?? 'Failed to load structures');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { reload(); }, [reload]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        e.target.value = '';
        setUploading(true);
        try {
            const s = await uploadStructure(file, user.id);
            setStructures(prev => [s, ...prev]);
        } catch (err: any) {
            setError(err.message ?? 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStar = async (s: Structure) => {
        const next = !s.starred;
        setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: next } : x));
        try { await toggleStar(s.id, next); }
        catch { setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: s.starred } : x)); }
    };

    const handleRename = async (id: string, name: string) => {
        setStructures(prev => prev.map(x => x.id === id ? { ...x, name } : x));
        try { await renameStructure(id, name); }
        catch { reload(); }
    };

    const handleDelete = async (s: Structure) => {
        if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
        setStructures(prev => prev.filter(x => x.id !== s.id));
        try { await deleteStructure(s.id, s.file_path); }
        catch (err: any) { setError(err.message ?? 'Delete failed'); reload(); }
    };

    const handleOpen = async (s: Structure) => {
        setOpeningId(s.id);
        try {
            const url = await getDownloadUrl(s.file_path);
            sessionStorage.setItem('pendingStructure', JSON.stringify({
                url, name: s.name, fileType: s.file_type.toLowerCase(),
            }));
            navigate('/');
        } catch (err: any) {
            setError(err.message ?? 'Could not open structure');
        } finally {
            setOpeningId(null);
        }
    };

    // Sorting + filtering
    let filtered = structures.filter(s => {
        if (showStarred && !s.starred) return false;
        return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });
    if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'size') filtered = [...filtered].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0));

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTS} className="hidden" onChange={handleFileChange} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">My Structures</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {loading ? 'Loading…' : `${structures.length} structure${structures.length !== 1 ? 's' : ''} · ${structures.filter(s => s.starred).length} starred`}
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-fit"
                >
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4" />Upload Structure</>}
                </button>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Filter structures…"
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Starred toggle */}
                <button
                    onClick={() => setShowStarred(p => !p)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${showStarred ? 'text-amber-400 border-amber-400/50 bg-amber-500/5' : 'text-neutral-400 bg-neutral-900 border-neutral-700 hover:text-amber-400'}`}
                >
                    <Star className={`w-4 h-4 ${showStarred ? 'fill-amber-400' : ''}`} /> Starred
                </button>

                {/* Sort */}
                <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-700 rounded-lg p-1 text-xs">
                    <Filter className="w-3.5 h-3.5 text-neutral-500 ml-1 mr-0.5" />
                    {(['date', 'name', 'size'] as SortKey[]).map(k => (
                        <button
                            key={k}
                            onClick={() => setSortBy(k)}
                            className={`px-2.5 py-1 rounded-md font-medium capitalize transition-all ${sortBy === k ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >{k}</button>
                    ))}
                </div>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse h-56" />)}
                </div>
            )}

            {/* Empty state */}
            {!loading && structures.length === 0 && (
                <div className="text-center py-20 text-neutral-500">
                    <Dna className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-base font-medium text-neutral-400 mb-1">No structures yet</p>
                    <p className="text-sm">Upload a PDB, CIF, or SDF file to get started.</p>
                    <button onClick={() => fileInputRef.current?.click()} className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" /> Upload your first structure
                    </button>
                </div>
            )}

            {/* Grid */}
            {!loading && structures.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => (
                        <StructureCard
                            key={item.id}
                            item={item}
                            onToggleStar={handleToggleStar}
                            onDelete={handleDelete}
                            onRename={handleRename}
                            onOpen={handleOpen}
                            openingId={openingId}
                        />
                    ))}

                    {/* Upload card */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[220px] group"
                    >
                        <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Upload New Structure</span>
                        <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500 transition-colors">.pdb · .cif · .mmcif · .sdf · .mol</span>
                    </button>
                </div>
            )}

            {/* No results from filter */}
            {!loading && structures.length > 0 && filtered.length === 0 && (
                <p className="text-center text-neutral-500 text-sm py-8">No structures match your filter.</p>
            )}

            {/* Tip */}
            {!loading && structures.length > 0 && (
                <p className="text-xs text-neutral-600 text-center pb-2">
                    💡 Click a name to rename it · Files auto-save when uploaded in the main viewer
                </p>
            )}
        </div>
    );
};
