
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
}

// Shape of the fields this module actually requests (fields=accession,id,
// protein_name,gene_names,organism_name,cc_function,ft_act_site,ft_binding,
// ft_site,ft_mutagen,ft_domain) from UniProt's REST API — not the full
// UniProtKB entry schema.
interface RawUniProtFeature {
    type: string;
    description?: string;
    location?: { start?: { value?: number }; end?: { value?: number } };
}

interface RawUniProtComment {
    commentType: string;
    texts?: { value: string }[];
}

interface RawUniProtResult {
    primaryAccession: string;
    uniProtkbId: string;
    proteinDescription?: { recommendedName?: { fullName?: { value?: string } } };
    genes?: { geneName?: { value?: string } }[];
    organism?: { scientificName?: string };
    comments?: RawUniProtComment[];
    features?: RawUniProtFeature[];
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
    };
}

export const fetchUniProtData = async (pdbId: string): Promise<UniProtData | null> => {
    try {
        const searchUrl = `https://rest.uniprot.org/uniprotkb/search?query=database:(type:pdb ${pdbId})&fields=accession,id,protein_name,gene_names,organism_name,cc_function,ft_act_site,ft_binding,ft_site,ft_mutagen,ft_domain&size=1`;

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
        const url = `https://rest.uniprot.org/uniprotkb/${accession}.json?fields=accession,id,protein_name,gene_names,organism_name,cc_function,ft_act_site,ft_binding,ft_site,ft_mutagen,ft_domain`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('UniProt API failed');

        const result = await response.json();
        return parseUniProtResult(result);
    } catch (error) {
        console.error("UniProt Fetch Error:", error);
        return null;
    }
};
