import type { ChainInfo } from '../types';

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

// Standard BLOSUM62 substitution matrix (Henikoff & Henikoff 1992), the scoring
// scheme this alignment already claims to use in its UI/PDF labels (saSubtitle,
// the PDF report header). Used for protein chains; nucleic acid chains fall back to
// a simple match/mismatch score further down, since BLOSUM62 only applies to amino
// acids and a flat score is the standard choice for DNA/RNA alignment.
const BLOSUM62_ORDER = 'ARNDCQEGHILKMFPSTWYV';
const BLOSUM62_MATRIX = [
    [4, -1, -2, -2, 0, -1, -1, 0, -2, -1, -1, -1, -1, -2, -1, 1, 0, -3, -2, 0],
    [-1, 5, 0, -2, -3, 1, 0, -2, 0, -3, -2, 2, -1, -3, -2, -1, -1, -3, -2, -3],
    [-2, 0, 6, 1, -3, 0, 0, 0, 1, -3, -3, 0, -2, -3, -2, 1, 0, -4, -2, -3],
    [-2, -2, 1, 6, -3, 0, 2, -1, -1, -3, -4, -1, -3, -3, -1, 0, -1, -4, -3, -3],
    [0, -3, -3, -3, 9, -3, -4, -3, -3, -1, -1, -3, -1, -2, -3, -1, -1, -2, -2, -1],
    [-1, 1, 0, 0, -3, 5, 2, -2, 0, -3, -2, 1, 0, -3, -1, 0, -1, -2, -1, -2],
    [-1, 0, 0, 2, -4, 2, 5, -2, 0, -3, -3, 1, -2, -3, -1, 0, -1, -3, -2, -2],
    [0, -2, 0, -1, -3, -2, -2, 6, -2, -4, -4, -2, -3, -3, -2, 0, -2, -2, -3, -3],
    [-2, 0, 1, -1, -3, 0, 0, -2, 8, -3, -3, -1, -2, -1, -2, -1, -2, -2, 2, -3],
    [-1, -3, -3, -3, -1, -3, -3, -4, -3, 4, 2, -3, 1, 0, -3, -2, -1, -3, -1, 3],
    [-1, -2, -3, -4, -1, -2, -3, -4, -3, 2, 4, -2, 2, 0, -3, -2, -1, -2, -1, 1],
    [-1, 2, 0, -1, -3, 1, 1, -2, -1, -3, -2, 5, -1, -3, -1, 0, -1, -3, -2, -2],
    [-1, -1, -2, -3, -1, 0, -2, -3, -2, 1, 2, -1, 5, 0, -2, -1, -1, -1, -1, 1],
    [-2, -3, -3, -3, -2, -3, -3, -3, -1, 0, 0, -3, 0, 6, -4, -2, -2, 1, 3, -1],
    [-1, -2, -2, -1, -3, -1, -1, -2, -2, -3, -3, -1, -2, -4, 7, -1, -1, -4, -3, -2],
    [1, -1, 1, 0, -1, 0, 0, 0, -1, -2, -2, 0, -1, -2, -1, 4, 1, -3, -2, -2],
    [0, -1, 0, -1, -1, -1, -1, -2, -2, -1, -1, -1, -1, -2, -1, 1, 5, -2, -2, 0],
    [-3, -3, -4, -4, -2, -2, -3, -2, -2, -3, -2, -3, -1, 1, -4, -3, -2, 11, 2, -3],
    [-2, -2, -2, -3, -2, -1, -2, -3, 2, -1, -1, -2, -1, 3, -3, -2, -2, 2, 7, -1],
    [0, -3, -3, -3, -1, -2, -2, -3, -3, 3, 1, -2, 1, -1, -2, -2, 0, -3, -1, 4],
];
const BLOSUM62_INDEX: Record<string, number> = {};
BLOSUM62_ORDER.split('').forEach((c, idx) => { BLOSUM62_INDEX[c] = idx; });

