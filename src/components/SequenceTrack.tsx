
import React, { useRef, useEffect, useState } from 'react';
import { Map, Atom } from 'lucide-react';
import type { ChainInfo, ColoringType, ColorPalette, MappedUniProtFeature } from '../types';
import { getPaletteColor } from '../utils/colorUtils';
import { featureColor } from '../hooks/useUniProtFeatures';

interface SequenceTrackProps {
    id?: string;
    chains: ChainInfo[];
    uniprotFeatures?: Record<string, MappedUniProtFeature[]> | null;
    highlightedResidue: { chain: string; resNo: number } | null;
    onHoverResidue: (chain: string, resNo: number) => void;
    onClickResidue: (chain: string, resNo: number) => void;
    onClickAtom?: (serial: number) => void; // Added for Atom Bar
    isLightMode: boolean;
    coloring: ColoringType;
    colorPalette: ColorPalette;
}

// Kyte-Doolittle Hydrophobicity Scale
const HYDROPHOBICITY: Record<string, number> = {
    I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8, G: -0.4, T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6, H: -3.2, E: -3.5, Q: -3.5, D: -3.5, N: -3.5, K: -3.9, R: -4.5
};

const AMINO_ACID_COLORS: Record<string, string> = {
    // Hydrophobic (Red-ish)
    A: '#fca5a5', V: '#f87171', L: '#ef4444', I: '#dc2626', M: '#b91c1c', F: '#991b1b', W: '#7f1d1d', P: '#fecaca',
    // Polar (Blue-ish)
    G: '#e0f2fe', S: '#bae6fd', T: '#7dd3fc', C: '#38bdf8', Y: '#0ea5e9', N: '#0284c7', Q: '#0369a1',
    // Positive (Blue/Purple)
    K: '#60a5fa', R: '#3b82f6', H: '#2563eb',
    // Negative (Red/Pink)
    D: '#f472b6', E: '#ec4899'
};

const NUCLEIC_ACID_COLORS: Record<string, string> = {
    A: '#86efac', // Green-300
    G: '#fde047', // Yellow-300
    C: '#93c5fd', // Blue-300
    T: '#fca5a5', // Red-300
    U: '#fca5a5', // Red-300 (RNA)
};

const ATOM_COLORS: Record<string, string> = {
    C: '#9CA3AF', // Gray (Carbon)
    O: '#EF4444', // Red (Oxygen)
    N: '#3B82F6', // Blue (Nitrogen)
    S: '#EAB308', // Yellow (Sulfur)
    P: '#F97316', // Orange (Phosphorus)
    H: '#FFFFFF', // White (Hydrogen)
    F: '#10B981', // Green (Fluorine)
    CL: '#10B981', // Green (Chlorine)
    BR: '#7C3AED', // Violet (Bromine)
    I: '#7C3AED'   // Violet (Iodine)
};

const getResidueColor = (
    res: string,
    isLight: boolean,
    type: 'protein' | 'nucleic' | 'unknown' = 'protein',
    coloring: ColoringType = 'chainid', // Default
    palette: ColorPalette = 'standard' // Default
) => {
    const char = res.toUpperCase();

    // 1. Hydrophobicity Mode
    if (coloring === 'hydrophobicity') {
        const val = HYDROPHOBICITY[char];
        if (val !== undefined) {
            // Normalize -4.5 to 4.5 -> 0 to 1
            const norm = (val + 4.5) / 9.0;
            return getPaletteColor(norm, palette);
        }
    }

    if (type === 'nucleic') {
        return NUCLEIC_ACID_COLORS[char] || (isLight ? '#e5e5e5' : '#404040');
    }
    // Default Protein
    return AMINO_ACID_COLORS[char] || (isLight ? '#e5e5e5' : '#404040');
};

const getAtomColor = (element: string, isLight: boolean) => {
    const el = element.toUpperCase();
    return ATOM_COLORS[el] || (isLight ? '#e5e5e5' : '#F472B6'); // Default Pink for others
};

