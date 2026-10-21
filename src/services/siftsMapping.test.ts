import { describe, it, expect } from 'vitest';
import { mapUnpRangeToPdb, type SiftsSegment } from './siftsMapping';

describe('mapUnpRangeToPdb', () => {
    it('maps a UniProt range onto PDB numbering via a simple offset', () => {
        // PDB residues 1-137 correspond to UniProt residues 16-152 (offset -15),
        // e.g. an N-terminal expression tag/signal peptide trimmed before crystallization.
        const segments: SiftsSegment[] = [{ chain: 'A', pdbStart: 1, pdbEnd: 137, unpStart: 16, unpEnd: 152 }];

        expect(mapUnpRangeToPdb(segments, 108, 108)).toEqual([{ chain: 'A', start: 93, end: 93 }]);
        expect(mapUnpRangeToPdb(segments, 20, 30)).toEqual([{ chain: 'A', start: 5, end: 15 }]);
    });

    it('clips a feature range to the segment when it only partially overlaps', () => {
        const segments: SiftsSegment[] = [{ chain: 'A', pdbStart: 1, pdbEnd: 100, unpStart: 1, unpEnd: 100 }];

        // Feature spans 90-110, but only 90-100 was actually resolved/deposited.
        expect(mapUnpRangeToPdb(segments, 90, 110)).toEqual([{ chain: 'A', start: 90, end: 100 }]);
    });

    it('returns no result when the range falls entirely outside every segment', () => {
        const segments: SiftsSegment[] = [{ chain: 'A', pdbStart: 1, pdbEnd: 50, unpStart: 1, unpEnd: 50 }];

        expect(mapUnpRangeToPdb(segments, 200, 210)).toEqual([]);
    });

    it('can produce multiple PDB ranges when a feature spans a gap between two segments', () => {
        // A disordered loop (UniProt 46-54) was never deposited, splitting the chain
        // into two SIFTS segments that both happen to be offset by the same amount.
        const segments: SiftsSegment[] = [
            { chain: 'A', pdbStart: 1, pdbEnd: 45, unpStart: 1, unpEnd: 45 },
            { chain: 'A', pdbStart: 46, pdbEnd: 100, unpStart: 55, unpEnd: 109 },
        ];

        expect(mapUnpRangeToPdb(segments, 40, 60)).toEqual([
            { chain: 'A', start: 40, end: 45 },
            { chain: 'A', start: 46, end: 51 },
        ]);
    });

    it('maps each chain independently when a single accession covers multiple chains', () => {
        const segments: SiftsSegment[] = [
            { chain: 'A', pdbStart: 1, pdbEnd: 100, unpStart: 1, unpEnd: 100 },
            { chain: 'B', pdbStart: 1, pdbEnd: 100, unpStart: 1, unpEnd: 100 },
        ];

        expect(mapUnpRangeToPdb(segments, 10, 20)).toEqual([
            { chain: 'A', start: 10, end: 20 },
            { chain: 'B', start: 10, end: 20 },
        ]);
    });
});