// BLOSUM62 score for a pair of single-letter amino acid codes. Falls back to -4
// (BLOSUM62's typical worst-case off-diagonal magnitude) for any character outside
// the 20 standard residues (ambiguous codes like X, B, Z are rare in PDB sequences).
export const blosum62Score = (a: string, b: string): number => {
    const i = BLOSUM62_INDEX[a.toUpperCase()];
    const j = BLOSUM62_INDEX[b.toUpperCase()];
    if (i === undefined || j === undefined) return a.toUpperCase() === b.toUpperCase() ? 1 : -4;
    return BLOSUM62_MATRIX[i][j];
};

const getMatchChar = (a: string, b: string): string => {
    if (a === '-' || b === '-') return ' ';
    if (a === b) return '|';
    for (const group of CONSERVATIVE_GROUPS) {
        if (group.includes(a) && group.includes(b)) return ':';
    }
    return '.';
};

export const alignSequences = (chain1: ChainInfo, chain2: ChainInfo) => {
    const seq1 = chain1.sequence;
    const seq2 = chain2.sequence;
    const coords1 = chain1.coords;
    const coords2 = chain2.coords;

    // BLOSUM62 only applies to amino acids — nucleic acid chains (DNA/RNA) use a
    // simple match/mismatch score instead, the standard choice for that case.
    const isNucleic = chain1.type === 'nucleic' || chain2.type === 'nucleic';
    const match = 10;
    const mismatch = -2;
    const gap = -5;
    const pairScore = (a: string, b: string) => isNucleic ? (a === b ? match : mismatch) : blosum62Score(a, b);

    const n = seq1.length;
    const m = seq2.length;
    const scoreMatrix = Array(n + 1).fill(0).map(() => Array(m + 1).fill(0));

    for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gap;
    for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gap;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            scoreMatrix[i][j] = Math.max(
                scoreMatrix[i - 1][j - 1] + pairScore(seq1[i - 1], seq2[j - 1]),
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

    let sumSqDist = 0;
    let atomPairs = 0;
    // Per-residue structural deviation, keyed by chain2's (the second
    // argument's) PDB residue number — lets a caller visualize WHERE a fit
    // is good or bad, not just the single aggregate RMSD number.
    const perResidueDeviations: { resNo: number; distance: number }[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + pairScore(seq1[i - 1], seq2[j - 1])) {
            const c1 = seq1[i - 1];
            const c2 = seq2[j - 1];
            align1 = c1 + align1;
            align2 = c2 + align2;

            if (c1 === c2) {
                identityCount++;
                similarityCount++;
            } else if (getMatchChar(c1, c2) === ':') {
                similarityCount++;
            }

            if (coords1 && coords2 && coords1[i - 1] && coords2[j - 1]) {
                const p1 = coords1[i - 1];
                const p2 = coords2[j - 1];
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const dz = p1.z - p2.z;
                const sqDist = dx * dx + dy * dy + dz * dz;
                sumSqDist += sqDist;
                atomPairs++;

                const resNo = chain2.residueMap?.[j - 1];
                if (typeof resNo === 'number') {
                    perResidueDeviations.push({ resNo, distance: Math.sqrt(sqDist) });
                }
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
            rmsd,
            perResidueDeviations
        }
    };
};

// Maps a per-residue structural deviation to a green(low)-yellow-red(high)
// RGB color, the common "good fit / poor fit" convention — intuitive
// without needing a legend. maxDistance bounds the scale (typically the
// largest deviation seen across the aligned region) so contrast adapts per
// overlay; values beyond it saturate to red.
export function deviationToColor(distance: number, maxDistance: number): number {
    const norm = maxDistance > 0 ? Math.max(0, Math.min(1, distance / maxDistance)) : 0;
    if (norm <= 0.5) {
        // green -> yellow
        const t = norm / 0.5;
        const r = Math.round(255 * t);
        return (r << 16) | (255 << 8) | 0;
    }
    // yellow -> red
    const t = (norm - 0.5) / 0.5;
    const g = Math.round(255 * (1 - t));
    return (255 << 16) | (g << 8) | 0;
}
