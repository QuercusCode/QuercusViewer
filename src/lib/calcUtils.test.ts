import { describe, it, expect } from 'vitest';
import { performCalculation, U_CONV } from './calcUtils';

describe('U_CONV', () => {
    it('has the correct base-unit factor for volume mL', () => {
        expect(U_CONV.vol.mL).toBe(0.001);
    });

    it('has the correct base-unit factor for concentration M', () => {
        expect(U_CONV.conc.M).toBe(1);
    });

    it('has the correct base-unit factor for mass g', () => {
        expect(U_CONV.mass.g).toBe(1);
    });
});

describe('performCalculation - dilution mode (C1V1 = C2V2)', () => {
    it('solves for v1 given c1, c2, v2 all in base units (M, L)', () => {
        // C1*V1 = C2*V2 -> 20*V1 = 10*5 = 50 -> V1 = 2.5
        const result = performCalculation(
            'dilution',
            { c1: '20', v1: '', c2: '10', v2: '5' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'v1'
        );
        expect(result.values.v1).toBe('2.5');
        expect(result.targetField).toBe('v1');
    });

    it('solves for v1 the same way when v2 is supplied in mL instead of L', () => {
        // v2 = 5000 mL = 5000 * 0.001 = 5 L (same base value as the all-L test above)
        // 20*V1 = 10*5 = 50 -> V1 = 2.5 (still requested back in L)
        const result = performCalculation(
            'dilution',
            { c1: '20', v1: '', c2: '10', v2: '5000' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'mL' },
            'v1'
        );
        expect(result.values.v1).toBe('2.5');
        expect(result.targetField).toBe('v1');
    });

    it('defaults the target unit conversion factor to 1 when the target unit is missing from `units`', () => {
        // Same numbers as the basic v1 test, but units.v1 is omitted entirely.
        // U_CONV.vol[undefined] is undefined, so `|| 1` falls back to 1 (same as 'L'),
        // so the result should still be 2.5.
        const result = performCalculation(
            'dilution',
            { c1: '20', v1: '', c2: '10', v2: '5' },
            { c1: 'M', c2: 'M', v2: 'L' },
            'v1'
        );
        expect(result.values.v1).toBe('2.5');
    });

    it('solves for c1 given v1, c2, v2', () => {
        // C1 = (C2*V2)/V1 = (10*5)/2 = 25
        const result = performCalculation(
            'dilution',
            { c1: '', v1: '2', c2: '10', v2: '5' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'c1'
        );
        expect(result.values.c1).toBe('25');
        expect(result.targetField).toBe('c1');
    });

    it('solves for c2 given c1, v1, v2', () => {
        // C2 = (C1*V1)/V2 = (4*3)/6 = 2
        const result = performCalculation(
            'dilution',
            { c1: '4', v1: '3', c2: '', v2: '6' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'c2'
        );
        expect(result.values.c2).toBe('2');
        expect(result.targetField).toBe('c2');
    });

    it('solves for v2 given c1, v1, c2', () => {
        // V2 = (C1*V1)/C2 = (5*4)/10 = 2
        const result = performCalculation(
            'dilution',
            { c1: '5', v1: '4', c2: '10', v2: '' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'v2'
        );
        expect(result.values.v2).toBe('2');
        expect(result.targetField).toBe('v2');
    });

    it('rounds a repeating-decimal result to 5 decimal places and strips trailing zeros', () => {
        // V1 = (C2*V2)/C1 = (10*1)/3 = 3.3333333333333335 -> toFixed(5) -> "3.33333"
        const result = performCalculation(
            'dilution',
            { c1: '3', v1: '', c2: '10', v2: '1' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'v1'
        );
        expect(result.values.v1).toBe('3.33333');
    });

    it('does not compute the target when a required input is exactly zero (falsy-zero guard)', () => {
        // Mathematically C2 = (C1*V1)/V2 = (5*0)/5 = 0, but the source guards each branch with
        // a truthy check (e.g. `base.c1 && base.v1 && base.v2`), so a legitimately-zero input
        // (v1 = 0) is treated the same as a missing input and the branch is skipped entirely.
        // This leaves base.c2 undefined, which becomes the string "NaN" and is then cleaned to ''.
        const result = performCalculation(
            'dilution',
            { c1: '5', v1: '0', c2: '', v2: '5' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'c2'
        );
        expect(result.values.c2).toBe('');
    });

    it('leaves a non-numeric (invalid) required field untouched and cleans the uncomputable target to empty string', () => {
        // c1 = 'abc' -> parseFloat('abc') is NaN, so it is never added to `base`.
        // The v1 branch then requires base.c1, which is undefined/falsy, so v1 is never computed.
        const result = performCalculation(
            'dilution',
            { c1: 'abc', v1: '', c2: '10', v2: '5' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'v1'
        );
        expect(result.values.v1).toBe('');
        // The invalid field itself is not a literal "NaN"/"Infinity"/"-Infinity" string, so cleanup
        // leaves it exactly as it was in the input.
        expect(result.values.c1).toBe('abc');
    });

    it('leaves a missing (empty-string) required field unchanged and cleans the resulting NaN target to empty string', () => {
        // c1 is '' (empty), so base.c1 is never set. The v1 branch's guard (base.c1 && ...) is
        // falsy, so v1 is never computed; the forced "NaN" string that results is cleaned to ''.
        const result = performCalculation(
            'dilution',
            { c1: '', v1: '', c2: '10', v2: '5' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            'v1'
        );
        expect(result.values.v1).toBe('');
        // c1 was never part of a successful computation and was never the target, so it stays
        // exactly as it was given: an untouched empty string (not mutated into "NaN").
        expect(result.values.c1).toBe('');
    });
});

describe('performCalculation - molarity mode (Mass = Conc * Vol * MW)', () => {
    it('solves for m (mass) given c, v, mw', () => {
        // mass = conc*vol*mw = 2*3*10 = 60
        const result = performCalculation(
            'molarity',
            { c: '2', v: '3', mw: '10', m: '' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'm'
        );
        expect(result.values.m).toBe('60');
        expect(result.targetField).toBe('m');
    });

    it('solves for c given v, mw, m', () => {
        // c = m / (v*mw) = 20 / (2*5) = 2
        const result = performCalculation(
            'molarity',
            { c: '', v: '2', mw: '5', m: '20' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'c'
        );
        expect(result.values.c).toBe('2');
        expect(result.targetField).toBe('c');
    });

    it('solves for v given c, mw, m', () => {
        // v = m / (c*mw) = 40 / (4*5) = 2
        const result = performCalculation(
            'molarity',
            { c: '4', v: '', mw: '5', m: '40' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'v'
        );
        expect(result.values.v).toBe('2');
        expect(result.targetField).toBe('v');
    });

    it('solves for mw given c, v, m', () => {
        // mw = m / (c*v) = 100 / (2*5) = 10
        const result = performCalculation(
            'molarity',
            { c: '2', v: '5', mw: '', m: '100' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'mw'
        );
        expect(result.values.mw).toBe('10');
        expect(result.targetField).toBe('mw');
    });

    it('converts units correctly (mM, µL, mg) before and after applying the formula', () => {
        // base.c = 1000 mM * 0.001 = 1 M
        // base.v = 2000000 µL * 0.000001 = 2 L
        // base.mw = 50 g/mol * 1 = 50
        // base.m (grams) = 1 * 2 * 50 = 100 g
        // result in mg = 100 / 0.001 = 100000
        const result = performCalculation(
            'molarity',
            { c: '1000', v: '2000000', mw: '50', m: '' },
            { c: 'mM', v: 'µL', mw: 'g/mol', m: 'mg' },
            'm'
        );
        expect(result.values.m).toBe('100000');
    });

    it('treats any type other than exactly "dilution" as molarity mode', () => {
        // The source only special-cases the literal string 'dilution'; any other type string
        // falls through to the c/v/mw/m field set and the Mass = Conc*Vol*MW formula.
        const result = performCalculation(
            'some-other-type',
            { c: '2', v: '3', mw: '10', m: '' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'm'
        );
        expect(result.values.m).toBe('60');
        expect(result.targetField).toBe('m');
    });

    it('cleans the uncomputable target to empty string when a required field is missing', () => {
        // c and v are both empty, so the 'c' branch's guard (base.v && base.mw && base.m)
        // is falsy and base.c is never computed; the forced "NaN" string is cleaned to ''.
        const result = performCalculation(
            'molarity',
            { c: '', v: '', mw: '5', m: '20' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'c'
        );
        expect(result.values.c).toBe('');
        // v was never the target and never successfully computed; it stays an untouched ''.
        expect(result.values.v).toBe('');
    });
});

describe('performCalculation - NaN/Infinity cleanup', () => {
    it('leaves a non-target field that was never part of the computation completely unchanged', () => {
        // `label` is not one of the known fields (c, v, mw, m) for molarity mode, so it is never
        // touched by the base-unit loop or the target computation. It must stay exactly as given.
        const result = performCalculation(
            'molarity',
            { c: '2', v: '3', mw: '10', m: '', label: '' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            'm'
        );
        expect(result.values.m).toBe('60');
        expect(result.values.label).toBe('');
    });

    it('cleans literal "NaN"/"Infinity"/"-Infinity" strings to empty string when target is null', () => {
        // With target === null, the entire solve/convert block is skipped, so only the cleanup
        // pass runs over the raw input values.
        const result = performCalculation(
            'molarity',
            { c: 'NaN', v: 'Infinity', mw: '-Infinity', m: '5' },
            { c: 'M', v: 'L', mw: 'g/mol', m: 'g' },
            null
        );
        expect(result.values.c).toBe('');
        expect(result.values.v).toBe('');
        expect(result.values.mw).toBe('');
        // A value that isn't one of the three literal strings is left alone.
        expect(result.values.m).toBe('5');
        expect(result.targetField).toBeNull();
    });
});

describe('performCalculation - edge cases', () => {
    it('does not attempt any computation when target is null, and returns targetField null', () => {
        const result = performCalculation(
            'dilution',
            { c1: '', v1: '', c2: '', v2: '' },
            { c1: 'M', v1: 'L', c2: 'M', v2: 'L' },
            null
        );
        expect(result.values).toEqual({ c1: '', v1: '', c2: '', v2: '' });
        expect(result.targetField).toBeNull();
    });
});
