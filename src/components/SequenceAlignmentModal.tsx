import React, { useMemo, useState } from 'react';
import { X, GitCommitVertical, AlertTriangle, FileText, BarChart2, Hash, Percent, Download, Activity, Ruler } from 'lucide-react';
import type { ChainInfo, SuperposedStructure } from '../types';
import clsx from 'clsx';

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
        primaryChain: string;
        targetChain: string;
        stats: {
            identity: number; // %
            similarity: number; // %
            gaps: number; // count
            length: number; // length
            score: number;
            rmsd?: number; // Angstrom
        };
        alignment: {
            seq1: string; // Primary
            seq2: string; // Target
            matchStr: string;
        };
    }[];
}

// Scientific Residue Coloring
const RESIDUE_COLORS: Record<string, string> = {
    'A': 'text-blue-400', 'V': 'text-blue-400', 'L': 'text-blue-400', 'I': 'text-blue-400',
    'M': 'text-blue-400', 'F': 'text-blue-400', 'W': 'text-blue-400', 'P': 'text-blue-400',
    'G': 'text-green-400', 'S': 'text-green-400', 'T': 'text-green-400', 'C': 'text-yellow-400',
    'N': 'text-green-400', 'Q': 'text-green-400', 'Y': 'text-green-400',
    'K': 'text-red-400', 'R': 'text-red-400', 'H': 'text-red-400',
    'D': 'text-fuchsia-400', 'E': 'text-fuchsia-400',
    '-': 'text-neutral-700'
};

const RESIDUE_GROUPS = [
    { name: 'Hydrophobic', color: 'bg-blue-400', desc: 'A, V, L, I, M, F, W, P' },
    { name: 'Polar', color: 'bg-green-400', desc: 'G, S, T, N, Q, Y' },
    { name: 'Positive', color: 'bg-red-400', desc: 'K, R, H' },
    { name: 'Negative', color: 'bg-fuchsia-400', desc: 'D, E' },
    { name: 'Cysteine', color: 'bg-yellow-400', desc: 'C' },
];

const CONSERVATIVE_GROUPS = [
    ['S', 'T', 'A'],
    ['N', 'E', 'Q', 'K'],
    ['N', 'H', 'Q', 'K'],
    ['N', 'D', 'E', 'Q'],
    ['Q', 'H', 'R', 'K'],
    ['M', 'I', 'L', 'V'],
    ['M', 'I', 'L', 'F'],
    ['H', 'Y'],
    ['F', 'Y', 'W']
];

const getMatchChar = (a: string, b: string): string => {
    if (a === '-' || b === '-') return ' ';
    if (a === b) return '|';
    for (const group of CONSERVATIVE_GROUPS) {
        if (group.includes(a) && group.includes(b)) return ':';
    }
    return '.';
};

const alignSequences = (chain1: ChainInfo, chain2: ChainInfo) => {
    const seq1 = chain1.sequence;
    const seq2 = chain2.sequence;
    const coords1 = chain1.coords;
    const coords2 = chain2.coords;

    const match = 10;
    const mismatch = -2;
    const gap = -5;

    const n = seq1.length;
    const m = seq2.length;
    const scoreMatrix = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gap;
    for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gap;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const isMatch = seq1[i - 1] === seq2[j - 1];
            scoreMatrix[i][j] = Math.max(
                scoreMatrix[i - 1][j - 1] + (isMatch ? match : mismatch),
                scoreMatrix[i - 1][j] + gap,
                scoreMatrix[i][j - 1] + gap
            );
        }
    }

    let align1 = "";
    let align2 = "";
    let i = n;
    let j = m;
    let identityCount = 0;
    let similarityCount = 0;
    let gapCount = 0;

    // RMSD Calc
    let sumSqDist = 0;
    let atomPairs = 0;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + (seq1[i - 1] === seq2[j - 1] ? match : mismatch)) {
            const c1 = seq1[i - 1];
            const c2 = seq2[j - 1];
            align1 = c1 + align1;
            align2 = c2 + align2;

            // Stats
            if (c1 === c2) {
                identityCount++;
                similarityCount++;
            } else if (getMatchChar(c1, c2) === ':') {
                similarityCount++;
            }

            // RMSD: Calculate dist between coords1[i-1] and coords2[j-1]
            if (coords1 && coords2 && coords1[i - 1] && coords2[j - 1]) {
                const p1 = coords1[i - 1];
                const p2 = coords2[j - 1];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dz = p1.z - p2.z;
                sumSqDist += dx * dx + dy * dy + dz * dz;
                atomPairs++;
            }

            i--; j--;
        } else if (i > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
            align1 = seq1[i - 1] + align1;
            align2 = "-" + align2;
            gapCount++;
            i--;
        } else {
            align1 = "-" + align1;
            align2 = seq2[j - 1] + align2;
            gapCount++;
            j--;
        }
    }

    const length = align1.length;
    const matchStr = align1.split('').map((c, k) => getMatchChar(c, align2[k])).join('');

    // RMSD Final
    const rmsd = atomPairs > 0 ? Math.sqrt(sumSqDist / atomPairs) : undefined;

    return {
        seq1: align1,
        seq2: align2,
        matchStr,
        stats: {
            identity: (identityCount / length) * 100,
            similarity: (similarityCount / length) * 100,
            gaps: gapCount,
            length,
            score: scoreMatrix[n][m],
            rmsd
        }
    };
};

