import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPublicCollection, getDownloadUrl, type Collection, type Structure } from '../../lib/structuresService';
import { Loader2, Folder, ExternalLink, Download, Globe, Beaker, Dna } from 'lucide-react';

// Re-use some constants for visual consistency
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

const TYPE_BADGE: Record<string, string> = {
    'pdb': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    'cif': 'bg-violet-500/10 border-violet-500/30 text-violet-400',
    'mmcif': 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400',
    'sdf': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    'mol': 'bg-teal-500/10 border-teal-500/30 text-teal-400',
    'mol2': 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
};

export const PublicPortfolio: React.FC = () => {
    const { collectionId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [collection, setCollection] = useState<Collection | null>(null);
    const [structures, setStructures] = useState<Structure[]>([]);

    useEffect(() => {
        if (!collectionId) return;

        getPublicCollection(collectionId)
            .then(({ collection, structures }) => {
                setCollection(collection);
                setStructures(structures);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Gallery not found or is private.');
                setLoading(false);
            });
    }, [collectionId]);

    const handleOpenInViewer = async (structure: Structure) => {
        try {
            const url = await getDownloadUrl(structure.file_path);
            const pending = { url, name: structure.name, fileType: structure.file_type.toLowerCase() };
            sessionStorage.setItem('pendingStructure', JSON.stringify(pending));
            navigate('/');
        } catch (e: any) {
            alert('Failed to generate viewer link: ' + e.message);
        }
    };

    const handleDownload = async (structure: Structure) => {
        try {
            const url = await getDownloadUrl(structure.file_path);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${structure.name}.${structure.file_type.toLowerCase()}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e: any) {
            alert('Download failed: ' + e.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-neutral-400 animate-pulse">Loading Public Gallery...</p>
            </div>
        );
    }

    if (error || !collection) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white p-6">
                <div className="max-w-md text-center space-y-4">
                    <div className="w-16 h-16 bg-neutral-900 rounded-2xl flex items-center justify-center mx-auto border border-neutral-800 shadow-xl">
                        <Folder className="w-8 h-8 text-neutral-500" />
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-br from-white to-neutral-500 bg-clip-text text-transparent">Gallery Unavailable</h1>
                    <p className="text-neutral-400 text-sm">{error || 'This folder may be private, deleted, or you might have the wrong link.'}</p>
                    <div className="pt-4">
                        <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium">Return to Homepage</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 selection:bg-blue-500/30">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${COLOR_CLASSES[collection.color] || COLOR_CLASSES['blue']}`}>
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-white tracking-tight">{collection.name}</h1>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                                    <Globe className="w-3 h-3" /> Public
                                </span>
                            </div>
                            <p className="text-xs text-neutral-500">{structures.length} {structures.length === 1 ? 'item' : 'items'} • Shared via Quercus</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-xs font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                            Powered by <span className="text-blue-400 font-bold tracking-tight">Quercus</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {structures.length === 0 ? (
                    <div className="text-center py-32 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
                        <p className="text-neutral-500">This public gallery is currently empty.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {structures.map(structure => {
                            const badge = TYPE_BADGE[structure.file_type.toLowerCase()] ?? 'bg-neutral-800 border-neutral-700 text-neutral-400';
                            const rcsbMatch = structure.name.match(/^[1-9][A-Z0-9]{3}$/i);
                            const rcsbId = rcsbMatch ? rcsbMatch[0].toUpperCase() : null;

                            return (
                                <div key={structure.id} className="group relative flex flex-col bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden hover:border-neutral-700 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50">
                                    {/* Thumbnail Area */}
                                    <div className="aspect-[4/3] bg-neutral-950 relative overflow-hidden group-hover:bg-neutral-900 transition-colors">
                                        {rcsbId ? (
                                            <>
                                                <img
                                                    src={`https://cdn.rcsb.org/images/structures/${rcsbId.toLowerCase()}_assembly-1.jpeg`}
                                                    alt={rcsbId}
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                                                {structure.file_type.toLowerCase() === 'pdb' ? <Dna className="w-16 h-16 text-blue-400" /> : <Beaker className="w-16 h-16 text-emerald-400" />}
                                            </div>
                                        )}

                                        {/* Top Badges */}
                                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${badge} shadow-sm`}>
                                                {structure.file_type.toUpperCase()}
                                            </span>
                                            {rcsbId && (
                                                <span className="text-[10px] font-mono text-white/90 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md shadow-sm border border-white/10">
                                                    {rcsbId}
                                                </span>
                                            )}
                                        </div>

                                        {/* Hover Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => handleOpenInViewer(structure)}
                                                className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-400 hover:scale-110 transition-all shadow-lg shadow-blue-500/30"
                                                title="Open in Interactive Viewer"
                                            >
                                                <ExternalLink className="w-4 h-4 ml-0.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(structure)}
                                                className="w-10 h-10 rounded-full bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-700 hover:scale-110 transition-all shadow-lg border border-neutral-700"
                                                title="Download File"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Info Area */}
                                    <div className="p-4 flex flex-1 flex-col">
                                        <h3 className="text-sm font-semibold text-white leading-tight mb-2 line-clamp-2" title={structure.metadata?.title || structure.name}>
                                            {structure.metadata?.title || structure.name}
                                        </h3>

                                        <div className="mt-auto grid grid-cols-2 gap-x-2 gap-y-3 pt-3 border-t border-neutral-800/60">
                                            <div>
                                                <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold mb-0.5">Uploaded</p>
                                                <p className="text-xs text-neutral-300">{new Date(structure.created_at).toLocaleDateString()}</p>
                                            </div>
                                            {(structure.metadata?.resolution != null) ? (
                                                <div>
                                                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold mb-0.5">Resolution</p>
                                                    <p className="text-xs text-neutral-300">{structure.metadata.resolution.toFixed(2)} Å</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-semibold mb-0.5">Size</p>
                                                    <p className="text-xs text-neutral-300">{structure.file_size != null ? `${(structure.file_size / 1024).toFixed(0)} KB` : 'Unknown'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};
