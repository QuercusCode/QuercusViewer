import type { AtomContact } from '../types';

export const getInteractionType = (label1: string, label2: string, dist: number) => {
    if (dist > 8.0) return null;

    // Extract residue name (assumes "ALA 123" format or similar, takes first word)
    const getResName = (l: string) => l.trim().split(' ')[0].toUpperCase();
    const r1 = getResName(label1);
    const r2 = getResName(label2);

    const POSITIVE = ['ARG', 'LYS', 'HIS'];
    const NEGATIVE = ['ASP', 'GLU'];
    const AROMATIC = ['PHE', 'TYR', 'TRP', 'HIS'];
    const HYDROPHOBIC = ['ALA', 'VAL', 'ILE', 'LEU', 'MET', 'PHE', 'TYR', 'TRP', 'CYS', 'PRO'];

    // Note: no Disulfide check here. This function only ever receives a single
    // representative-atom distance (e.g. the Contact Map's Cα-only matrix), and real
    // disulfide bonds are defined by Sγ-Sγ proximity (~2.05Å) — Cα-Cα distance between
    // two distinct residues never gets anywhere close to that even for a bonded pair
    // (typically 4-7Å), so a Cα-based Disulfide check can never correctly fire. See
    // getAtomicInteractionType below for atom-identity-aware classification, used where
    // real per-atom distances are available (Interaction Mode).

    // 1. Salt Bridge (Strong Electrostatic)
    const isP1 = POSITIVE.includes(r1);
    const isN1 = NEGATIVE.includes(r1);
    const isP2 = POSITIVE.includes(r2);
    const isN2 = NEGATIVE.includes(r2);

    if ((isP1 && isN2) || (isN1 && isP2)) return { type: 'Salt Bridge', color: 'text-red-500', bg: 'bg-red-500/10', hex: '#ef4444' };

    // 2. Cation-Pi
    const isA1 = AROMATIC.includes(r1);
    const isA2 = AROMATIC.includes(r2);
    if ((isP1 && isA2) || (isA1 && isP2)) return { type: 'Cation-Pi Interaction', color: 'text-indigo-500', bg: 'bg-indigo-500/10', hex: '#6366f1' };

    // 3. Pi-Stacking
    if (isA1 && isA2) return { type: 'Pi-Stacking', color: 'text-purple-500', bg: 'bg-purple-500/10', hex: '#a855f7' };

    // 4. Hydrophobic (Generic, check dist < 5.0 for meaningful core packing vs just 8.0 contact)
    const isH1 = HYDROPHOBIC.includes(r1);
    const isH2 = HYDROPHOBIC.includes(r2);
    if (isH1 && isH2 && dist < 5.0) return { type: 'Hydrophobic Contact', color: 'text-green-500', bg: 'bg-green-500/10', hex: '#22c55e' };

    // Fallback for close contacts
    if (dist < 4.0) return { type: 'Close Contact', color: 'text-neutral-500', bg: 'bg-neutral-500/10', hex: '#737373' };

    return null;
};

// Standard PDB atom names for the side-chain groups that actually drive each
// interaction type below. Used so classification requires the real functional atoms
// to be close, not just any two atoms of residues that happen to be the right type.
const CHARGED_POSITIVE_ATOMS: Record<string, string[]> = {
    ARG: ['NH1', 'NH2', 'NE'],
    LYS: ['NZ'],
    HIS: ['ND1', 'NE2'], // Protonation state is unknown from coordinates alone; treat both as candidates.
};
const CHARGED_NEGATIVE_ATOMS: Record<string, string[]> = {
    ASP: ['OD1', 'OD2'],
    GLU: ['OE1', 'OE2'],
};
const AROMATIC_RING_ATOMS: Record<string, string[]> = {
    PHE: ['CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ'],
    TYR: ['CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ'],
    TRP: ['CG', 'CD1', 'CD2', 'NE1', 'CE2', 'CE3', 'CZ2', 'CZ3', 'CH2'],
    HIS: ['CG', 'ND1', 'CD2', 'CE1', 'NE2'],
};
const HYDROPHOBIC_RESIDUES = ['ALA', 'VAL', 'ILE', 'LEU', 'MET', 'PHE', 'TYR', 'TRP', 'CYS', 'PRO'];

// Closest distance between any atom named in `names1` (on residue 1) and any atom
// named in `names2` (on residue 2) across every pair in `pairs`, or Infinity if none match.
const closestNamed = (pairs: AtomContact[], names1: string[], names2: string[]): number => {
    let best = Infinity;
    for (const p of pairs) {
        if (names1.includes(p.atom1Name) && names2.includes(p.atom2Name) && p.distance < best) {
            best = p.distance;
        }
    }
    return best;
};

