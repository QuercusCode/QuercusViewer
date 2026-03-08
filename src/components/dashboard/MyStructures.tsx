import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, MoreVertical, Star, Clock, Search, Upload, Dna, Trash2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext';
import {
    listStructures,
    uploadStructure,
    toggleStar,
    deleteStructure,
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
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

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
    const [menuOpen, setMenuOpen] = useState<string | null>(null);
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
            const newStructure = await uploadStructure(file, user.id);
            setStructures(prev => [newStructure, ...prev]);
        } catch (err: any) {
            setError(err.message ?? 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStar = async (s: Structure) => {
        const next = !s.starred;
        setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: next } : x));
        try {
            await toggleStar(s.id, next);
        } catch {
            setStructures(prev => prev.map(x => x.id === s.id ? { ...x, starred: s.starred } : x));
        }
    };

    const handleDelete = async (s: Structure) => {
        setMenuOpen(null);
        setStructures(prev => prev.filter(x => x.id !== s.id));
        try {
            await deleteStructure(s.id, s.file_path);
        } catch (err: any) {
            setError(err.message ?? 'Delete failed');
            reload();
        }
    };

    const handleOpenInViewer = async (s: Structure) => {
        setOpeningId(s.id);
        try {
            const url = await getDownloadUrl(s.file_path);
            sessionStorage.setItem('pendingStructure', JSON.stringify({
                url,
                name: s.name,
                fileType: s.file_type.toLowerCase(),
            }));
            navigate('/');
        } catch (err: any) {
            setError(err.message ?? 'Could not open structure');
        } finally {
            setOpeningId(null);
        }
    };

    const filtered = structures.filter(s => {
        if (showStarred && !s.starred) return false;
        return s.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTS}
                className="hidden"
                onChange={handleFileChange}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">My Structures</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">
                        {loading ? 'Loading...' : `${structures.length} structure${structures.length !== 1 ? 's' : ''} in your library`}
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-fit"
                >
                    {uploading
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                        : <><Upload className="w-4 h-4" /> Upload Structure</>
                    }
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

            {/* Search & Filter */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Filter structures..."
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={() => setShowStarred(p => !p)}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${showStarred ? 'text-amber-400 border-amber-400/50 bg-amber-500/5' : 'text-neutral-400 bg-neutral-900 border-neutral-700 hover:text-amber-400 hover:border-amber-400/50'}`}
                >
                    <Star className={`w-4 h-4 ${showStarred ? 'fill-amber-400' : ''}`} /> Starred
                </button>
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 animate-pulse h-[180px]" />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!loading && structures.length === 0 && (
                <div className="text-center py-20 text-neutral-500">
                    <Dna className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-base font-medium text-neutral-400 mb-1">No structures yet</p>
                    <p className="text-sm">Upload a PDB, CIF, or SDF file to get started.</p>
                </div>
            )}

            {/* Grid */}
            {!loading && structures.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-all group flex flex-col"
                        >
                            {/* Top row */}
                            <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                        <Dna className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        {item.file_type}
                                    </span>
                                </div>

                                {/* Kebab menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                                        className="text-neutral-600 hover:text-neutral-300 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {menuOpen === item.id && (
                                        <div className="absolute right-0 top-7 z-10 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl min-w-[140px] py-1 text-sm">
                                            <button
                                                onClick={() => handleOpenInViewer(item)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Open in Viewer
                                            </button>
                                            <div className="h-px bg-neutral-700 my-1" />
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h3 className="font-semibold text-neutral-100 mb-1 line-clamp-1">{item.name}</h3>
                            <p className="text-xs text-neutral-500 mb-4">{formatBytes(item.file_size)}</p>

                            {/* Footer */}
                            <div className="flex items-center gap-3 text-xs text-neutral-600 mt-auto pt-4 border-t border-neutral-800">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {timeAgo(item.created_at)}
                                </div>

                                {/* Open in Viewer */}
                                <button
                                    onClick={() => handleOpenInViewer(item)}
                                    disabled={!!openingId}
                                    className="flex items-center gap-1 text-neutral-500 hover:text-blue-400 transition-colors disabled:opacity-50"
                                    title="Open in 3D Viewer"
                                >
                                    {openingId === item.id
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <ExternalLink className="w-3.5 h-3.5" />
                                    }
                                </button>

                                {/* Star */}
                                <div className="ml-auto">
                                    <button onClick={() => handleToggleStar(item)}>
                                        <Star className={`w-4 h-4 transition-all ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-neutral-400'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Upload card */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-800 rounded-xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[180px] group"
                    >
                        <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                            <Plus className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium">Upload New Structure</span>
                        <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500 transition-colors">.pdb, .cif, .mmcif</span>
                    </button>
                </div>
            )}
        </div>
    );
};
