import type { LigandChemicalInfo } from '../types';

// Looks up a bound ligand/ion's chemical identity by its PDB Chemical
// Component Dictionary code (the same 1-3 letter code already present in a
// loaded structure's `ligands` array — e.g. "ATP", "HEM", "ZN") against
// RCSB's own chemcomp REST API. Unlike PubChem's CID-keyed endpoints
// (already used elsewhere in this app for whole-molecule PubChem loads),
// this needs no separate name/CID resolution step, since PDB ligand codes
// ARE the lookup key.
//
// A ligand code's chemical identity never changes mid-session (HEM is
// always HEM), so successful lookups are cached in memory for the life of
// the page — a transient failure is intentionally NOT cached, so clicking
// the same ligand again after a network blip retries instead of staying
// stuck on "unavailable".
const cache = new Map<string, LigandChemicalInfo>();

// PDB Chemical Component Dictionary IDs are 1-5 alphanumeric characters
// (legacy IDs are 1-3 chars; the CCD's newer extended-ID range allows up to
// 5). Rejecting anything else here, before it ever reaches a URL, is what
// keeps a stray "." or "/" in a malformed/crafted structure file's residue
// name from being interpreted as a URL path segment.
const VALID_CODE = /^[A-Z0-9]{1,5}$/;

export async function fetchChemicalComponent(code: string): Promise<LigandChemicalInfo | null> {
    const key = code.trim().toUpperCase();
    if (!VALID_CODE.test(key)) return null;
    if (cache.has(key)) return cache.get(key) ?? null;

    try {
        const response = await fetch(`https://data.rcsb.org/rest/v1/core/chemcomp/${key}`);
        if (!response.ok) throw new Error(`Chemical component fetch failed (${response.status})`);

        const data = await response.json();
        const comp = data?.chem_comp;
        if (!comp || typeof comp !== 'object') return null;

        // rcsb_chem_comp_descriptor is one of the few RCSB categories whose
        // fields keep their original mmCIF dictionary casing (SMILES,
        // SMILES_stereo, InChI, InChIKey) instead of the usual snake_case.
        const descriptor = data?.rcsb_chem_comp_descriptor;
        const info: LigandChemicalInfo = {
            name: typeof comp.name === 'string' ? comp.name : undefined,
            formula: typeof comp.formula === 'string' ? comp.formula : undefined,
            molecularWeight: typeof comp.formula_weight === 'number' ? comp.formula_weight : undefined,
            smiles: typeof descriptor?.SMILES_stereo === 'string'
                ? descriptor.SMILES_stereo
                : (typeof descriptor?.SMILES === 'string' ? descriptor.SMILES : undefined),
        };

        if (!info.name && !info.formula && info.molecularWeight === undefined && !info.smiles) return null;

        cache.set(key, info);
        return info;
    } catch (error) {
        console.error('Chemical component fetch error:', error);
        return null;
    }
}