export const SequenceTrack: React.FC<SequenceTrackProps> = ({
    id,
    chains,
    uniprotFeatures,
    highlightedResidue,
    onHoverResidue,
    onClickResidue,
    onClickAtom,
    isLightMode,
    coloring,
    colorPalette
}) => {
    const [activeChainIndex, setActiveChainIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const activeChain = chains[activeChainIndex];
    const activeChainFeatures = (activeChain && uniprotFeatures?.[activeChain.name]) || [];

    // Pre-calculate B-Factor Range for current chain if needed
    const bFactorRange = React.useMemo(() => {
        if (!activeChain || !activeChain.bFactors || coloring !== 'bfactor') return { min: 0, max: 100 };
        let min = Infinity;
        let max = -Infinity;
        activeChain.bFactors.forEach(b => {
            if (b < min) min = b;
            if (b > max) max = b;
        });
        // Avoid division by zero
        if (max === min) max = min + 1;
        return { min, max };
    }, [activeChain, coloring]);

    // Auto-switch chain if highlighting a residue in a different chain (e.g. from 3D click)
    useEffect(() => {
        if (highlightedResidue) {
            const targetIndex = chains.findIndex(c => c.name === highlightedResidue.chain);
            // Only switch if found and different, to allow manual switching
            if (targetIndex !== -1 && targetIndex !== activeChainIndex) {
                setActiveChainIndex(targetIndex);
            }
        }
    }, [highlightedResidue, chains]);

    // Scroll to highlighted residue
    useEffect(() => {
        if (highlightedResidue && activeChain && highlightedResidue.chain === activeChain.name && !activeChain.atoms) {
            // Calculate correct index based on residue numbering
            let index = -1;
            if (activeChain.residueMap) {
                index = activeChain.residueMap.findIndex(r => r === highlightedResidue.resNo);
            } else {
                index = highlightedResidue.resNo - 1;
            }

            if (index !== -1) {
                // Small timeout to ensure DOM is ready after chain switch
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        const element = scrollContainerRef.current.children[0]?.children[index] as HTMLElement;
                        if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                        }
                    }
                }, 100);
            }
        }
    }, [highlightedResidue, activeChain]);

    if (!activeChain) {
        return (
            <div id={id} className={`hidden md:flex relative h-full w-24 rounded-none shrink-0 z-10 border-l
                ${isLightMode ? 'bg-white border-neutral-300' : 'bg-black/90 border-neutral-700'}
                flex-col items-center justify-center gap-2 px-2 text-center`}>
                <Map size={18} className={isLightMode ? 'text-neutral-300' : 'text-neutral-700'} />
                <span className={`text-[9px] leading-tight ${isLightMode ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Load a structure to view its sequence
                </span>
            </div>
        );
    }

    const isAtomView = activeChain.atoms && activeChain.atoms.length > 0;

    return (
        <div id={id} className={`hidden md:flex relative h-full w-24 rounded-none shrink-0 z-10 border-l
            ${isLightMode ? 'bg-white border-neutral-300' : 'bg-black/90 border-neutral-700'} 
            flex-col overflow-hidden`}>

            {/* Header / Tabs - Compact Vertical */}
            <div className={`flex flex-col items-center pt-4 pb-2 gap-6 border-b ${isLightMode ? 'border-neutral-200 bg-white/50' : 'border-neutral-800 bg-black/50'} z-10 flex-shrink-0 backdrop-blur-md`}>
                <div className="flex items-center justify-center w-full" title={isAtomView ? "Atoms" : "Sequence"}>
                    {isAtomView ? (
                        <Atom size={16} className="text-yellow-500" />
                    ) : (
                        <Map size={16} className="text-purple-500" />
                    )}
                </div>

                {chains.length > 1 && (
                    <div className="flex flex-col gap-1 w-full px-2 overflow-y-auto max-h-[20vh] scrollbar-hide items-center">
                        {chains.map((chain, idx) => (
                            <button
                                key={chain.name}
                                onClick={() => setActiveChainIndex(idx)}
                                className={`w-8 h-8 flex items-center justify-center text-[10px] font-bold rounded-full transition-all duration-200 flex-shrink-0
                                    ${activeChainIndex === idx
                                        ? (isAtomView ? 'bg-yellow-600 text-white shadow-md scale-105' : 'bg-purple-600 text-white shadow-md scale-105')
                                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                                title={`Chain ${chain.name}`}
                            >
                                {chain.name || (isAtomView ? 'Mol' : '?')}
                            </button>
                        ))}
                    </div>
                )}

                <div className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5 font-mono font-bold text-center mt-2 mx-auto shadow-sm shadow-indigo-500/5">
                    {isAtomView ? `${activeChain.atoms?.length} atoms` : `${activeChain.sequence.length} res`}
                </div>
            </div>

            {/* Sequence Scroller - Vertical */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-1 select-none scrollbar-hide w-full"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className="flex flex-col items-center w-full gap-1">
                    {isAtomView ? (
                        // Atom View
                        activeChain.atoms!.map((atom, idx) => {
                            const color = getAtomColor(atom.element, isLightMode);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onClickAtom && onClickAtom(atom.serial)}
                                    // Atom hover? Maybe not needed for now
                                    className={`group relative flex items-center gap-2 px-2 w-full h-8 rounded-lg transition-all duration-150 flex-shrink-0 hover:bg-black/5 dark:hover:bg-white/5`}
                                >
                                    {/* Atom Box */}
                                    <span
                                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-mono font-bold shadow-sm transition-transform text-neutral-900`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {atom.element}
                                    </span>
                                    {/* Atom Name/Serial */}
                                    <span className={`text-[10px] font-mono flex-1 text-right text-neutral-400 group-hover:text-white`}>
                                        {atom.name}
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        // Residue View (Updated)
                        activeChain.sequence.split('').map((res, idx) => {
                            const resNo = activeChain.residueMap ? activeChain.residueMap[idx] : idx + 1;
                            const isActive = highlightedResidue?.chain === activeChain.name && highlightedResidue.resNo === resNo;

                            // Determine Color
                            let color = '#ccc';

                            if (coloring === 'hydrophobicity') {
                                const val = HYDROPHOBICITY[res.toUpperCase()];
                                if (val !== undefined) {
                                    // Normalize -4.5 to 4.5 -> 0-1
                                    const norm = (val + 4.5) / 9.0;
                                    color = getPaletteColor(norm, colorPalette);
                                } else {
                                    color = isLightMode ? '#e5e5e5' : '#404040';
                                }
                            } else if (coloring === 'bfactor' && activeChain.bFactors) {
                                const val = activeChain.bFactors[idx] || 0;
                                const range = bFactorRange.max - bFactorRange.min;
                                const norm = range > 0 ? (val - bFactorRange.min) / range : 0;
                                color = getPaletteColor(norm, colorPalette);
                            } else {
                                // Default / Residue Name coloring
                                color = getResidueColor(res, isLightMode, activeChain.type, coloring, colorPalette);
                            }

                            // A residue can fall under more than one annotation (e.g. a
                            // domain AND an active site); show the first match's color
                            // as the indicator and list every match in the tooltip.
                            const matchedFeatures = activeChainFeatures.filter(f => resNo >= f.pdbStart && resNo <= f.pdbEnd);
                            const featureTooltip = matchedFeatures.length > 0
                                ? matchedFeatures.map(f => `${f.type}: ${f.description}`).join('\n')
                                : undefined;

                            return (
                                <button
                                    key={idx}
                                    onMouseEnter={() => onHoverResidue(activeChain.name, resNo)}
                                    onClick={() => onClickResidue(activeChain.name, resNo)}
                                    title={featureTooltip}
                                    className={`group relative flex items-center gap-2 px-2 w-full h-8 rounded-lg transition-all duration-150 flex-shrink-0
                                        ${isActive
                                            ? 'bg-purple-500/20 z-10 ring-2 ring-purple-500 scale-105 shadow-lg shadow-purple-500/10'
                                            : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    {/* UniProt feature indicator */}
                                    {matchedFeatures.length > 0 && (
                                        <span
                                            className="absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full"
                                            style={{ backgroundColor: featureColor(matchedFeatures[0].type) }}
                                        />
                                    )}

                                    {/* Residue Box */}
                                    <span
                                        className={`w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-mono font-bold shadow-sm transition-transform
                                        ${isActive ? 'text-white scale-110 ring-2 ring-white/20' : 'text-neutral-900 dark:text-white'}`}
                                        style={{ backgroundColor: isActive ? '#7c3aed' : color }}
                                    >
                                        {res}
                                    </span>

                                    {/* Residue Number */}
                                    <span className={`text-[10px] font-mono flex-1 text-right ${isActive ? 'text-purple-600 dark:text-purple-300 font-bold' : 'text-neutral-400'}`}>
                                        {resNo}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

        </div>
    );
};
