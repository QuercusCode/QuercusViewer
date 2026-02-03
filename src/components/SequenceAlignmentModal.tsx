
import React, { useMemo, useState } from 'react';
import { X, GitCommitVertical, AlertTriangle } from 'lucide-react';
import type { ChainInfo, SuperposedStructure } from '../types';

interface SequenceAlignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    primaryStructure?: ChainInfo[];
    overlays: SuperposedStructure[];
}

interface AlignedResult {
    overlayId: string;
    overlayName: string;
    chainMatches: {
        primaryChain: string; // e.g. "A"
        targetChain: string;  // e.g. "A"
        score: number;
        alignment: {
            seq1: string; // Primary (with gaps)
            seq2: string; // Target (with gaps)
            identity: number; // Percent
        };
    }[];
}

// Basic Needleman-Wunsch Implementation
const alignSequences = (seq1: string, seq2: string) => {
    const match = 1;
    const mismatch = -1;
    const gap = -2;

    const n = seq1.length;
    const m = seq2.length;

    // Create matrix
    const score = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

    // Initialize
    for (let i = 0; i <= n; i++) score[i][0] = i * gap;
    for (let j = 0; j <= m; j++) score[0][j] = j * gap;

    // Fill
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const isMatch = seq1[i - 1] === seq2[j - 1];
            score[i][j] = Math.max(
                score[i - 1][j - 1] + (isMatch ? match : mismatch),
                score[i - 1][j] + gap,
                score[i][j - 1] + gap
            );
        }
    }

    // Traceback
    let align1 = "";
    let align2 = "";
    let i = n;
    let j = m;
    let matches = 0;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && score[i][j] === score[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? match : mismatch)) {
            align1 = seq1[i - 1] + align1;
            align2 = seq2[j - 1] + align2;
            if (seq1[i - 1] === seq2[j - 1]) matches++;
            i--;
            j--;
        } else if (i > 0 && score[i][j] === score[i - 1][j] + gap) {
            align1 = seq1[i - 1] + align1;
            align2 = "-" + align2;
            i--;
        } else {
            align1 = "-" + align1;
            align2 = seq2[j - 1] + align2;
            j--;
        }
    }

    return {
        seq1: align1,
        seq2: align2,
        identity: matches / Math.max(align1.length, 1) * 100
    };
};

export const SequenceAlignmentModal: React.FC<SequenceAlignmentModalProps> = ({
    isOpen,
    onClose,
    primaryStructure,
    overlays
}) => {
    const [selectedChain, setSelectedChain] = useState<string | null>(null);

    // Perform Alignments Memoized
    const alignmentResults = useMemo(() => {
        if (!primaryStructure || overlays.length === 0) return [];

        const results: AlignedResult[] = [];

        overlays.forEach(ov => {
            if (!ov.chains || ov.chains.length === 0) return;

            const chainMatches: AlignedResult['chainMatches'] = [];

            // Simple heuristic mapping: Match Chain A to Chain A
            primaryStructure.forEach(pChain => {
                const targetChain = ov.chains?.find(c => c.name === pChain.name) || ov.chains?.[0]; // Fallback to first if mismatch

                if (targetChain) {
                    const alignment = alignSequences(pChain.sequence, targetChain.sequence);
                    chainMatches.push({
                        primaryChain: pChain.name,
                        targetChain: targetChain.name,
                        score: alignment.identity,
                        alignment
                    });
                }
            });

            results.push({
                overlayId: ov.id,
                overlayName: ov.description || ov.id,
                chainMatches
            });
        });

        return results;
    }, [primaryStructure, overlays]);


    // Determine unique chains present in primary structure to filter tabs
    const availableChains = useMemo(() => {
        return primaryStructure?.map(c => c.name) || [];
    }, [primaryStructure]);

    // Set default tab
    useMemo(() => {
        if (!selectedChain && availableChains.length > 0) {
            setSelectedChain(availableChains[0]);
        }
    }, [availableChains]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-neutral-900 border border-neutral-700/50 rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50">
                    <div className="flex items-center gap-3">
                        <GitCommitVertical className="text-cyan-400" size={24} />
                        <div>
                            <h2 className="text-lg font-bold text-white">Sequence Alignment</h2>
                            <p className="text-xs text-neutral-400">Pairwise alignment against primary structure (Needleman-Wunsch)</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Chain Selector Tabs */}
                <div className="flex gap-1 px-6 pt-4 border-b border-neutral-800 pb-0 overflow-x-auto scrollbar-hide">
                    {availableChains.map(chain => (
                        <button
                            key={chain}
                            onClick={() => setSelectedChain(chain)}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${selectedChain === chain
                                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                                : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                                }`}
                        >
                            Chain {chain}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#0d1117]">
                    {selectedChain && alignmentResults.map(result => {
                        const match = result.chainMatches.find(m => m.primaryChain === selectedChain);
                        if (!match) return null;

                        return (
                            <div key={result.overlayId} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-neutral-200">
                                        vs. {result.overlayName} <span className="text-neutral-500 font-normal">(Chain {match.targetChain})</span>
                                    </h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${match.score > 80 ? 'bg-green-500/20 text-green-400' : match.score > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {match.score.toFixed(1)}% Identity
                                    </span>
                                </div>

                                <div className="font-mono text-[10px] sm:text-xs leading-relaxed bg-black/30 p-4 rounded-lg border border-neutral-800 overflow-x-auto">
                                    {/* Primary Seq */}
                                    <div className="whitespace-pre flex">
                                        <span className="w-20 inline-block text-neutral-500 shrink-0 select-none">Primary:</span>
                                        <div className="flex">
                                            {match.alignment.seq1.split('').map((char, i) => (
                                                <span key={i} className={`w-[8px] sm:w-[9px] text-center inline-block ${char === '-' ? 'text-neutral-700' : 'text-cyan-200'}`}>{char}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Match Line */}
                                    <div className="whitespace-pre flex my-0.5">
                                        <span className="w-20 inline-block shrink-0 select-none"></span>
                                        <div className="flex">
                                            {match.alignment.seq1.split('').map((c1, i) => {
                                                const c2 = match.alignment.seq2[i];
                                                const isMatch = c1 === c2 && c1 !== '-';
                                                return (
                                                    <span key={i} className={`w-[8px] sm:w-[9px] text-center inline-block font-bold ${isMatch ? 'text-white' : 'text-transparent'}`}>
                                                        {isMatch ? '|' : '.'}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Overlay Seq */}
                                    <div className="whitespace-pre flex">
                                        <span className="w-20 inline-block text-neutral-500 shrink-0 select-none">Overlay:</span>
                                        <div className="flex">
                                            {match.alignment.seq2.split('').map((char, i) => {
                                                const c1 = match.alignment.seq1[i];
                                                const isMismatch = char !== '-' && c1 !== '-' && char !== c1;
                                                return (
                                                    <span key={i} className={`w-[8px] sm:w-[9px] text-center inline-block ${char === '-' ? 'text-neutral-700' : isMismatch ? 'text-red-400 font-bold' : 'text-neutral-300'}`}>
                                                        {char}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {alignmentResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-neutral-500">
                            <AlertTriangle size={48} className="mb-4 opacity-50" />
                            <p>No alignment data available. Please add overlays first.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
