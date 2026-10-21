import { describe, it, expect } from 'vitest';
import { calculateMW, calculateIsoelectricPoint, getAminoAcidComposition } from './chemistry';

describe('calculateMW', () => {
    it('returns just the terminal water mass for an empty sequence', () => {
        expect(calculateMW('')).toBeCloseTo(18.0153, 4);
    });

    it('computes the mass of a single residue plus terminal water', () => {
        // G: 57.0519 + 18.0153 = 75.0672
        expect(calculateMW('G')).toBeCloseTo(75.0672, 4);
    });

    it('sums multiple residues plus terminal water', () => {
        // A: 71.0788 + G: 57.0519 + 18.0153 = 146.1460
        expect(calculateMW('AG')).toBeCloseTo(146.146, 4);
    });

    it('is case-insensitive', () => {
        expect(calculateMW('ag')).toBeCloseTo(calculateMW('AG'), 4);
        expect(calculateMW('ag')).toBeCloseTo(146.146, 4);
    });

    it('treats unknown characters as contributing zero mass', () => {
        // Unknown residue contributes 0, so only the terminal water remains.
        expect(calculateMW('X')).toBeCloseTo(18.0153, 4);
    });

    it('treats unknown characters as zero mass even mixed with known residues', () => {
        // G (57.0519) + X (0) + 18.0153 water = 75.0672
        expect(calculateMW('GX')).toBeCloseTo(75.0672, 4);
    });

    it('computes a longer known sequence correctly', () => {
        // A:71.0788 + R:156.1875 + N:114.1038 + D:115.0886 = 456.4587
        // + water 18.0153 = 474.474
        expect(calculateMW('ARND')).toBeCloseTo(474.474, 4);
    });

    it('handles digits and symbols as unknown (zero mass) characters', () => {
        expect(calculateMW('1')).toBeCloseTo(18.0153, 4);
        expect(calculateMW('A1')).toBeCloseTo(calculateMW('A'), 4);
    });
});

describe('calculateIsoelectricPoint', () => {
    it('returns a finite number (never NaN) for an empty sequence', () => {
        const pI = calculateIsoelectricPoint('');
        expect(typeof pI).toBe('number');
        expect(Number.isNaN(pI)).toBe(false);
        expect(pI).toBeGreaterThanOrEqual(0);
        expect(pI).toBeLessThanOrEqual(14);
    });

    it('returns a finite number for a typical mixed sequence', () => {
        const pI = calculateIsoelectricPoint('ACDEFGHIKLMNPQRSTVWY');
        expect(typeof pI).toBe('number');
        expect(Number.isNaN(pI)).toBe(false);
        expect(pI).toBeGreaterThanOrEqual(0);
        expect(pI).toBeLessThanOrEqual(14);
    });

    it('gives a strongly acidic pI for a sequence rich in D/E', () => {
        const pI = calculateIsoelectricPoint('DDDDEEEE');
        expect(Number.isNaN(pI)).toBe(false);
        expect(pI).toBeLessThan(5);
    });

    it('gives a strongly basic pI for a sequence rich in K/R', () => {
        const pI = calculateIsoelectricPoint('KKKKRRRR');
        expect(Number.isNaN(pI)).toBe(false);
        expect(pI).toBeGreaterThan(9);
    });

    it('gives a near-neutral pI for a sequence with no ionizable side chains (only termini contribute)', () => {
        // With no D/E/K/R/H/C/Y, charge is governed purely by the N-term (pKa 8.6)
        // and C-term (pKa 3.6) groups. Setting
        //   1/(1+10^(pH-8.6)) = 1/(1+10^(3.6-pH))
        // gives pH - 8.6 = 3.6 - pH  =>  pH = 6.1, so the algorithm should
        // converge close to that value.
        const pI = calculateIsoelectricPoint('GGGGAAAA');
        expect(typeof pI).toBe('number');
        expect(Number.isNaN(pI)).toBe(false);
        expect(pI).toBeGreaterThanOrEqual(0);
        expect(pI).toBeLessThanOrEqual(14);
        expect(pI).toBeCloseTo(6.1, 0);
    });

    it('is lower for a sequence with more acidic residues than one with fewer', () => {
        const pIFewAcidic = calculateIsoelectricPoint('AAAAD');
        const pIManyAcidic = calculateIsoelectricPoint('DDDDD');
        expect(pIManyAcidic).toBeLessThan(pIFewAcidic);
    });

    it('is higher for a sequence with more basic residues than one with fewer', () => {
        const pIFewBasic = calculateIsoelectricPoint('AAAAK');
        const pIManyBasic = calculateIsoelectricPoint('KKKKK');
        expect(pIManyBasic).toBeGreaterThan(pIFewBasic);
    });

    it('is case-insensitive', () => {
        const pIUpper = calculateIsoelectricPoint('KKKKRRRR');
        const pILower = calculateIsoelectricPoint('kkkkrrrr');
        expect(pILower).toBeCloseTo(pIUpper, 2);
    });
});

