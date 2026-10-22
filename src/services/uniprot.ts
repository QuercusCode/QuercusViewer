import type { RelatedPdbEntry } from '../types';

export interface UniProtFeature {
    type: string;
    description: string;
    begin: string;
    end: string;
}

export interface UniProtData {
    accession: string;
    id: string;
    proteinName: string;
    geneName: string;
    organism: string;
    function: string;
    features: UniProtFeature[];
    relatedPdbEntries: RelatedPdbEntry[];
}

const FIELDS = 'accession,id,protein_name,gene_names,organism_name,cc_function,ft_act_site,ft_binding,ft_site,ft_mutagen,ft_domain,xref_pdb';

// Shape of the fields this module actually requests (see FIELDS above) from
// UniProt's REST API — not the full UniProtKB entry schema.
interface RawUniProtFeature {
    type: string;
    description?: string;
    location?: { start?: { value?: number }; end?: { value?: number } };
}

interface RawUniProtComment {
    commentType: string;
    texts?: { value: string }[];
}

// rcsb_chem_comp_descriptor-style gotcha, UniProt edition: `properties` is an
// ARRAY of {key, value} pairs, not a pre-keyed object — every real-world
// consumer of this API reduces it into a lookup before reading fields like
// "Method"/"Resolution"/"Chains" off it, and so do we (see below).
interface RawUniProtCrossReference {
    database: string;
    id: string;
    properties?: { key: string; value: string }[];
}

interface RawUniProtResult {
    primaryAccession: string;
    uniProtkbId: string;
    proteinDescription?: { recommendedName?: { fullName?: { value?: string } } };
    genes?: { geneName?: { value?: string } }[];
    organism?: { scientificName?: string };
    comments?: RawUniProtComment[];
    features?: RawUniProtFeature[];
    uniProtKBCrossReferences?: RawUniProtCrossReference[];
}

function parseRelatedPdbEntries(crossReferences: RawUniProtCrossReference[] | undefined): RelatedPdbEntry[] {
    return (crossReferences ?? [])
        .filter(ref => ref.database === 'PDB' && typeof ref.id === 'string')
        .map(ref => {
            const props = Object.fromEntries((ref.properties ?? []).map(p => [p.key, p.value]));
            return {
                id: ref.id,
                method: props.Method || undefined,
                resolution: props.Resolution || undefined,
                chains: props.Chains || undefined,
            };
        });
}

function parseUniProtResult(result: RawUniProtResult): UniProtData {
    const features: UniProtFeature[] = (result.features ?? []).map(ft => ({
        type: ft.type,
        description: ft.description ?? '',
        begin: ft.location?.start?.value?.toString() ?? '',
        end: ft.location?.end?.value?.toString() ?? '',
    }));

    return {
        accession: result.primaryAccession,
        id: result.uniProtkbId,
        proteinName: result.proteinDescription?.recommendedName?.fullName?.value || 'Unknown Protein',
        geneName: result.genes?.[0]?.geneName?.value || 'Unknown Gene',
        organism: result.organism?.scientificName || 'Unknown Organism',
        function: result.comments?.find(c => c.commentType === 'FUNCTION')?.texts?.[0]?.value || 'No function described.',
        features,
        relatedPdbEntries: parseRelatedPdbEntries(result.uniProtKBCrossReferences),
    };
}

export const fetchUniProtData = async (pdbId: string): Promise<UniProtData | null> => {
    try {
        const searchUrl = `https://rest.uniprot.org/uniprotkb/search?query=database:(type:pdb ${pdbId})&fields=${FIELDS}&size=1`;

        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('UniProt API failed');

        const data = await response.json();
        if (!data.results || data.results.length === 0) return null;

        return parseUniProtResult(data.results[0]);
    } catch (error) {
        console.error("UniProt Fetch Error:", error);
        return null;
    }
};

// Fetches directly by UniProt accession rather than guessing it from a
// free-text PDB-ID search — used once the accession is already known (via
// SIFTS for a PDB entry, or directly for an AlphaFold model ID, which IS a
// UniProt accession).
export const fetchUniProtDataByAccession = async (accession: string): Promise<UniProtData | null> => {
    try {
        const url = `https://rest.uniprot.org/uniprotkb/${accession}.json?fields=${FIELDS}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('UniProt API failed');

        const result = await response.json();
        return parseUniProtResult(result);
    } catch (error) {
        console.error("UniProt Fetch Error:", error);
        return null;
    }
};
