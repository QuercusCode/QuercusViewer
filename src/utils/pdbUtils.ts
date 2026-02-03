import type { PDBMetadata } from '../types';

export const fetchPDBMetadata = async (pdbId: string): Promise<PDBMetadata | null> => {
    if (!pdbId) return null;

    const lowerId = pdbId.toLowerCase();

    try {
        const [entryRes, entityRes] = await Promise.all([
            fetch(`https://data.rcsb.org/rest/v1/core/entry/${lowerId}`),
            fetch(`https://data.rcsb.org/rest/v1/core/polymer_entity/${lowerId}/1`) // Checking entity 1 is usually sufficient for source
        ]);

        if (!entryRes.ok) {
            console.warn(`Failed to fetch entry metadata for ${pdbId}`);
            return null;
        }

        const data = await entryRes.json();
        let entityData: any = {};
        if (entityRes.ok) {
            entityData = await entityRes.json();
        }

        // Extract fields
        const method = data.exptl?.[0]?.method || 'Unknown';

        let resolution = 'N/A';
        if (data.rcsb_entry_info?.resolution_combined && data.rcsb_entry_info.resolution_combined.length > 0) {
            resolution = `${data.rcsb_entry_info.resolution_combined[0].toFixed(2)} Å`;
        } else if (data.refine?.[0]?.ls_d_res_high) {
            resolution = `${data.refine[0].ls_d_res_high.toFixed(2)} Å`;
        } else if (method.includes('NMR')) {
            resolution = 'N/A (NMR)';
        }

        // Organism from Entity 1
        let organism = 'Unknown source';
        if (entityData.rcsb_entity_source_organism && entityData.rcsb_entity_source_organism.length > 0) {
            organism = entityData.rcsb_entity_source_organism[0].scientific_name;
        } else if (data.rcsb_entity_source_organism && data.rcsb_entity_source_organism.length > 0) {
            organism = data.rcsb_entity_source_organism[0].scientific_name; // Fallback to entry if present (rare)
        }

        // Date format: "2010-02-28T00:00:00Z" -> "2010-02-28"
        let date = data.rcsb_accession_info?.deposit_date || 'Unknown date';
        if (date.includes('T')) {
            date = date.split('T')[0];
        }

        const title = data.struct?.title || '';

        return {
            method,
            resolution,
            organism,
            depositionDate: date,
            title
        };

    } catch (error) {
        console.error("Error fetching PDB metadata:", error);
        return null;
    }
};

/**
 * Formats a PDB Ligand ID to Chemical Nomenclature.
 * Specifically converts 1-2 letter codes (Ions) to Title Case (ZN -> Zn).
 * Keeps 3+ letter codes (Molecules) as Uppercase (HEM -> HEM).
 */
// ... existing imports
export type DataSource = 'pdb' | 'pubchem' | 'alphafold';

export const getStructureUrl = (id: string, source: DataSource): string => {
    switch (source) {
        case 'pubchem': return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${id}/record/SDF/?record_type=3d`;
        case 'alphafold': return `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.pdb`;
        case 'pdb': default: return `https://files.rcsb.org/download/${id}.pdb`; // Explicitly use PDB format
    }
};

export const fetchPubChemMetadata = async (cid: string): Promise<PDBMetadata | null> => {
    // ... existing PubChem metadata logic
    try {
        const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,MolecularWeight,MolecularFormula,IUPACName/JSON`);
        if (!res.ok) return null;
        const json = await res.json();
        const props = json.PropertyTable?.Properties?.[0];

        if (!props) return null;

        return {
            method: 'Simulated/Experimental',
            resolution: 'N/A',
            organism: 'Synthetic/Nature',
            depositionDate: 'N/A',
            title: props.IUPACName || props.Title || `PubChem CID ${cid}`,
            formula: props.MolecularFormula,
            molecularWeight: props.MolecularWeight ? parseFloat(props.MolecularWeight) : undefined,
            cid: cid
        };
    } catch (e) {
        console.warn("PubChem metadata fetch failed", e);
        return null;
    }
};

export const fetchStructureMetadata = async (id: string, source: DataSource): Promise<PDBMetadata | null> => {
    if (source === 'pdb') return fetchPDBMetadata(id);
    if (source === 'pubchem') return fetchPubChemMetadata(id);
    return null;
};

/**
 * Formats a PDB Ligand ID to Chemical Nomenclature.
 * ...
 */
export const formatChemicalId = (id: string): string => {
    if (!id) return '';
    if (id.length <= 2) {
        return id.charAt(0).toUpperCase() + id.slice(1).toLowerCase();
    }
    return id.toUpperCase();
};
