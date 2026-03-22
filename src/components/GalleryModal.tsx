import React, { useState, useMemo } from 'react';
import {
    X,
    Video,
    Trash2,
    Download,
    Calendar,
    FileText,
    Layers,
    ChevronLeft,
    ChevronRight,
    Grid,
    Maximize
} from 'lucide-react';
import clsx from 'clsx';
import type { Snapshot, Movie } from '../types';
import { useTimezone, formatDate, formatDateTime } from '../lib/timezoneUtils';

interface GalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: Snapshot[];
    movies: Movie[];
    onDeleteSnapshot: (id: string) => void;
    onDeleteMovie: (id: string) => void;
    onDownloadSnapshot: (id: string) => void;
    onDownloadMovie: (id: string) => void;
    isLightMode: boolean;
}

type GalleryItem = (Snapshot | Movie) & { type: 'snapshot' | 'movie' };

export const GalleryModal: React.FC<GalleryModalProps> = ({
    isOpen,
    onClose,
    snapshots,
    movies,
    onDeleteSnapshot,
    onDeleteMovie,
    onDownloadSnapshot,
    onDownloadMovie,
    isLightMode
}) => {
    const timezone = useTimezone();
    const [activeTab, setActiveTab] = useState<'all' | 'snapshots' | 'movies'>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Combine and sort items by timestamp (newest first)
    const items = useMemo(() => {
        const snaps: GalleryItem[] = snapshots.map(s => ({ ...s, type: 'snapshot' }));
        const movs: GalleryItem[] = movies.map(m => ({ ...m, type: 'movie' }));
        return [...snaps, ...movs].sort((a, b) => b.timestamp - a.timestamp);
    }, [snapshots, movies]);

    const filteredItems = useMemo(() => {
        if (activeTab === 'all') return items;
        return items.filter(item => item.type === (activeTab === 'snapshots' ? 'snapshot' : 'movie'));
    }, [items, activeTab]);

    const selectedItem = useMemo(() =>
        items.find(i => i.id === selectedId),
        [items, selectedId]);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        const idx = filteredItems.findIndex(i => i.id === selectedId);
        if (idx !== -1 && idx < filteredItems.length - 1) {
            setSelectedId(filteredItems[idx + 1].id);
        }
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        const idx = filteredItems.findIndex(i => i.id === selectedId);
        if (idx > 0) {
            setSelectedId(filteredItems[idx - 1].id);
        }
    };

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white' : 'bg-neutral-900';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-neutral-200' : 'border-neutral-800';
    const subtleText = isLightMode ? 'text-neutral-500' : 'text-neutral-400';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={clsx(
                "w-full h-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border",
                bgColor, borderColor
            )}>
                {/* Header */}
                <div className={clsx("flex flex-col md:flex-row items-start md:items-center justify-between px-4 sm:px-6 py-4 border-b gap-4 md:gap-0", borderColor)}>
                    {/* Title and Mobile Close Button */}
                    <div className="flex items-start md:items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className={clsx("p-2 rounded-lg flex-shrink-0", isLightMode ? "bg-blue-50 text-blue-600" : "bg-blue-500/10 text-blue-400")}>
                                <Grid className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className={clsx("text-base sm:text-lg font-bold", textColor)}>Media Gallery</h2>
                                <p className={clsx("text-[10px] sm:text-xs", subtleText)}>
                                    {items.length} items • {snapshots.length} images, {movies.length} videos
                                </p>
                            </div>
                        </div>

                        {/* Mobile Close */}
                        <button
                            onClick={onClose}
                            className={clsx("md:hidden p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0", isLightMode ? "text-neutral-400 hover:text-neutral-600" : "text-neutral-500 hover:text-neutral-300")}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className={clsx("flex p-1 rounded-lg border w-full md:w-auto", isLightMode ? "bg-neutral-50/50 border-neutral-200" : "bg-neutral-800/50 border-neutral-800")}>
                        {(['all', 'snapshots', 'movies'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    "flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all",
                                    activeTab === tab
                                        ? (isLightMode ? "bg-white text-blue-600 shadow-sm" : "bg-neutral-700 text-white shadow-sm")
                                        : (isLightMode ? "text-neutral-500 hover:text-neutral-700" : "text-neutral-400 hover:text-neutral-200")
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Desktop Close */}
                    <button
                        onClick={onClose}
                        className={clsx("hidden md:block p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0", isLightMode ? "text-neutral-400 hover:text-neutral-600" : "text-neutral-500 hover:text-neutral-300")}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Grid View */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                        {filteredItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                                <Layers className="w-16 h-16" />
                                <p className="text-lg font-medium">No items found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedId(item.id)}
                                        className={clsx(
                                            "group relative aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
                                            borderColor,
                                            selectedId === item.id ? "ring-2 ring-blue-500" : "hover:border-blue-500/50"
                                        )}
                                    >
                                        {item.type === 'snapshot' ? (
                                            <img src={item.url} alt="Thumbnail" className="w-full h-full object-cover bg-neutral-100 dark:bg-neutral-800" />
                                        ) : (
                                            <div className="w-full h-full bg-neutral-900 flex items-center justify-center relative">
                                                <video src={item.url} className="w-full h-full object-cover opacity-50" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                        <Video className="w-5 h-5 text-white fill-white" />
                                                    </div>
                                                </div>
                                                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-mono">
                                                    {Math.round((item as Movie).duration)}s
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay Info */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs font-bold truncate">{item.pdbId || 'Structure'}</p>
                                            <p className="text-[10px] opacity-80">{formatDate(new Date(item.timestamp), timezone)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Detail Sidebar (if item selected) */}
                    {selectedItem && (
                        <div className={clsx(
                            "w-80 border-l flex flex-col overflow-hidden animate-in slide-in-from-right duration-200",
                            borderColor,
                            isLightMode ? "bg-neutral-50" : "bg-neutral-900"
                        )}>
                            {/* Preview Header */}
                            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                                <h3 className={clsx("font-bold text-sm", textColor)}>Details</h3>
                                <button onClick={() => setSelectedId(null)} className="text-neutral-400 hover:text-neutral-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Large Preview */}
                            <div className="aspect-video bg-black/5 dark:bg-black/50 overflow-hidden relative group">
                                {selectedItem.type === 'snapshot' ? (
                                    <img src={selectedItem.url} className="w-full h-full object-contain" alt="Preview" />
                                ) : (
                                    <video src={selectedItem.url} controls className="w-full h-full object-contain" />
                                )}

                                {/* Navigation & Fullscreen Overlay */}
                                <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <button onClick={handlePrev} className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 pointer-events-auto">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={handleNext} className="p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 pointer-events-auto">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Fullscreen Button */}
                                <button
                                    onClick={() => setIsFullscreen(true)}
                                    className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="View fullscreen"
                                >
                                    <Maximize className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Metadata */}
                            <div className="p-4 space-y-6 overflow-y-auto flex-1">
                                <div>
                                    <h4 className={clsx("text-xs font-bold uppercase tracking-wider mb-3", subtleText)}>Information</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-start gap-3">
                                            <FileText className="w-4 h-4 mt-0.5 text-blue-500" />
                                            <div>
                                                <p className={clsx("text-sm font-medium", textColor)}>{selectedItem.pdbId || 'Unknown Structure'}</p>
                                                <p className={clsx("text-xs", subtleText)}>{selectedItem.description || 'No description'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-purple-500" />
                                            <p className={clsx("text-xs", isLightMode ? "text-neutral-700" : "text-neutral-300")}>
                                                {formatDateTime(new Date(selectedItem.timestamp), timezone)}
                                            </p>
                                        </div>
                                        {selectedItem.type === 'snapshot' && (
                                            <div className="flex items-center gap-3">
                                                <Layers className="w-4 h-4 text-orange-500" />
                                                <p className={clsx("text-xs", isLightMode ? "text-neutral-700" : "text-neutral-300")}>
                                                    {(selectedItem as Snapshot).resolutionFactor}x Resolution • {(selectedItem as Snapshot).transparent ? 'Transparent' : 'Opaque'}
                                                </p>
                                            </div>
                                        )}
                                        {selectedItem.type === 'movie' && (
                                            <div className="flex items-center gap-3">
                                                <Video className="w-4 h-4 text-green-500" />
                                                <p className={clsx("text-xs", isLightMode ? "text-neutral-700" : "text-neutral-300")}>
                                                    {Math.round((selectedItem as Movie).duration)}s • {(selectedItem as Movie).format.toUpperCase()}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className={clsx("p-4 border-t flex gap-2", borderColor, isLightMode ? "bg-neutral-50" : "bg-neutral-800/50")}>
                                <button
                                    onClick={() => selectedItem.type === 'snapshot' ? onDownloadSnapshot(selectedItem.id) : onDownloadMovie(selectedItem.id)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-blue-500/20"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download
                                </button>
                                <button
                                    onClick={() => setIsDeleteConfirmOpen(true)}
                                    className={clsx("px-3 py-2 rounded-lg border transition-colors hover:text-red-500 hover:border-red-500", borderColor, subtleText)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {isDeleteConfirmOpen && selectedItem && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className={clsx("w-full max-w-sm rounded-xl p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border", bgColor, borderColor)}>
                        <h3 className={clsx("text-lg font-bold mb-2", textColor)}>Delete Item?</h3>
                        <p className={clsx("text-sm mb-6", subtleText)}>
                            Are you sure you want to delete this {selectedItem.type}? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-colors", isLightMode ? "hover:bg-neutral-100 text-neutral-600" : "hover:bg-white/10 text-neutral-400")}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedItem.type === 'snapshot') onDeleteSnapshot(selectedItem.id);
                                    else onDeleteMovie(selectedItem.id);
                                    setSelectedId(null);
                                    setIsDeleteConfirmOpen(false);
                                }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen View Modal */}
            {isFullscreen && selectedItem && (
                <div
                    className="fixed inset-0 z-[90] bg-black flex items-center justify-center animate-in fade-in duration-200"
                    onClick={() => setIsFullscreen(false)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10"
                        title="Close fullscreen"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Navigation Buttons */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev(e);
                        }}
                        className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={filteredItems.findIndex(i => i.id === selectedId) === 0}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext(e);
                        }}
                        className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={filteredItems.findIndex(i => i.id === selectedId) === filteredItems.length - 1}
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Fullscreen Content */}
                    <div
                        className="max-w-[95vw] max-h-[95vh] flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {selectedItem.type === 'snapshot' ? (
                            <img
                                src={selectedItem.url}
                                className="max-w-full max-h-[95vh] object-contain"
                                alt="Fullscreen view"
                            />
                        ) : (
                            <video
                                src={selectedItem.url}
                                controls
                                autoPlay
                                className="max-w-full max-h-[95vh] object-contain"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