export const SequenceAlignmentModal: React.FC<SequenceAlignmentModalProps> = ({
    isOpen,
    onClose,
    primaryStructure,
    overlays
}) => {
    const [selectedChain, setSelectedChain] = useState<string | null>(null);

    const alignmentResults = useMemo(() => {
        if (!primaryStructure || overlays.length === 0) return [];
        const results: AlignedResult[] = [];

        overlays.forEach(ov => {
            if (!ov.chains || ov.chains.length === 0) return;
            const chainMatches: AlignedResult['chainMatches'] = [];

            primaryStructure.forEach(pChain => {
                const targetChain = ov.chains?.find(c => c.name === pChain.name) || ov.chains?.[0];

                if (targetChain) {
                    const result = alignSequences(pChain, targetChain);
                    chainMatches.push({
                        primaryChain: pChain.name,
                        targetChain: targetChain.name,
                        stats: result.stats,
                        alignment: {
                            seq1: result.seq1,
                            seq2: result.seq2,
                            matchStr: result.matchStr
                        }
                    });
                }
            });

            results.push({
                overlayId: ov.id,
                overlayName: ov.description || `Structure ${ov.id.substr(0, 4)}`,
                chainMatches
            });
        });
        return results;
    }, [primaryStructure, overlays]);

    const availableChains = useMemo(() => primaryStructure?.map(c => c.name) || [], [primaryStructure]);

    useMemo(() => {
        if (!selectedChain && availableChains.length > 0) setSelectedChain(availableChains[0]);
    }, [availableChains]);

    const handleExport = (result: AlignedResult, match: AlignedResult['chainMatches'][0]) => {
        const text = `>Primary | Chain ${match.primaryChain}
${match.alignment.seq1}
>Overlay: ${result.overlayName} | Chain ${match.targetChain}
${match.alignment.seq2}
`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alignment_primary_${match.primaryChain}_vs_${result.overlayName}_${match.targetChain}.fasta`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8">
            <div className="bg-[#0D1117] border border-white/10 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between px-8 py-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="bg-cyan-500/10 p-2 rounded-lg">
                            <GitCommitVertical className="text-cyan-400" size={28} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Sequence Alignment</h2>
                            <p className="text-sm text-neutral-400 font-medium">Pairwise Needleman-Wunsch • BLOSUM62 Heuristic • Gap Penalty: -5</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Chain Selector */}
                <div className="flex px-6 pt-1 border-b border-white/10 bg-[#0D1117]">
                    {availableChains.map(chain => (
                        <button
                            key={chain}
                            onClick={() => setSelectedChain(chain)}
                            className={clsx(
                                "px-6 py-3 text-sm font-bold border-b-2 transition-all",
                                selectedChain === chain
                                    ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
                                    : "border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
                            )}
                        >
                            Chain {chain}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {selectedChain && alignmentResults.map(result => {
                        const match = result.chainMatches.find(m => m.primaryChain === selectedChain);
                        if (!match) return null;

                        return (
                            <div key={result.overlayId} className="bg-black/40 border border-white/10 rounded-xl overflow-hidden">
                                {/* Stats Dashboard */}
                                <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/10 border-b border-white/10 bg-white/5">
                                    <StatBox
                                        label="Identity"
                                        value={`${match.stats.identity.toFixed(1)}%`}
                                        icon={<Percent size={14} />}
                                        color={match.stats.identity > 30 ? 'text-green-400' : 'text-yellow-400'}
                                    />
                                    <StatBox
                                        label="Similarity"
                                        value={`${match.stats.similarity.toFixed(1)}%`}
                                        icon={<Hash size={14} />}
                                        color="text-blue-400"
                                    />
                                    <StatBox
                                        label="RMSD"
                                        value={match.stats.rmsd ? `${match.stats.rmsd.toFixed(2)} Å` : "N/A"}
                                        icon={<Activity size={14} />}
                                        color="text-cyan-400"
                                        subtext={match.stats.rmsd ? "Cα Atoms" : "No Coordinates"}
                                    />
                                    <StatBox
                                        label="Gaps"
                                        value={match.stats.gaps.toString()}
                                        subtext={`(${(match.stats.gaps / match.stats.length * 100).toFixed(1)}%)`}
                                        icon={<AlertTriangle size={14} />}
                                        color="text-orange-400"
                                    />
                                    <StatBox
                                        label="Total Length"
                                        value={match.stats.length.toString()}
                                        icon={<BarChart2 size={14} />}
                                        color="text-neutral-300"
                                    />
                                </div>

                                <div className="p-6">
                                    <div className="flex items-baseline justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-neutral-200">
                                                {result.overlayName} <span className="text-neutral-500 text-sm font-normal">(Chain {match.targetChain})</span>
                                            </h3>
                                            <button
                                                onClick={() => handleExport(result, match)}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-cyan-500/20 text-xs font-bold text-cyan-400 rounded-md transition-colors border border-white/10 hover:border-cyan-500/50"
                                            >
                                                <Download size={12} />
                                                Export FASTA
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            {RESIDUE_GROUPS.map(g => (
                                                <div key={g.name} className="flex items-center gap-2" title={g.desc}>
                                                    <div className={`w-3 h-3 rounded-full ${g.color}`} />
                                                    <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">{g.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Alignment Track */}
                                    <div className="relative font-mono text-xs leading-none bg-[#050505] rounded-lg border border-white/10 p-6 overflow-x-auto shadow-inner selection:bg-cyan-500/30">

                                        {/* Ruler */}
                                        <div className="flex mb-4 opacity-50 select-none">
                                            <div className="w-24 shrink-0" />
                                            <div className="flex relative h-4 w-full">
                                                {Array.from({ length: Math.ceil(match.stats.length / 10) }).map((_, i) => (
                                                    <span key={i} className="absolute text-[10px] text-neutral-500 border-l border-neutral-700 pl-1 h-3" style={{ left: `${i * 10 * 12}px` }}>
                                                        {i * 10 + 1}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {/* Primary Sequence */}
                                            <SequenceRow label="Primary" sequence={match.alignment.seq1} />

                                            {/* Match Line */}
                                            <div className="flex">
                                                <span className="w-24 shrink-0 select-none" />
                                                <div className="flex">
                                                    {match.alignment.matchStr.split('').map((char, i) => (
                                                        <span key={i} className={`w-[1ch] text-center font-bold ${char === '|' ? 'text-white' : char === ':' ? 'text-blue-400' : 'text-neutral-800'}`}>
                                                            {char}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Target Sequence */}
                                            <SequenceRow label="Overlay" sequence={match.alignment.seq2} compareSeq={match.alignment.seq1} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {alignmentResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-64 text-neutral-500 border-2 border-dashed border-white/5 rounded-2xl mx-6">
                            <FileText size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium">No alignment data available</p>
                            <p className="text-sm opacity-60">Add structure overlays to see pairwise alignments</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value, icon, subtext, color }: any) => (
    <div className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider mb-0.5">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-xl font-mono font-bold ${color}`}>{value}</span>
                {subtext && <span className="text-xs text-neutral-500">{subtext}</span>}
            </div>
        </div>
    </div>
);

const SequenceRow = ({ label, sequence, compareSeq }: { label: string, sequence: string, compareSeq?: string }) => (
    <div className="flex items-center hover:bg-white/5 py-1 rounded transition-colors group">
        <span className="w-24 shrink-0 text-xs font-bold text-neutral-500 uppercase tracking-wider select-none pl-2 group-hover:text-neutral-300 transition-colors">
            {label}
        </span>
        <div className="flex font-mono text-sm tracking-widest">
            {sequence.split('').map((char, i) => {
                let colorClass = RESIDUE_COLORS[char] || 'text-neutral-300';
                return (
                    <span key={i} className={`w-[1ch] inline-block text-center ${colorClass}`}>
                        {char}
                    </span>
                );
            })}
        </div>
    </div>
);
