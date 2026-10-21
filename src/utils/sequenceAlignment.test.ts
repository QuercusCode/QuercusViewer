import { describe, it, expect } from 'vitest';
import { blosum62Score, alignSequences } from './sequenceAlignment';
import type { ChainInfo } from '../types';

describe('blosum62Score', () => {
    it('returns the standard BLOSUM62 self-score for tryptophan (W-W), the highest self-score in the matrix', () => {
        expect(blosum62Score('W', 'W')).toBe(11);
    });

    it('returns the standard BLOSUM62 self-score for cysteine (C-C)', () => {
        expect(blosum62Score('C', 'C')).toBe(9);
    });

    it('returns the standard BLOSUM62 self-score for alanine (A-A)', () => {
        expect(blosum62Score('A', 'A')).toBe(4);
    });

    it('returns a positive similarity score for R-K, both positively charged, despite being a mismatch', () => {
        expect(blosum62Score('R', 'K')).toBe(2);
    });

    it('returns a positive similarity score for D-E, both negatively charged, despite being a mismatch', () => {
        expect(blosum62Score('D', 'E')).toBe(2);
    });

    it('returns a negative score for W-G, a very dissimilar pair', () => {
        expect(blosum62Score('W', 'G')).toBe(-2);
    });

    it('is symmetric: score(a,b) === score(b,a) across a handful of pairs', () => {
        const pairs: [string, string][] = [
            ['A', 'R'], ['W', 'G'], ['R', 'K'], ['D', 'E'], ['C', 'W'], ['N', 'H'], ['Q', 'Y'],
        ];
        for (const [a, b] of pairs) {
            expect(blosum62Score(a, b)).toBe(blosum62Score(b, a));
        }
    });

    it('is case-insensitive', () => {
        expect(blosum62Score('a', 'r')).toBe(blosum62Score('A', 'R'));
        expect(blosum62Score('w', 'w')).toBe(blosum62Score('W', 'W'));
    });

    it('falls back to 1 for a self-match of a character outside the 20 standard residues (e.g. X)', () => {
        expect(blosum62Score('X', 'X')).toBe(1);
    });

    it('falls back to -4 for a mismatch involving a character outside the 20 standard residues (e.g. X vs A)', () => {
        expect(blosum62Score('X', 'A')).toBe(-4);
    });
});

describe('alignSequences', () => {
    const makeChain = (overrides: Partial<ChainInfo> & { sequence: string }): ChainInfo => ({
        name: 'A',
        min: 1,
        max: overrides.sequence.length,
        ...overrides,
    });

    it('aligns identical protein sequences with 100% identity and no gaps', () => {
        const chain1 = makeChain({ sequence: 'ACDEFG' });
        const chain2 = makeChain({ sequence: 'ACDEFG' });

        const result = alignSequences(chain1, chain2);

        expect(result.stats.identity).toBe(100);
        expect(result.stats.gaps).toBe(0);
        expect(result.stats.length).toBe(6);
        expect(result.seq1).toBe('ACDEFG');
        expect(result.seq2).toBe('ACDEFG');
    });

    it('inserts exactly one gap for a single-residue insertion/deletion and reports ~83.33% identity', () => {
        // chain1 has an extra 'E' that chain2 lacks: A-C-D-[E]-F-G vs A-C-D-F-G
        const chain1 = makeChain({ sequence: 'ACDEFG' });
        const chain2 = makeChain({ sequence: 'ACDFG' });

        const result = alignSequences(chain1, chain2);

        // Hand-verified via Needleman-Wunsch backtrace: the optimal alignment is
        // ACDEFG
        // ACD-FG
        // i.e. the single gap lands in seq2 (the shorter original sequence).
        expect(result.seq1).toBe('ACDEFG');
        expect(result.seq2).toBe('ACD-FG');
        expect(result.stats.length).toBe(6);
        expect(result.stats.gaps).toBe(1);
        // 5 identical positions (A,C,D,F,G) out of 6 alignment columns.
        expect(result.stats.identity).toBeCloseTo(83.33, 1);
    });

    it('uses flat match/mismatch scoring (not BLOSUM62) for nucleic acid chains', () => {
        const chain1 = makeChain({ sequence: 'ACGT', type: 'nucleic' });
        const chain2 = makeChain({ sequence: 'ACGT', type: 'nucleic' });

        const result = alignSequences(chain1, chain2);

        expect(result.stats.identity).toBe(100);
        expect(result.stats.gaps).toBe(0);
        // 4 matching positions * flat match score of 10 (not BLOSUM62, which would
        // give a different total) = 40.
        expect(result.stats.score).toBe(40);
    });

    it('leaves rmsd undefined when neither chain provides coords', () => {
        const chain1 = makeChain({ sequence: 'ACDEFG' });
        const chain2 = makeChain({ sequence: 'ACDEFG' });

        const result = alignSequences(chain1, chain2);

        expect(result.stats.rmsd).toBeUndefined();
    });

    it('computes rmsd of exactly 0 for identical sequences with identical coords', () => {
        const coords = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 3, y: 0, z: 0 },
        ];
        const chain1 = makeChain({ sequence: 'ACDE', coords });
        const chain2 = makeChain({ sequence: 'ACDE', coords: coords.map(c => ({ ...c })) });

        const result = alignSequences(chain1, chain2);

        expect(result.stats.rmsd).toBeCloseTo(0, 10);
    });

    it('computes rmsd of exactly 1.0 when every coordinate pair is offset by a fixed distance of 1', () => {
        const coords1 = [
            { x: 0, y: 0, z: 0 },
            { x: 1, y: 0, z: 0 },
            { x: 2, y: 0, z: 0 },
            { x: 3, y: 0, z: 0 },
        ];
        const coords2 = coords1.map(c => ({ x: c.x + 1, y: c.y, z: c.z }));
        const chain1 = makeChain({ sequence: 'ACDE', coords: coords1 });
        const chain2 = makeChain({ sequence: 'ACDE', coords: coords2 });

        const result = alignSequences(chain1, chain2);

        // Every aligned pair has Euclidean distance exactly 1.0 (shifted only on x),
        // so sqrt(mean(1^2)) = 1.0 for all 4 aligned positions.
        expect(result.stats.rmsd).toBeCloseTo(1.0, 10);
    });
});
