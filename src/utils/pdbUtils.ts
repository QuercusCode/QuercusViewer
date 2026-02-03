import type { PDBMetadata, ChainInfo, AtomInfo } from '../types';

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

// Helper for Matrix4 application (Column-Major)
const applyMatrix4 = (x: number, y: number, z: number, m: number[]) => {
    return {
        x: m[0] * x + m[4] * y + m[8] * z + m[12],
        y: m[1] * x + m[5] * y + m[9] * z + m[13],
        z: m[2] * x + m[6] * y + m[10] * z + m[14]
    };
};

export const extractChainsFromComponent = (component: any, matrix?: number[]): { chains: ChainInfo[], ligands: string[], isSmallMolecule: boolean } => {
    if (!component || !component.structure) return { chains: [], ligands: [], isSmallMolecule: false };

    const chains: ChainInfo[] = [];
    const seenChains = new Set<string>();

    component.structure.eachChain((c: any) => {
        if (seenChains.has(c.chainname)) return;
        seenChains.add(c.chainname);

        let seq = "";
        let minSeq = Infinity;
        let maxSeq = -Infinity;
        let nucleicCount = 0;
        let proteinCount = 0;

        const resMap: number[] = [];
        const bFactors: number[] = [];
        const coords: { x: number, y: number, z: number }[] = [];

        try {
            c.eachResidue((r: any) => {
                let resNo = r.resno;
                if (resNo === undefined && typeof r.getResno === 'function') {
                    resNo = r.getResno();
                }

                if (typeof resNo === 'number') {
                    if (resNo < minSeq) minSeq = resNo;
                    if (resNo > maxSeq) maxSeq = resNo;
                    resMap.push(resNo); // Valid residue number
                } else {
                    resMap.push((maxSeq > -Infinity ? maxSeq : 0) + 1);
                }

                // B-Factor & Coordinate Extraction
                let bSum = 0;
                let bCount = 0;
                let caAtom: any = null;
                let firstAtom: any = null;

                r.eachAtom((a: any) => {
                    bSum += a.bfactor;
                    bCount++;

                    if (a.atomname === 'CA' || a.atomname === 'P') caAtom = a;
                    if (!firstAtom) firstAtom = a;
                });
                const avgB = bCount > 0 ? bSum / bCount : 0;
                bFactors.push(avgB);

                // Store coords (CA/P or fallback to first atom)
                const targetAtom = caAtom || firstAtom;
                if (targetAtom) {
                    if (matrix && matrix.length === 16) {
                        coords.push(applyMatrix4(targetAtom.x, targetAtom.y, targetAtom.z, matrix));
                    } else {
                        coords.push({ x: targetAtom.x, y: targetAtom.y, z: targetAtom.z });
                    }
                } else {
                    coords.push({ x: 0, y: 0, z: 0 }); // Should theoretically not happen
                }

                // Determine Type
                if (r.isNucleic()) nucleicCount++;
                else if (r.isProtein()) proteinCount++;

                // Parse Residue Name
                let resName = 'X';
                if (r.isNucleic()) {
                    const rawName = r.resname.trim().toUpperCase();
                    if (rawName.length === 1) resName = rawName;
                    else if (rawName.length === 2 && rawName.startsWith('D')) resName = rawName[1];
                    else if (rawName.length === 2 && rawName.endsWith('A')) resName = 'A';
                    else resName = rawName.substring(0, 1);
                } else {
                    if (r.getResname1) resName = r.getResname1();
                    else if (r.resname) resName = r.resname[0];
                }
                seq += resName;
            });
        } catch (eRes) {
            console.warn(`Residue iteration failed for chain ${c.chainname}`, eRes);
        }

        if (minSeq === Infinity) minSeq = 0;
        if (maxSeq === -Infinity) maxSeq = 0;

        // Infer Chain Type
        let chainType: 'protein' | 'nucleic' | 'unknown' = 'unknown';
        if (nucleicCount > proteinCount) chainType = 'nucleic';
        else if (proteinCount > 0) chainType = 'protein';

        // Extract Atoms for Small Molecules
        let atomList: AtomInfo[] = [];
        if (chainType === 'unknown' && seq.length < 50) {
            try {
                c.eachResidue((r: any) => {
                    r.eachAtom((a: any) => {
                        atomList.push({
                            serial: a.serial,
                            name: a.atomname,
                            element: a.element,
                            resNo: r.resno,
                            chain: c.chainname
                        });
                    });
                });
            } catch (eAtom) { console.warn("Atom iteration failed", eAtom); }
        }

        chains.push({
            name: c.chainname,
            min: minSeq,
            max: maxSeq,
            sequence: seq,
            residueMap: resMap,
            type: chainType,
            atoms: atomList.length > 0 ? atomList : undefined,
            bFactors: bFactors,
            coords: coords // Added field
        });
    });

    // Extract Ligands
    const ligandSet = new Set<string>();
    try {
        component.structure.eachResidue((r: any) => {
            const invalidLigands = ['HOH', 'WAT', 'TIP', 'SOL', 'DOD'];
            if (r.isHetero() && !invalidLigands.includes(r.resname)) {
                ligandSet.add(r.resname);
            }
        });
    } catch (e) { }

    const isSmallMolecule = chains.length === 0 || (chains.length === 1 && chains[0].type === 'unknown');

    return { chains, ligands: Array.from(ligandSet), isSmallMolecule };
};
