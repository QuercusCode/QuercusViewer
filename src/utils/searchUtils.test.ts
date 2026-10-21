import { describe, it, expect, vi } from 'vitest';
import { findMotifs } from './searchUtils';
import type { ChainInfo } from '../types';

// Helper to build a minimal ChainInfo fixture with only the fields findMotifs cares about.
const makeChain = (overrides: Partial<ChainInfo> & { name: string; min: number; max: number; sequence: string }): ChainInfo => ({
    ...overrides,
});

describe('findMotifs', () => {
    describe('pattern validation / early-exit behavior', () => {
        it('returns [] for an empty string pattern', () => {
            const chains: ChainInfo[] = [makeChain({ name: 'A', min: 1, max: 8, sequence: 'ACDRGDFG' })];
            expect(findMotifs(chains, '')).toEqual([]);
        });

        it('returns [] for a whitespace-only pattern', () => {
            const chains: ChainInfo[] = [makeChain({ name: 'A', min: 1, max: 8, sequence: 'ACDRGDFG' })];
            expect(findMotifs(chains, '   ')).toEqual([]);
        });

        it('returns [] (without throwing) for a pattern that is invalid regex after cleaning', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const chains: ChainInfo[] = [makeChain({ name: 'A', min: 1, max: 8, sequence: 'ACDRGDFG' })];
            // '[' has no whitespace/dash/x/X/? to strip, so it stays '[' which is an
            // unbalanced-bracket regex and throws a SyntaxError from `new RegExp`.
            expect(() => findMotifs(chains, '[')).not.toThrow();
            expect(findMotifs(chains, '[')).toEqual([]);
            warnSpy.mockRestore();
        });

        it('returns [] when there are no chains at all', () => {
            expect(findMotifs([], 'RGD')).toEqual([]);
        });

        it('skips chains with an empty sequence without throwing', () => {
            const chains: ChainInfo[] = [makeChain({ name: 'EMPTY', min: 1, max: 1, sequence: '' })];
            expect(findMotifs(chains, 'RGD')).toEqual([]);
        });
    });

    describe('basic matching with residueMap (fixture 1: ACDRGDFG / RGD)', () => {
        // sequence index:      0123 4567
        // sequence:            ACDR GDFG
        // residueMap:          [1,2,3,4,5,6,7,8]
        // 'RGD' occurs at seq indices 3,4,5 -> residue numbers 4,5,6
        const chain: ChainInfo = makeChain({
            name: 'A',
            min: 1,
            max: 10,
            sequence: 'ACDRGDFG',
            residueMap: [1, 2, 3, 4, 5, 6, 7, 8],
        });

        it('finds exactly one match for pattern "RGD"', () => {
            const results = findMotifs([chain], 'RGD');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'A',
                startIndex: 3,
                endIndex: 5,
                startResNo: 4,
                endResNo: 6,
                sequence: 'RGD',
                residues: [4, 5, 6],
            });
        });

        it('produces an identical match when the pattern uses dash separators ("R-G-D")', () => {
            const results = findMotifs([chain], 'R-G-D');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'A',
                startIndex: 3,
                endIndex: 5,
                startResNo: 4,
                endResNo: 6,
                sequence: 'RGD',
                residues: [4, 5, 6],
            });
        });

        it('produces an identical match when the pattern uses spaces as separators ("R G D")', () => {
            const results = findMotifs([chain], 'R G D');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'A',
                startIndex: 3,
                endIndex: 5,
                startResNo: 4,
                endResNo: 6,
                sequence: 'RGD',
                residues: [4, 5, 6],
            });
        });

        it('matches case-insensitively ("rgd")', () => {
            const results = findMotifs([chain], 'rgd');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'A',
                startIndex: 3,
                endIndex: 5,
                startResNo: 4,
                endResNo: 6,
                sequence: 'RGD',
                residues: [4, 5, 6],
            });
        });
    });

    describe('wildcard handling ("x"/"X"/"?" -> ".") with multiple matches', () => {
        // sequence index: 0123 45
        // sequence:       ABCA BC
        // residueMap:     [1,2,3,4,5,6]
        //
        // Pattern "A.C" (or equivalently "AxC"): at index 0 -> 'A','B','C' = match "ABC"
        // (wildcard '.' absorbs 'B'). Global regex advances lastIndex to 3 (end of match),
        // so the next scan starts at index 3: 'A','B','C' = match "ABC" again.
        // That's it: index 1 ('B'), index 2 ('C') aren't valid start positions since the
        // pattern requires literal 'A' first and global exec never re-checks positions
        // already consumed by the previous match.
        const chain: ChainInfo = makeChain({
            name: 'W',
            min: 1,
            max: 6,
            sequence: 'ABCABC',
            residueMap: [1, 2, 3, 4, 5, 6],
        });

        it('finds two non-overlapping matches for pattern "A.C"', () => {
            const results = findMotifs([chain], 'A.C');
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                chain: 'W',
                startIndex: 0,
                endIndex: 2,
                startResNo: 1,
                endResNo: 3,
                sequence: 'ABC',
                residues: [1, 2, 3],
            });
            expect(results[1]).toEqual({
                chain: 'W',
                startIndex: 3,
                endIndex: 5,
                startResNo: 4,
                endResNo: 6,
                sequence: 'ABC',
                residues: [4, 5, 6],
            });
        });

        it('produces the identical result for the equivalent "x"-wildcard pattern "AxC"', () => {
            const resultsX = findMotifs([chain], 'AxC');
            const resultsDot = findMotifs([chain], 'A.C');
            expect(resultsX).toEqual(resultsDot);
            expect(resultsX).toHaveLength(2);
        });

        it('also accepts "X" (uppercase) and "?" as wildcard characters with the same result', () => {
            const resultsUpperX = findMotifs([chain], 'AXC');
            const resultsQuestion = findMotifs([chain], 'A?C');
            const resultsDot = findMotifs([chain], 'A.C');
            expect(resultsUpperX).toEqual(resultsDot);
            expect(resultsQuestion).toEqual(resultsDot);
        });
    });

    describe('residueMap fallback (fixture 5: no residueMap present)', () => {
        // sequence index: 012345
        // sequence:       ABCDEF
        // min: 100 (no residueMap) -> startResNo/endResNo fall back to chain.min + seqIndex
        // 'CDE' occurs at seq indices 2,3,4 -> fallback residue numbers 102,103,104
        const chain: ChainInfo = makeChain({
            name: 'B',
            min: 100,
            max: 105,
            sequence: 'ABCDEF',
        });

        it('falls back to chain.min + seqIndex when residueMap is absent', () => {
            const results = findMotifs([chain], 'CDE');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'B',
                startIndex: 2,
                endIndex: 4,
                startResNo: 102,
                endResNo: 104,
                sequence: 'CDE',
                residues: [102, 103, 104],
            });
        });
    });

    describe('multiple chains', () => {
        const chainWithMatch: ChainInfo = makeChain({
            name: 'A',
            min: 1,
            max: 8,
            sequence: 'ACDRGDFG',
            residueMap: [1, 2, 3, 4, 5, 6, 7, 8],
        });
        const chainWithoutMatch: ChainInfo = makeChain({
            name: 'C',
            min: 1,
            max: 4,
            sequence: 'AAAA',
            residueMap: [1, 2, 3, 4],
        });

        it('only returns matches from the chain(s) that actually contain the motif, tagged with the right chain name', () => {
            const results = findMotifs([chainWithMatch, chainWithoutMatch], 'RGD');
            expect(results).toHaveLength(1);
            expect(results[0].chain).toBe('A');
            expect(results[0].sequence).toBe('RGD');
        });

        it('returns [] when no chain contains the motif', () => {
            const results = findMotifs([chainWithMatch, chainWithoutMatch], 'ZZZ');
            expect(results).toEqual([]);
        });

        it('collects matches from more than one chain when both contain the motif, in chain order', () => {
            const secondChainWithMatch: ChainInfo = makeChain({
                name: 'D',
                min: 1,
                max: 8,
                sequence: 'XXRGDXX',
                residueMap: [1, 2, 3, 4, 5, 6, 7],
            });
            const results = findMotifs([chainWithMatch, secondChainWithMatch], 'RGD');
            expect(results).toHaveLength(2);
            expect(results[0].chain).toBe('A');
            expect(results[1].chain).toBe('D');
        });
    });

    describe('regex semantics of the cleaned pattern', () => {
        it('advances past each match (no overlapping-within matches) for "AA" on "AAAA"', () => {
            // 'AAAA' against /AA/gi: match at index 0 ("AA"), lastIndex becomes 2;
            // next match at index 2 ("AA"), lastIndex becomes 4; no third match.
            const chain: ChainInfo = makeChain({
                name: 'R',
                min: 1,
                max: 4,
                sequence: 'AAAA',
                residueMap: [1, 2, 3, 4],
            });
            const results = findMotifs([chain], 'AA');
            expect(results).toHaveLength(2);
            expect(results[0]).toMatchObject({ startIndex: 0, endIndex: 1, sequence: 'AA' });
            expect(results[1]).toMatchObject({ startIndex: 2, endIndex: 3, sequence: 'AA' });
        });

        it('supports regex quantifier syntax (e.g. "{2,3}") passed through untouched', () => {
            // Pattern 'A{2,3}' has no whitespace/dash/x/X/? so it is passed to RegExp verbatim.
            // Against 'AAAABC': greedy match at index 0 takes the max allowed (3 A's) -> "AAA".
            // The engine then resumes scanning from index 3, where only a single 'A' remains
            // before 'B', which is below the minimum of 2, so no further match is found.
            const chain: ChainInfo = makeChain({
                name: 'Q',
                min: 1,
                max: 6,
                sequence: 'AAAABC',
                residueMap: [1, 2, 3, 4, 5, 6],
            });
            const results = findMotifs([chain], 'A{2,3}');
            expect(results).toHaveLength(1);
            expect(results[0]).toEqual({
                chain: 'Q',
                startIndex: 0,
                endIndex: 2,
                startResNo: 1,
                endResNo: 3,
                sequence: 'AAA',
                residues: [1, 2, 3],
            });
        });
    });

    describe('no-match cases', () => {
        it('returns [] when the pattern does not occur in any chain sequence', () => {
            const chains: ChainInfo[] = [
                makeChain({ name: 'A', min: 1, max: 8, sequence: 'ACDRGDFG', residueMap: [1, 2, 3, 4, 5, 6, 7, 8] }),
            ];
            expect(findMotifs(chains, 'WWWW')).toEqual([]);
        });
    });
});
