// SIFTS (Structure Integration with Function, Taxonomy and Sequence) is EBI's
// residue-level mapping between a PDB entry's author-numbered residues and
// the UniProt accession(s)/sequence positions that chain corresponds to.
//
// This exists because UniProt's own feature positions (domains, active
// sites, binding sites...) are numbered against the canonical UniProt
// sequence, which routinely does NOT match PDB author numbering — expression
// tags, engineered constructs, missing/disordered residues, and multi-chain
// entries all shift the two numbering schemes apart. Resolving a PDB ID's
// UniProt accession via a free-text search (as the pre-existing, unused
// fetchUniProtData in uniprot.ts did) also can't tell you which chain an
// accession applies to, or how to translate a feature's range onto it.
// SIFTS is the standard, authoritative source for both.
export interface SiftsSegment {
    chain: string;
    pdbStart: number;
    pdbEnd: number;
    unpStart: number;
    unpEnd: number;
}

// accession -> every PDB-chain segment SIFTS maps it onto (an accession can
// cover multiple chains, and a chain can be covered by multiple segments if
// there are gaps in the deposited structure).
export type SiftsMapping = Record<string, SiftsSegment[]>;

export async function fetchSiftsMapping(pdbId: string): Promise<SiftsMapping | null> {
    try {
        const id = pdbId.trim().toLowerCase();
        const response = await fetch(`https://www.ebi.ac.uk/pdbe/api/mappings/uniprot/${id}`);
        if (!response.ok) throw new Error('SIFTS mapping fetch failed');

        const data = await response.json();
        const uniprotBlock = data?.[id]?.UniProt;
        if (!uniprotBlock || typeof uniprotBlock !== 'object') return null;

        const mapping: SiftsMapping = {};
        for (const accession of Object.keys(uniprotBlock)) {
            const rawMappings = uniprotBlock[accession]?.mappings;
            if (!Array.isArray(rawMappings)) continue;

            const segments: SiftsSegment[] = [];
            for (const m of rawMappings) {
                const chain = m?.chain_id ?? m?.struct_asym_id;
                const pdbStart = m?.start?.author_residue_number;
                const pdbEnd = m?.end?.author_residue_number;
                const unpStart = m?.unp_start;
                const unpEnd = m?.unp_end;
                if (
                    typeof chain !== 'string' ||
                    typeof pdbStart !== 'number' || typeof pdbEnd !== 'number' ||
                    typeof unpStart !== 'number' || typeof unpEnd !== 'number'
                ) continue;
                segments.push({ chain, pdbStart, pdbEnd, unpStart, unpEnd });
            }
            if (segments.length > 0) mapping[accession] = segments;
        }

        return Object.keys(mapping).length > 0 ? mapping : null;
    } catch (error) {
        console.error('SIFTS mapping fetch error:', error);
        return null;
    }
}

// Converts a UniProt-numbered residue range into the PDB chain(s)/range(s)
// it falls within, via a linear per-segment offset. A feature spanning a gap
// between two segments (or only partially covered by the deposited
// structure) is clipped to each segment it overlaps, which can legitimately
// produce zero, one, or multiple results for a single input range.
export function mapUnpRangeToPdb(
    segments: SiftsSegment[],
    unpStart: number,
    unpEnd: number
): Array<{ chain: string; start: number; end: number }> {
    const results: Array<{ chain: string; start: number; end: number }> = [];
    for (const seg of segments) {
        const overlapStart = Math.max(unpStart, seg.unpStart);
        const overlapEnd = Math.min(unpEnd, seg.unpEnd);
        if (overlapStart > overlapEnd) continue;

        const offset = seg.pdbStart - seg.unpStart;
        results.push({ chain: seg.chain, start: overlapStart + offset, end: overlapEnd + offset });
    }
    return results;
}
