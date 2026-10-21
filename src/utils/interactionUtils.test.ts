import { describe, it, expect } from 'vitest';
import { getInteractionType, getAtomicInteractionType } from './interactionUtils';
import type { AtomContact } from '../types';

// Helper to build an AtomContact fixture with minimal boilerplate.
const contact = (
    atom1Name: string,
    atom2Name: string,
    distance: number,
    atom1Index = 0,
    atom2Index = 1,
): AtomContact => ({ atom1Name, atom1Index, atom2Name, atom2Index, distance });

describe('getInteractionType', () => {
    describe('distance short-circuit', () => {
        it('returns null when dist > 8.0 regardless of residue types', () => {
            expect(getInteractionType('ARG 1', 'ASP 2', 9.0)).toBeNull();
        });

        it('returns null at a Salt-Bridge-eligible pair just over 8.0', () => {
            expect(getInteractionType('ARG 1', 'ASP 2', 8.01)).toBeNull();
        });

        it('still classifies at exactly dist = 8.0 (inclusive boundary)', () => {
            // dist > 8.0 is the only exclusion check, so 8.0 itself passes through.
            const result = getInteractionType('PHE 1', 'TYR 2', 8.0);
            expect(result?.type).toBe('Pi-Stacking');
        });
    });

    describe('1. Salt Bridge', () => {
        it('classifies ARG (positive) + ASP (negative) as Salt Bridge', () => {
            const result = getInteractionType('ARG 1', 'ASP 2', 3.0);
            expect(result).toEqual({
                type: 'Salt Bridge',
                color: 'text-red-500',
                bg: 'bg-red-500/10',
                hex: '#ef4444',
            });
        });

        it('classifies the reverse order (negative first, positive second)', () => {
            const result = getInteractionType('GLU 1', 'LYS 2', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('classifies HIS (positive) + GLU (negative) as Salt Bridge', () => {
            const result = getInteractionType('HIS 1', 'GLU 2', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('does NOT classify HIS-HIS as Salt Bridge (HIS is never negative) but falls through to Cation-Pi', () => {
            // HIS is in both POSITIVE and AROMATIC; it is never in NEGATIVE, so the
            // Salt Bridge check (isP1&&isN2 || isN1&&isP2) can never be true for HIS-HIS.
            // It then matches Cation-Pi (isP1&&isA2 is true since HIS is aromatic too).
            const result = getInteractionType('HIS 1', 'HIS 2', 3.0);
            expect(result?.type).toBe('Cation-Pi Interaction');
        });
    });

    describe('2. Cation-Pi', () => {
        it('classifies LYS (positive) + PHE (aromatic) as Cation-Pi Interaction', () => {
            const result = getInteractionType('LYS 1', 'PHE 2', 5.0);
            expect(result).toEqual({
                type: 'Cation-Pi Interaction',
                color: 'text-indigo-500',
                bg: 'bg-indigo-500/10',
                hex: '#6366f1',
            });
        });

        it('classifies the reverse order (aromatic first, positive second)', () => {
            const result = getInteractionType('TRP 1', 'ARG 2', 5.0);
            expect(result?.type).toBe('Cation-Pi Interaction');
        });

        it('does not classify ARG + ASP (would be Salt Bridge, which has priority) even though ARG is also positive', () => {
            const result = getInteractionType('ARG 1', 'ASP 2', 5.0);
            expect(result?.type).toBe('Salt Bridge');
        });
    });

    describe('3. Pi-Stacking', () => {
        it('classifies two aromatic residues (PHE + TYR) as Pi-Stacking', () => {
            const result = getInteractionType('PHE 1', 'TYR 2', 7.5);
            expect(result).toEqual({
                type: 'Pi-Stacking',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
                hex: '#a855f7',
            });
        });

        it('fires at dist=7.5 with no additional inner distance check', () => {
            const result = getInteractionType('TRP 1', 'PHE 2', 7.9);
            expect(result?.type).toBe('Pi-Stacking');
        });

        it('classifies TRP + TRP as Pi-Stacking', () => {
            const result = getInteractionType('TRP 1', 'TRP 2', 6.0);
            expect(result?.type).toBe('Pi-Stacking');
        });
    });

    describe('4. Hydrophobic Contact', () => {
        it('classifies ALA + VAL under 5.0 as Hydrophobic Contact', () => {
            const result = getInteractionType('ALA 1', 'VAL 2', 4.0);
            expect(result).toEqual({
                type: 'Hydrophobic Contact',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                hex: '#22c55e',
            });
        });

        it('does not classify ALA + VAL at dist=6.0 as Hydrophobic (dist not < 5.0) and falls through to null (not < 4.0 fallback)', () => {
            const result = getInteractionType('ALA 1', 'VAL 2', 6.0);
            expect(result).toBeNull();
        });

        it('does not classify at the 5.0 boundary itself (dist < 5.0 is strict)', () => {
            const result = getInteractionType('LEU 1', 'ILE 2', 5.0);
            // 5.0 is not < 5.0, and 5.0 is not < 4.0 fallback either -> null
            expect(result).toBeNull();
        });

        it('classifies two different hydrophobic residues (MET + CYS) under 5.0', () => {
            const result = getInteractionType('MET 1', 'CYS 2', 3.2);
            expect(result?.type).toBe('Hydrophobic Contact');
        });
    });

    describe('5. Fallback Close Contact', () => {
        it('classifies unmatched residue types under 4.0 as Close Contact', () => {
            const result = getInteractionType('GLY 1', 'SER 2', 3.5);
            expect(result).toEqual({
                type: 'Close Contact',
                color: 'text-neutral-500',
                bg: 'bg-neutral-500/10',
                hex: '#737373',
            });
        });

        it('does not classify unmatched residue types at exactly 4.0 (dist < 4.0 is strict)', () => {
            const result = getInteractionType('GLY 1', 'SER 2', 4.0);
            expect(result).toBeNull();
        });
    });

    describe('6. No match -> null', () => {
        it('returns null for unmatched residues at dist=6.0', () => {
            expect(getInteractionType('GLY 1', 'SER 2', 6.0)).toBeNull();
        });

        it('returns null for a Salt-Bridge-eligible pair beyond 8.0 (outer short-circuit wins)', () => {
            expect(getInteractionType('ARG 1', 'ASP 2', 9.0)).toBeNull();
        });
    });

    describe('label parsing', () => {
        it('is case-insensitive: lowercase labels still match Salt Bridge', () => {
            const result = getInteractionType('arg 1', 'asp 2', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('mixed-case labels still match', () => {
            const result = getInteractionType('Arg 1', 'Asp 2', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('a label with no number (just the residue name) still works', () => {
            const result = getInteractionType('ARG', 'ASP 2', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('takes only the first whitespace-separated token, ignoring extra trailing content', () => {
            const result = getInteractionType('ARG 123 extra stuff', 'ASP 456', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('trims leading/trailing whitespace before splitting', () => {
            const result = getInteractionType('  ARG 1  ', ' ASP 2 ', 3.0);
            expect(result?.type).toBe('Salt Bridge');
        });
    });
});

describe('getAtomicInteractionType', () => {
    describe('empty input', () => {
        it('returns null immediately for an empty pairs array', () => {
            expect(getAtomicInteractionType('CYS', 'CYS', [])).toBeNull();
        });
    });

    describe('1. Disulfide Bond', () => {
        it('classifies CYS-CYS with SG-SG at distance <= 2.5 as Disulfide Bond', () => {
            const pairs = [contact('SG', 'SG', 2.05)];
            const result = getAtomicInteractionType('CYS', 'CYS', pairs);
            expect(result).toEqual({
                type: 'Disulfide Bond',
                color: 'text-yellow-500',
                bg: 'bg-yellow-500/10',
                hex: '#eab308',
            });
        });

        it('classifies at exactly the 2.5 boundary (inclusive)', () => {
            const pairs = [contact('SG', 'SG', 2.5)];
            const result = getAtomicInteractionType('CYS', 'CYS', pairs);
            expect(result?.type).toBe('Disulfide Bond');
        });

        it('requires both residues to be CYS', () => {
            const pairs = [contact('SG', 'SG', 2.05)];
            const result = getAtomicInteractionType('CYS', 'SER', pairs);
            expect(result?.type).not.toBe('Disulfide Bond');
        });

        it('SG-SG at distance 6.0 (too far) does NOT classify as Disulfide Bond; falls through to Close Contact fallback since 6.0 <= min overall distance check fails -> actually falls to null since min dist 6.0 > 4.0', () => {
            // Only pair present is SG-SG at 6.0: too far for Disulfide (<=2.5), does not
            // match any other category (not charged/aromatic/polar-starting names), and
            // the overall fallback requires minDist <= 4.0, which 6.0 fails too.
            const pairs = [contact('SG', 'SG', 6.0)];
            const result = getAtomicInteractionType('CYS', 'CYS', pairs);
            expect(result).toBeNull();
        });

        it('SG-SG at distance 6.0 combined with a closer unrelated pair falls through to Close Contact', () => {
            const pairs = [contact('SG', 'SG', 6.0), contact('CB', 'CB', 3.8)];
            const result = getAtomicInteractionType('CYS', 'CYS', pairs);
            // CB/CB distance 3.8 is <= 5.0 and both start with 'C' -> Hydrophobic Contact
            // (CYS is in the hydrophobic residue list), which has priority over the
            // generic Close Contact fallback.
            expect(result?.type).toBe('Hydrophobic Contact');
        });
    });

    describe('2. Salt Bridge', () => {
        it('classifies ARG NH1 within 4.0 of ASP OD1 as Salt Bridge', () => {
            const pairs = [contact('NH1', 'OD1', 3.0)];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result).toEqual({
                type: 'Salt Bridge',
                color: 'text-red-500',
                bg: 'bg-red-500/10',
                hex: '#ef4444',
            });
        });

        it('classifies in reverse residue order (negative residue first)', () => {
            const pairs = [contact('OE1', 'NZ', 3.5)];
            const result = getAtomicInteractionType('GLU', 'LYS', pairs);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('classifies at exactly the 4.0 boundary (inclusive)', () => {
            const pairs = [contact('NZ', 'OD2', 4.0)];
            const result = getAtomicInteractionType('LYS', 'ASP', pairs);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('does not classify when the charged atoms are farther than 4.0, even though the residues are charged types', () => {
            const pairs = [contact('NH1', 'OD1', 5.0)];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result?.type).not.toBe('Salt Bridge');
        });

        it('does not classify when only non-charged atom names are close for a charged residue pair', () => {
            const pairs = [contact('CA', 'CA', 2.0)];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result?.type).not.toBe('Salt Bridge');
        });

        it('HIS ND1/NE2 within 4.0 of ASP OD1/OD2 classifies as Salt Bridge', () => {
            const pairs = [contact('NE2', 'OD2', 2.8)];
            const result = getAtomicInteractionType('HIS', 'ASP', pairs);
            expect(result?.type).toBe('Salt Bridge');
        });
    });

    describe('3. Cation-Pi', () => {
        it('classifies a positive atom within 6.0 of an aromatic ring atom (LYS-PHE)', () => {
            const pairs = [contact('NZ', 'CZ', 5.0)];
            const result = getAtomicInteractionType('LYS', 'PHE', pairs);
            expect(result).toEqual({
                type: 'Cation-Pi Interaction',
                color: 'text-indigo-500',
                bg: 'bg-indigo-500/10',
                hex: '#6366f1',
            });
        });

        it('classifies in reverse order (aromatic residue first)', () => {
            const pairs = [contact('CG', 'NH2', 5.5)];
            const result = getAtomicInteractionType('TRP', 'ARG', pairs);
            expect(result?.type).toBe('Cation-Pi Interaction');
        });

        it('classifies at exactly the 6.0 boundary (inclusive)', () => {
            const pairs = [contact('NZ', 'CG', 6.0)];
            const result = getAtomicInteractionType('LYS', 'TYR', pairs);
            expect(result?.type).toBe('Cation-Pi Interaction');
        });

        it('does not classify when the closest positive-to-ring distance exceeds 6.0', () => {
            const pairs = [contact('NZ', 'CZ', 6.5)];
            const result = getAtomicInteractionType('LYS', 'PHE', pairs);
            expect(result?.type).not.toBe('Cation-Pi Interaction');
        });
    });

    describe('4. Pi-Stacking', () => {
        it('classifies two aromatic residues with ring atoms within 5.5 as Pi-Stacking', () => {
            const pairs = [contact('CG', 'CD1', 4.5)];
            const result = getAtomicInteractionType('PHE', 'TYR', pairs);
            expect(result).toEqual({
                type: 'Pi-Stacking',
                color: 'text-purple-500',
                bg: 'bg-purple-500/10',
                hex: '#a855f7',
            });
        });

        it('classifies at exactly the 5.5 boundary (inclusive)', () => {
            const pairs = [contact('CZ', 'CZ', 5.5)];
            const result = getAtomicInteractionType('PHE', 'PHE', pairs);
            expect(result?.type).toBe('Pi-Stacking');
        });

        it('does not classify when closest ring-to-ring distance exceeds 5.5', () => {
            const pairs = [contact('CZ', 'CZ', 6.0)];
            const result = getAtomicInteractionType('PHE', 'TYR', pairs);
            expect(result?.type).not.toBe('Pi-Stacking');
        });

        it('requires both residues to have known ring atoms (non-aromatic residue excluded)', () => {
            const pairs = [contact('CG', 'CD1', 2.0)];
            const result = getAtomicInteractionType('PHE', 'ALA', pairs);
            expect(result?.type).not.toBe('Pi-Stacking');
        });
    });

    describe('5. Hydrogen Bond', () => {
        it('classifies closest N/O-N/O pair within 3.5 as Hydrogen Bond', () => {
            const pairs = [contact('OG', 'ND2', 2.9)];
            const result = getAtomicInteractionType('SER', 'ASN', pairs);
            expect(result).toEqual({
                type: 'Hydrogen Bond',
                color: 'text-sky-500',
                bg: 'bg-sky-500/10',
                hex: '#0ea5e9',
            });
        });

        it('classifies at exactly the 3.5 boundary (inclusive)', () => {
            const pairs = [contact('O', 'N', 3.5)];
            const result = getAtomicInteractionType('GLY', 'GLY', pairs);
            expect(result?.type).toBe('Hydrogen Bond');
        });

        it('requires BOTH atom names to start with N or O; a C-O pair does not count', () => {
            const pairs = [contact('CB', 'OG', 2.0)];
            const result = getAtomicInteractionType('ALA', 'SER', pairs);
            expect(result?.type).not.toBe('Hydrogen Bond');
        });

        it('does not classify when the closest polar pair exceeds 3.5', () => {
            const pairs = [contact('O', 'N', 4.0)];
            const result = getAtomicInteractionType('GLY', 'GLY', pairs);
            expect(result?.type).not.toBe('Hydrogen Bond');
        });
    });

    describe('6. Hydrophobic Contact', () => {
        it('classifies both-hydrophobic residues with closest C-C pair within 5.0', () => {
            const pairs = [contact('CB', 'CG2', 4.2)];
            const result = getAtomicInteractionType('ALA', 'VAL', pairs);
            expect(result).toEqual({
                type: 'Hydrophobic Contact',
                color: 'text-green-500',
                bg: 'bg-green-500/10',
                hex: '#22c55e',
            });
        });

        it('classifies at exactly the 5.0 boundary (inclusive)', () => {
            const pairs = [contact('CB', 'CB', 5.0)];
            const result = getAtomicInteractionType('LEU', 'ILE', pairs);
            expect(result?.type).toBe('Hydrophobic Contact');
        });

        it('does not classify when one residue is not in the hydrophobic list', () => {
            const pairs = [contact('CB', 'CB', 3.0)];
            const result = getAtomicInteractionType('ALA', 'SER', pairs);
            expect(result?.type).not.toBe('Hydrophobic Contact');
        });

        it('does not classify when the closest C-C pair exceeds 5.0', () => {
            const pairs = [contact('CB', 'CG2', 5.5)];
            const result = getAtomicInteractionType('ALA', 'VAL', pairs);
            expect(result?.type).not.toBe('Hydrophobic Contact');
        });
    });

    describe('7. Fallback Close Contact', () => {
        it('classifies unmatched residue types with minimum distance <= 4.0 as Close Contact', () => {
            const pairs = [contact('CA', 'CA', 3.9)];
            const result = getAtomicInteractionType('GLY', 'SER', pairs);
            expect(result).toEqual({
                type: 'Close Contact',
                color: 'text-neutral-500',
                bg: 'bg-neutral-500/10',
                hex: '#737373',
            });
        });

        it('classifies at exactly the 4.0 boundary (inclusive)', () => {
            const pairs = [contact('CA', 'CA', 4.0)];
            const result = getAtomicInteractionType('GLY', 'SER', pairs);
            expect(result?.type).toBe('Close Contact');
        });

        it('uses the minimum distance across ALL pairs, not just the first', () => {
            const pairs = [
                contact('CA', 'CA', 7.0),
                contact('CB', 'CB', 3.0),
                contact('N', 'C', 5.0),
            ];
            const result = getAtomicInteractionType('GLY', 'SER', pairs);
            expect(result?.type).toBe('Close Contact');
        });
    });

    describe('8. No match -> null', () => {
        it('returns null when no pair is close enough for any category', () => {
            const pairs = [contact('CA', 'CA', 9.0)];
            const result = getAtomicInteractionType('GLY', 'SER', pairs);
            expect(result).toBeNull();
        });

        it('returns null when minimum distance is just over the 4.0 fallback boundary', () => {
            const pairs = [contact('CA', 'CA', 4.01)];
            const result = getAtomicInteractionType('GLY', 'SER', pairs);
            expect(result).toBeNull();
        });
    });

    describe('closest-pair-wins behavior', () => {
        it('uses the closer of two candidate pairs when only one is within the Salt Bridge cutoff', () => {
            const pairs = [
                contact('NH1', 'OD1', 10.0), // far, out of range
                contact('NH2', 'OD2', 3.0), // close, within 4.0 cutoff
            ];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('correctly rejects Salt Bridge when the only in-range-looking pair is actually the farther one and the closer one is out of range for the wrong atom names', () => {
            // Closest pair overall (CA-CA at 1.0) is not a charged-atom pair, so it does
            // not count toward the salt-bridge distance; the only charged pair is out of range.
            const pairs = [
                contact('CA', 'CA', 1.0),
                contact('NH1', 'OD1', 4.5), // charged pair but beyond 4.0 cutoff
            ];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result?.type).not.toBe('Salt Bridge');
            // Falls through to Close Contact via the overall-minimum fallback (CA-CA at 1.0 <= 4.0).
            expect(result?.type).toBe('Close Contact');
        });

        it('Cation-Pi uses the closest positive-to-ring pair among several candidates', () => {
            const pairs = [
                contact('NZ', 'CZ', 8.0), // out of range
                contact('NZ', 'CG', 5.9), // in range
                contact('NZ', 'CD1', 7.0), // out of range
            ];
            const result = getAtomicInteractionType('LYS', 'PHE', pairs);
            expect(result?.type).toBe('Cation-Pi Interaction');
        });
    });

    describe('priority ordering between categories', () => {
        it('Salt Bridge takes priority over Hydrophobic/Close Contact fallback when both could apply', () => {
            const pairs = [
                contact('NH1', 'OD1', 3.0), // Salt Bridge range
                contact('CA', 'CA', 2.0), // would also satisfy generic Close Contact
            ];
            const result = getAtomicInteractionType('ARG', 'ASP', pairs);
            expect(result?.type).toBe('Salt Bridge');
        });

        it('Disulfide Bond takes priority over Hydrophobic Contact for CYS-CYS', () => {
            const pairs = [
                contact('SG', 'SG', 2.0), // Disulfide range
                contact('CB', 'CB', 4.0), // would also satisfy Hydrophobic Contact
            ];
            const result = getAtomicInteractionType('CYS', 'CYS', pairs);
            expect(result?.type).toBe('Disulfide Bond');
        });

        it('Pi-Stacking takes priority over Hydrogen Bond when both ring and polar criteria are met', () => {
            // TRP's ring includes NE1, which also starts with 'N'. A TRP-TRP pair of
            // NE1-NE1 therefore satisfies both the ring-ring check (<=5.5) and the
            // H-bond polar N/O-N/O check (<=3.5); Pi-Stacking (step 4) is checked
            // before Hydrogen Bond (step 5), so it must win.
            const pairs = [contact('NE1', 'NE1', 3.0)];
            const result = getAtomicInteractionType('TRP', 'TRP', pairs);
            expect(result?.type).toBe('Pi-Stacking');
        });
    });
});
