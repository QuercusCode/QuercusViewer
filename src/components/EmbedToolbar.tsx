import React, { useState } from 'react';
import {
    RotateCcw, Play, Pause, ExternalLink, Maximize2, Minimize2,
    ChevronDown, Dna
} from 'lucide-react';
import type { RepresentationType, ColoringType } from '../types';

interface EmbedToolbarProps {
    pdbId: string;
    proteinTitle: string | null;
    representation: RepresentationType;
    setRepresentation: (r: RepresentationType) => void;
    coloring: ColoringType;
    setColoring: (c: ColoringType) => void;
    isSpinning: boolean;
    setIsSpinning: (s: boolean) => void;
    onResetView: () => void;
    isLightMode: boolean;
}

const REPRESENTATIONS: { value: RepresentationType; label: string }[] = [
    { value: 'cartoon', label: 'Cartoon' },
    { value: 'spacefill', label: 'Spacefill' },
    { value: 'surface', label: 'Surface' },
    { value: 'licorice', label: 'Licorice' },
    { value: 'backbone', label: 'Backbone' },
    { value: 'ribbon', label: 'Ribbon' },
    { value: 'ball+stick', label: 'Ball & Stick' },
    { value: 'line', label: 'Line' },
];

const COLORINGS: { value: ColoringType; label: string }[] = [
    { value: 'chainid', label: 'By Chain' },
    { value: 'element', label: 'By Element' },
    { value: 'hydrophobicity', label: 'Hydrophobicity' },
    { value: 'bfactor', label: 'B-Factor / pLDDT' },
    { value: 'secondary', label: 'Secondary Structure' },
    { value: 'charge', label: 'Charge' },
    { value: 'residueindex', label: 'Rainbow' },
    { value: 'residue', label: 'Residue Name' },
];

export const EmbedToolbar: React.FC<EmbedToolbarProps> = ({
    pdbId,
    proteinTitle,
    representation,
    setRepresentation,
    coloring,
    setColoring,
    isSpinning,
    setIsSpinning,
    onResetView,
    isLightMode,
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showRepMenu, setShowRepMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);

    const displayName = proteinTitle
        ? (proteinTitle.length > 28 ? proteinTitle.slice(0, 26) + '…' : proteinTitle)
        : (pdbId || '');

    const currentRep = REPRESENTATIONS.find(r => r.value === representation)?.label ?? 'Cartoon';
    const currentColor = COLORINGS.find(c => c.value === coloring)?.label ?? 'By Chain';

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

    const base = isLightMode
        ? 'bg-white/90 border-black/10 text-neutral-700 shadow-lg shadow-black/10'
        : 'bg-black/80 border-white/10 text-neutral-200 shadow-lg shadow-black/60';

    const btn = isLightMode
        ? 'hover:bg-black/8 active:bg-black/12 transition-colors rounded-lg'
        : 'hover:bg-white/10 active:bg-white/15 transition-colors rounded-lg';

    const divider = isLightMode ? 'bg-black/10' : 'bg-white/10';

    const dropdownBg = isLightMode
        ? 'bg-white border-black/10 shadow-lg shadow-black/10'
        : 'bg-neutral-900 border-white/10 shadow-lg shadow-black/60';

    const dropdownItem = isLightMode
        ? 'hover:bg-neutral-100 text-neutral-700'
        : 'hover:bg-white/8 text-neutral-300';

    const activeItem = isLightMode
        ? 'bg-blue-50 text-blue-600 font-semibold'
        : 'bg-blue-500/15 text-blue-400 font-semibold';

    return (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center">
            <div
                className={`flex items-center gap-0.5 px-2 py-1.5 rounded-2xl border backdrop-blur-xl text-xs ${base}`}
                onClick={() => { setShowRepMenu(false); setShowColorMenu(false); }}
            >
                {/* Structure name */}
                {displayName && (
                    <>
                        <div className="flex items-center gap-1.5 px-2 py-1 max-w-[140px]">
                            <Dna className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                            <span className="truncate font-medium text-[11px]" title={proteinTitle ?? pdbId}>{displayName}</span>
                        </div>
                        <div className={`w-px h-5 mx-1 ${divider}`} />
                    </>
                )}

                {/* Representation picker */}
                <div className="relative">
                    <button
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${btn}`}
                        onClick={(e) => { e.stopPropagation(); setShowRepMenu(v => !v); setShowColorMenu(false); }}
                        title="Change representation"
                    >
                        {currentRep}
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    {showRepMenu && (
                        <div className={`absolute bottom-full mb-2 left-0 rounded-xl border overflow-hidden min-w-[130px] ${dropdownBg}`}
                            onClick={e => e.stopPropagation()}>
                            {REPRESENTATIONS.map(r => (
                                <button
                                    key={r.value}
                                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${representation === r.value ? activeItem : dropdownItem}`}
                                    onClick={() => { setRepresentation(r.value); setShowRepMenu(false); }}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Coloring picker */}
                <div className="relative">
                    <button
                        className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium ${btn}`}
                        onClick={(e) => { e.stopPropagation(); setShowColorMenu(v => !v); setShowRepMenu(false); }}
                        title="Change coloring"
                    >
                        {currentColor}
                        <ChevronDown className="w-3 h-3 opacity-50" />
                    </button>
                    {showColorMenu && (
                        <div className={`absolute bottom-full mb-2 left-0 rounded-xl border overflow-hidden min-w-[155px] ${dropdownBg}`}
                            onClick={e => e.stopPropagation()}>
                            {COLORINGS.map(c => (
                                <button
                                    key={c.value}
                                    className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${coloring === c.value ? activeItem : dropdownItem}`}
                                    onClick={() => { setColoring(c.value); setShowColorMenu(false); }}
                                >
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`w-px h-5 mx-1 ${divider}`} />

                {/* Spin toggle */}
                <button
                    className={`p-1.5 ${btn} ${isSpinning ? (isLightMode ? 'text-blue-600' : 'text-blue-400') : ''}`}
                    onClick={(e) => { e.stopPropagation(); setIsSpinning(!isSpinning); }}
                    title={isSpinning ? 'Stop spinning' : 'Start spinning'}
                >
                    {isSpinning
                        ? <Pause className="w-3.5 h-3.5" />
                        : <Play className="w-3.5 h-3.5" />}
                </button>

                {/* Reset view */}
                <button
                    className={`p-1.5 ${btn}`}
                    onClick={(e) => { e.stopPropagation(); onResetView(); }}
                    title="Reset view"
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Fullscreen */}
                <button
                    className={`p-1.5 ${btn}`}
                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen
                        ? <Minimize2 className="w-3.5 h-3.5" />
                        : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                <div className={`w-px h-5 mx-1 ${divider}`} />

                {/* Open in Quercus */}
                <a
                    href={`https://quercusviewer.com${window.location.search.replace('embed=true&', '').replace('&embed=true', '').replace('embed=true', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg transition-colors ${isLightMode ? 'text-blue-600 hover:bg-blue-50' : 'text-blue-400 hover:bg-blue-500/10'}`}
                    title="Open in Quercus Viewer"
                    onClick={e => e.stopPropagation()}
                >
                    <ExternalLink className="w-3 h-3" />
                    Quercus
                </a>
            </div>
        </div>
    );
};