// Atom-level, geometry-aware interaction classification for two residues, given every
// atom pair between them (see ProteinViewer.tsx's Interaction Mode, which collects real
// atom names and distances). Unlike getInteractionType above — which only ever has a
// single representative-atom distance, e.g. from the Contact Map's Cα-only matrix —
// this checks that the actual charged/aromatic/polar atoms are the ones that are
// close, so a coincidental backbone contact between an ARG and an ASP a residue's
// width apart from their charged side chains no longer gets mislabeled "Salt Bridge".
export const getAtomicInteractionType = (resName1: string, resName2: string, pairs: AtomContact[]) => {
    if (!pairs.length) return null;
    const r1 = resName1.toUpperCase();
    const r2 = resName2.toUpperCase();

    // 1. Disulfide Bond — the real criterion is Sγ-Sγ distance (~2.05Å for a bonded
    // pair), not just "two CYS residues somewhat near each other".
    if (r1 === 'CYS' && r2 === 'CYS') {
        const sgDist = closestNamed(pairs, ['SG'], ['SG']);
        if (sgDist <= 2.5) return { type: 'Disulfide Bond', color: 'text-yellow-500', bg: 'bg-yellow-500/10', hex: '#eab308' };
    }

    // 2. Salt Bridge — the charged atoms themselves must be close (~4.0Å is the
    // standard cutoff), not just any atom of a charged-residue pair.
    const posAtoms1 = CHARGED_POSITIVE_ATOMS[r1];
    const negAtoms1 = CHARGED_NEGATIVE_ATOMS[r1];
    const posAtoms2 = CHARGED_POSITIVE_ATOMS[r2];
    const negAtoms2 = CHARGED_NEGATIVE_ATOMS[r2];
    const saltDist = Math.min(
        posAtoms1 && negAtoms2 ? closestNamed(pairs, posAtoms1, negAtoms2) : Infinity,
        negAtoms1 && posAtoms2 ? closestNamed(pairs, negAtoms1, posAtoms2) : Infinity,
    );
    if (saltDist <= 4.0) return { type: 'Salt Bridge', color: 'text-red-500', bg: 'bg-red-500/10', hex: '#ef4444' };

    // 3. Cation-Pi — a charged atom close to an aromatic ring.
    const ring1 = AROMATIC_RING_ATOMS[r1];
    const ring2 = AROMATIC_RING_ATOMS[r2];
    const cationPiDist = Math.min(
        posAtoms1 && ring2 ? closestNamed(pairs, posAtoms1, ring2) : Infinity,
        ring1 && posAtoms2 ? closestNamed(pairs, ring1, posAtoms2) : Infinity,
    );
    if (cationPiDist <= 6.0) return { type: 'Cation-Pi Interaction', color: 'text-indigo-500', bg: 'bg-indigo-500/10', hex: '#6366f1' };

    // 4. Pi-Stacking — both rings actually close to each other, not just two aromatic residues nearby.
    if (ring1 && ring2) {
        const stackDist = closestNamed(pairs, ring1, ring2);
        if (stackDist <= 5.5) return { type: 'Pi-Stacking', color: 'text-purple-500', bg: 'bg-purple-500/10', hex: '#a855f7' };
    }

    // 5. Hydrogen Bond — heavy-atom N/O···N/O distance screen, the standard first-pass
    // criterion before a full donor-H···acceptor angle check (which needs explicit
    // hydrogen positions most crystal structures don't have). Meaningfully more
    // specific than lumping every polar or nonpolar close contact into one bucket.
    let hbondDist = Infinity;
    for (const p of pairs) {
        const isPolarPair = (p.atom1Name.startsWith('N') || p.atom1Name.startsWith('O')) &&
            (p.atom2Name.startsWith('N') || p.atom2Name.startsWith('O'));
        if (isPolarPair && p.distance < hbondDist) hbondDist = p.distance;
    }
    if (hbondDist <= 3.5) return { type: 'Hydrogen Bond', color: 'text-sky-500', bg: 'bg-sky-500/10', hex: '#0ea5e9' };

    // 6. Hydrophobic Contact — nonpolar side chains with carbon atoms actually packed together.
    if (HYDROPHOBIC_RESIDUES.includes(r1) && HYDROPHOBIC_RESIDUES.includes(r2)) {
        let carbonDist = Infinity;
        for (const p of pairs) {
            if (p.atom1Name.startsWith('C') && p.atom2Name.startsWith('C') && p.distance < carbonDist) carbonDist = p.distance;
        }
        if (carbonDist <= 5.0) return { type: 'Hydrophobic Contact', color: 'text-green-500', bg: 'bg-green-500/10', hex: '#22c55e' };
    }

    // Fallback — some atoms are close, but nothing above matched a specific category.
    let minDist = Infinity;
    for (const p of pairs) if (p.distance < minDist) minDist = p.distance;
    if (minDist <= 4.0) return { type: 'Close Contact', color: 'text-neutral-500', bg: 'bg-neutral-500/10', hex: '#737373' };

    return null;
};
