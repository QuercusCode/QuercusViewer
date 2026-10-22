import { useEffect, useRef } from 'react';
import type { StructureController } from './useStructureController';
import type { MappedUniProtFeature, RelatedPdbEntry } from '../types';
import { fetchSiftsMapping, mapUnpRangeToPdb } from '../services/siftsMapping';
import { fetchUniProtDataByAccession, type UniProtFeature } from '../services/uniprot';

// Merges related-PDB-entry lists from (potentially) several UniProt
// accessions mapped onto this structure, de-duplicating by PDB ID and
// dropping the entry for the structure that's actually loaded right now —
// "related to itself" isn't a useful suggestion.
function mergeRelatedPdbEntries(lists: RelatedPdbEntry[][], currentPdbId: string): RelatedPdbEntry[] {
    const seen = new Set<string>();
    const merged: RelatedPdbEntry[] = [];
    const current = currentPdbId.toUpperCase();
    for (const list of lists) {
        for (const entry of list) {
            const id = entry.id.toUpperCase();
            if (id === current || seen.has(id)) continue;
            seen.add(id);
            merged.push(entry);
        }
    }
    return merged;
}

// Only the 5 feature categories services/uniprot.ts actually requests
// (ft_act_site, ft_binding, ft_site, ft_mutagen, ft_domain) need a color —
// anything else falls back to a neutral gray rather than being invented here.
const FEATURE_TYPE_COLORS: Record<string, string> = {
    'active site': '#ef4444',
    'binding site': '#f59e0b',
    'site': '#14b8a6',
    'mutagenesis': '#ec4899',
    'domain': '#6366f1',
};

export function featureColor(type: string): string {
    return FEATURE_TYPE_COLORS[type.toLowerCase()] || '#94a3b8';
}

function toMapped(
    feature: UniProtFeature,
    accession: string,
    overrideStart?: number,
    overrideEnd?: number
): MappedUniProtFeature | null {
    const start = overrideStart ?? parseInt(feature.begin, 10);
    const end = overrideEnd ?? parseInt(feature.end, 10);
    if (!feature.type || !Number.isFinite(start) || !Number.isFinite(end)) return null;
    return {
        type: feature.type,
        description: feature.description || feature.type,
        pdbStart: Math.min(start, end),
        pdbEnd: Math.max(start, end),
        accession,
    };
}

// Fetches UniProt functional annotations (domains, active/binding sites,
// mutagenesis) for the loaded structure and maps them onto PDB author
// residue numbering, per chain. Mirrors useStructureMetadata's shape: called
// once per viewport controller, keyed on pdbId/dataSource.
export function useUniProtFeatures(controller: StructureController) {
    const { pdbId, dataSource, setUniprotFeatures, setRelatedStructures } = controller;
    const requestIdRef = useRef(0);

    useEffect(() => {
        const thisRequest = ++requestIdRef.current;

        // Local-file uploads and PubChem small molecules have no UniProt
        // mapping; AlphaFold and real PDB entries are handled below.
        if (!pdbId || dataSource === 'pubchem') {
            setUniprotFeatures(null);
            setRelatedStructures(null);
            return;
        }

        (async () => {
            let featuresByChain: Record<string, MappedUniProtFeature[]> | null = null;
            const relatedPdbLists: RelatedPdbEntry[][] = [];

            if (dataSource === 'alphafold') {
                // AlphaFold model IDs ARE UniProt accessions (optionally with a
                // "::F2" fragment or "-2" isoform suffix), and the model covers
                // the full canonical sequence starting at residue 1 — so PDB
                // residue numbering already equals UniProt numbering; no SIFTS
                // lookup or remapping is needed.
                const accession = pdbId.split('::')[0];
                const data = await fetchUniProtDataByAccession(accession);
                if (data) {
                    relatedPdbLists.push(data.relatedPdbEntries);
                    if (data.features.length > 0) {
                        const mapped = data.features
                            .map(f => toMapped(f, data.accession))
                            .filter((f): f is MappedUniProtFeature => f !== null);
                        if (mapped.length > 0) featuresByChain = { A: mapped };
                    }
                }
            } else {
                const mapping = await fetchSiftsMapping(pdbId);
                if (mapping) {
                    const merged: Record<string, MappedUniProtFeature[]> = {};
                    for (const accession of Object.keys(mapping)) {
                        const data = await fetchUniProtDataByAccession(accession);
                        if (!data) continue;
                        relatedPdbLists.push(data.relatedPdbEntries);

                        for (const feature of data.features) {
                            const unpStart = parseInt(feature.begin, 10);
                            const unpEnd = parseInt(feature.end, 10);
                            if (!Number.isFinite(unpStart) || !Number.isFinite(unpEnd)) continue;

                            for (const range of mapUnpRangeToPdb(mapping[accession], unpStart, unpEnd)) {
                                const mapped = toMapped(feature, accession, range.start, range.end);
                                if (!mapped) continue;
                                (merged[range.chain] ??= []).push(mapped);
                            }
                        }
                    }
                    if (Object.keys(merged).length > 0) featuresByChain = merged;
                }
            }

            // A newer pdbId/dataSource change superseded this fetch — drop it.
            if (requestIdRef.current === thisRequest) {
                setUniprotFeatures(featuresByChain);
                const related = mergeRelatedPdbEntries(relatedPdbLists, pdbId);
                setRelatedStructures(related.length > 0 ? related : null);
            }
        })();
    }, [pdbId, dataSource, setUniprotFeatures, setRelatedStructures]);
}