describe('getAminoAcidComposition', () => {
    it('counts residues and categorizes them correctly for a mixed sequence', () => {
        const result = getAminoAcidComposition('AAVVDDKK');
        expect(result.counts).toEqual({ A: 2, V: 2, D: 2, K: 2 });
        expect(result.categories).toEqual({
            hydrophobic: 4, // A, A, V, V
            polar: 0,
            charged_pos: 2, // K, K
            charged_neg: 2, // D, D
        });
        expect(result.length).toBe(8);
    });

    it('is case-insensitive (lowercase input is uppercased first)', () => {
        const lower = getAminoAcidComposition('aavvddkk');
        const upper = getAminoAcidComposition('AAVVDDKK');
        expect(lower.counts).toEqual(upper.counts);
        expect(lower.categories).toEqual(upper.categories);
        expect(lower.length).toBe(upper.length);
    });

    it('handles an empty sequence', () => {
        const result = getAminoAcidComposition('');
        expect(result.counts).toEqual({});
        expect(result.categories).toEqual({
            hydrophobic: 0,
            polar: 0,
            charged_pos: 0,
            charged_neg: 0,
        });
        expect(result.length).toBe(0);
    });

    it('counts unknown residues without assigning them to a category', () => {
        const result = getAminoAcidComposition('XX');
        expect(result.counts).toEqual({ X: 2 });
        expect(result.categories).toEqual({
            hydrophobic: 0,
            polar: 0,
            charged_pos: 0,
            charged_neg: 0,
        });
        expect(result.length).toBe(2);
    });

    it('categorizes every polar residue correctly', () => {
        // polar = [G, S, T, C, Y, N, Q]
        const result = getAminoAcidComposition('GSTCYNQ');
        expect(result.categories.polar).toBe(7);
        expect(result.categories.hydrophobic).toBe(0);
        expect(result.categories.charged_pos).toBe(0);
        expect(result.categories.charged_neg).toBe(0);
        expect(result.length).toBe(7);
    });

    it('categorizes every hydrophobic residue correctly', () => {
        // hydrophobic = [A, V, L, I, M, F, W, P]
        const result = getAminoAcidComposition('AVLIMFWP');
        expect(result.categories.hydrophobic).toBe(8);
        expect(result.length).toBe(8);
    });

    it('length reflects the raw sequence length, not the sum of categorized residues', () => {
        // Mix of known and unknown residues: length counts everything,
        // but categories only count residues present in the category table.
        const result = getAminoAcidComposition('AXBZ');
        expect(result.length).toBe(4);
        const categorizedSum =
            result.categories.hydrophobic +
            result.categories.polar +
            result.categories.charged_pos +
            result.categories.charged_neg;
        expect(categorizedSum).toBeLessThan(result.length);
    });
});
