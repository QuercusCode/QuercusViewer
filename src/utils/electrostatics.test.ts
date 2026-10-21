import { describe, it, expect } from 'vitest';
import { ChargeGrid, getFormalCharge, potentialToColor } from './electrostatics';

describe('getFormalCharge', () => {
    it('assigns negative charges to ASP/GLU carboxylate oxygens', () => {
        expect(getFormalCharge('ASP', 'OD1')).toBe(-0.5);
        expect(getFormalCharge('ASP', 'OD2')).toBe(-0.5);
        expect(getFormalCharge('GLU', 'OE1')).toBe(-0.5);
    });

    it('assigns positive charges to LYS/ARG basic nitrogens', () => {
        expect(getFormalCharge('LYS', 'NZ')).toBe(1.0);
        expect(getFormalCharge('ARG', 'NH1')).toBe(0.5);
        expect(getFormalCharge('ARG', 'NH2')).toBe(0.5);
    });

    it('gives HIS a small partial charge, not a full formal charge', () => {
        const q = getFormalCharge('HIS', 'ND1');
        expect(q).toBeGreaterThan(0);
        expect(q).toBeLessThan(0.5);
    });

    it('returns 0 for backbone atoms and uncharged residues', () => {
        expect(getFormalCharge('ALA', 'CA')).toBe(0);
        expect(getFormalCharge('ASP', 'CA')).toBe(0);
        expect(getFormalCharge('GLY', 'N')).toBe(0);
    });

    it('returns 0 for an unknown residue/atom combination', () => {
        expect(getFormalCharge('LYS', 'CA')).toBe(0);
        expect(getFormalCharge('XYZ', 'OD1')).toBe(0);
    });
});

describe('ChargeGrid', () => {
    it('sums contributions from nearby charges, weighted by distance', () => {
        const grid = new ChargeGrid();
        grid.add({ x: 0, y: 0, z: 0, charge: 1 });
        const near = grid.potentialAt(1, 0, 0);
        const far = grid.potentialAt(5, 0, 0);
        expect(near).toBeGreaterThan(far);
        expect(near).toBeGreaterThan(0);
    });

    it('ignores charges beyond the cutoff radius', () => {
        const grid = new ChargeGrid();
        grid.add({ x: 100, y: 100, z: 100, charge: 1 });
        expect(grid.potentialAt(0, 0, 0)).toBe(0);
    });

    it('sums multiple charges of opposite sign correctly', () => {
        const grid = new ChargeGrid();
        grid.add({ x: 0, y: 0, z: 0, charge: 1 });
        grid.add({ x: 2, y: 0, z: 0, charge: -1 });
        // Equidistant from both -> contributions should cancel out.
        const midpoint = grid.potentialAt(1, 0, 0);
        expect(midpoint).toBeCloseTo(0, 5);
    });

    it('tracks the total number of charged atoms added', () => {
        const grid = new ChargeGrid();
        expect(grid.size).toBe(0);
        grid.add({ x: 0, y: 0, z: 0, charge: 1 });
        grid.add({ x: 10, y: 10, z: 10, charge: -1 });
        expect(grid.size).toBe(2);
    });

    it('finds charges across neighboring grid cells, not just the same cell', () => {
        const grid = new ChargeGrid();
        // These two points sit in different grid cells (cell size = 15) but
        // are well within the 15 cutoff of each other.
        grid.add({ x: 14, y: 0, z: 0, charge: 1 });
        const v = grid.potentialAt(16, 0, 0);
        expect(v).toBeGreaterThan(0);
    });
});

describe('potentialToColor', () => {
    it('maps a neutral potential to white', () => {
        expect(potentialToColor(0, 2)).toBe(0xFFFFFF);
    });

    it('maps a fully negative potential to pure red', () => {
        expect(potentialToColor(-2, 2)).toBe(0xFF0000);
    });

    it('maps a fully positive potential to pure blue', () => {
        expect(potentialToColor(2, 2)).toBe(0x0000FF);
    });

    it('clamps values beyond vMax instead of over/undershooting the color range', () => {
        expect(potentialToColor(-10, 2)).toBe(0xFF0000);
        expect(potentialToColor(10, 2)).toBe(0x0000FF);
    });

    it('produces an intermediate color for a partial potential', () => {
        const color = potentialToColor(-1, 2); // halfway to pure red
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        expect(r).toBe(255);
        expect(g).toBeGreaterThan(0);
        expect(g).toBeLessThan(255);
        expect(g).toBe(b);
    });

    it('does not divide by zero when vMax is 0 (an uncharged structure)', () => {
        expect(potentialToColor(0, 0)).toBe(0xFFFFFF);
    });
});
