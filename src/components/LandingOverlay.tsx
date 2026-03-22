import React, { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Upload, Play, BookOpen, Dna, Activity, Shuffle, Clock, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { FEATURED_MOLECULES } from '../data/featuredMolecules';
import { getRecentStructures, type RecentStructure } from '../lib/recentStructures';
import { useTranslation } from '../lib/i18n';

interface LandingOverlayProps {
    isVisible: boolean;
    onDismiss: () => void;
    onUpload: () => void;
    onStartTour: () => void;
    onLoadPdb: (id: string, fileUrl?: string) => void;
}

export const LandingOverlay: React.FC<LandingOverlayProps> = ({ isVisible, onDismiss, onUpload, onStartTour, onLoadPdb }) => {
    const { t } = useTranslation();
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [recentStructures, setRecentStructures] = useState<RecentStructure[]>([]);

    // Load recent structures from localStorage each time the overlay opens
    useEffect(() => {
        if (isVisible) setRecentStructures(getRecentStructures());
    }, [isVisible]);

    // Day of year logic for consistent daily rotation
    const dailyIndex = useMemo(() => {
        const start = new Date(new Date().getFullYear(), 0, 0);
        const diff = (new Date().getTime() - start.getTime()) + ((start.getTimezoneOffset() - new Date().getTimezoneOffset()) * 60 * 1000);
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        return dayOfYear % FEATURED_MOLECULES.length;
    }, []);

    const [selectedIndex, setSelectedIndex] = useState(dailyIndex);
    const [isShuffling, setIsShuffling] = useState(false);

    const moleculeOfTheDay = FEATURED_MOLECULES[selectedIndex];

    const handleShuffle = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsShuffling(true);
        let count = 0;
        const interval = setInterval(() => {
            setSelectedIndex(prev => (prev + 1) % FEATURED_MOLECULES.length);
            count++;
            if (count > 5) {
                clearInterval(interval);
                let newIndex = Math.floor(Math.random() * FEATURED_MOLECULES.length);
                while (newIndex === selectedIndex && FEATURED_MOLECULES.length > 1) {
                    newIndex = Math.floor(Math.random() * FEATURED_MOLECULES.length);
                }
                setSelectedIndex(newIndex);
                setIsShuffling(false);
            }
        }, 80);
    };

    // Handle Animation Lifecycle
    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            setIsFadingOut(false);
        } else {
            setIsFadingOut(true);
            const timer = setTimeout(() => setShouldRender(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!shouldRender) return null;

    const timeAgo = (ts: number) => {
        const m = Math.floor((Date.now() - ts) / 60000);
        if (m < 1) return t.justNow;
        if (m < 60) return t.mAgo(m);
        const h = Math.floor(m / 60);
        if (h < 24) return t.hAgo(h);
        return t.dAgo(Math.floor(h / 24));
    };

    return (
        <div className={clsx(
            "fixed inset-0 z-[100] flex flex-col md:flex-row items-center justify-center md:justify-between p-6 md:p-12 transition-opacity duration-500",
            isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100",
            "bg-gradient-to-br from-black/90 via-black/80 to-transparent backdrop-blur-sm"
        )}>
            {/* Background Interaction Layer */}
            <div className="absolute inset-0 z-0" onClick={onDismiss} />

            {/* Logo */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-top-4 duration-1000">
                <img src="logo/full-white.png" alt="Quercus Viewer" className="h-16 md:h-20 opacity-90 hover:opacity-100 transition-opacity" />
            </div>

            {/* Content Container */}
            <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end justify-between gap-12 pointer-events-none">

                {/* HERO SECTION (Left) */}
                <div className="flex-1 text-center md:text-left pointer-events-auto space-y-6 max-w-2xl mt-12 md:mt-0">

                    <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-none animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                        {t.visualizeLife} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{t.in3D}</span>
                    </h1>

                    <p className="text-lg md:text-xl text-gray-300 max-w-lg mx-auto md:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        {t.exploreDesc}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4 pt-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                        <button
                            onClick={onDismiss}
                            className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] flex items-center gap-2"
                        >
                            {t.startExploring}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>

                        <button
                            onClick={() => { onDismiss(); onStartTour(); }}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-full font-bold text-lg backdrop-blur-md transition-colors flex items-center gap-2"
                        >
                            <Play size={20} fill="currentColor" className="opacity-80" />
                            {t.takeTour}
                        </button>
                    </div>

                    <div className="pt-4 flex items-center justify-center md:justify-start gap-6 text-sm text-gray-500 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
                        <button onClick={onUpload} className="hover:text-white transition-colors flex items-center gap-2">
                            <Upload size={16} /> {t.uploadFile}
                        </button>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <button onClick={() => onLoadPdb('2B3P')} className="hover:text-white transition-colors flex items-center gap-2">
                            <Dna size={16} /> {t.loadExample}
                        </button>
                    </div>

                    {/* ── Recently Viewed ── */}
                    {recentStructures.length > 0 && (
                        <div className="pt-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                <Clock size={12} />
                                <span className="font-semibold uppercase tracking-wider">{t.recentlyViewed}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {recentStructures.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => { onLoadPdb(r.pdbId ?? r.id); onDismiss(); }}
                                        className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-xs text-gray-300 hover:text-white transition-all"
                                    >
                                        <Dna size={11} className="text-blue-400 opacity-70 group-hover:opacity-100" />
                                        <span className="font-medium truncate max-w-[120px]">{r.name}</span>
                                        <span className="text-gray-600 shrink-0">{timeAgo(r.timestamp)}</span>
                                        <ChevronRight size={10} className="text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* FEATURED CARD (Right) */}
                <div className="relative pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-right-8 duration-1000 delay-500 hidden md:block">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors transform hover:-translate-y-2 duration-500">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity scale-150">
                            <Activity size={180} />
                        </div>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                                <Activity size={20} className="text-blue-400" />
                                {t.moleculeOfTheDay}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-blue-400 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                                    {moleculeOfTheDay.id}
                                </span>
                                <button
                                    onClick={handleShuffle}
                                    className={clsx(
                                        "p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors",
                                        isShuffling && "animate-spin text-blue-400"
                                    )}
                                    title={t.shuffleMolecule}
                                >
                                    <Shuffle size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="h-64 mb-6 rounded-2xl bg-black/50 border border-white/5 flex items-center justify-center relative overflow-hidden group-hover:border-white/20 transition-colors shadow-inner">
                            <img
                                src={`https://cdn.rcsb.org/images/structures/${moleculeOfTheDay.id.toLowerCase()}_assembly-1.jpeg`}
                                alt={moleculeOfTheDay.title}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-105"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-blue-500/20', 'to-purple-500/20');
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-5">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1 block">
                                        {moleculeOfTheDay.category}
                                    </span>
                                    <p className="text-white text-lg font-bold w-full shadow-black drop-shadow-md leading-tight line-clamp-2">
                                        {moleculeOfTheDay.title}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <p className="text-gray-300 text-sm mb-2 font-medium">
                            {moleculeOfTheDay.description}
                        </p>
                        <p className="text-gray-400 text-xs mb-6 leading-relaxed line-clamp-3">
                            {moleculeOfTheDay.details}
                        </p>

                        <button
                            onClick={() => {
                                onLoadPdb(moleculeOfTheDay.id, `models/${moleculeOfTheDay.id}.pdb`);
                                onDismiss();
                            }}
                            className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm transition-all flex items-center justify-center gap-2 hover:bg-gray-200 hover:scale-[1.02]"
                        >
                            <BookOpen size={18} />
                            {t.viewStructure}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};
