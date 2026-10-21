// A lightweight, explicitly-approximate electrostatic surface potential.
//
// This is NOT a physically rigorous Poisson-Boltzmann solve — that needs a
// numerical PDE solver over a 3D grid (e.g. APBS) and isn't something this
// app's all-client-side architecture can run. What's here is the same
// spirit as PyMOL's quick "vacuum electrostatics" preview: a handful of
// fixed formal charges on specific charged-residue side-chain atoms, summed
// with a simple distance-screened Coulomb-like falloff. It's good for
// spotting charged surface patches (a basic binding groove, an acidic
// patch) at a glance — not for anything quantitative. The UI must say so.

export interface ChargedAtom {
    x: number;
    y: number;
    z: number;
    charge: number;
}

// Formal charges on specific side-chain atoms of the charged amino acids,
// at physiological pH. Each of ASP/GLU/LYS/ARG sums to a net ±1 over its
// charged group. HIS is only weakly basic (side-chain pKa ~6, mostly
// deprotonated/neutral at pH 7) so it gets a small partial charge rather
// than a full +1 like Lys/Arg. Backbone and N-/C-terminal charges are
// intentionally omitted — this is a side-chain-level approximation, not a
// full force-field charge assignment.
const RESIDUE_CHARGES: Record<string, Record<string, number>> = {
    ASP: { OD1: -0.5, OD2: -0.5 },
    GLU: { OE1: -0.5, OE2: -0.5 },
    LYS: { NZ: 1.0 },
    ARG: { NH1: 0.5, NH2: 0.5 },
    HIS: { ND1: 0.1, NE2: 0.1 },
};

export function getFormalCharge(resname: string, atomname: string): number {
    return RESIDUE_CHARGES[resname]?.[atomname] ?? 0;
}

// Beyond this distance a screened contribution is negligible; also used as
// the spatial grid's cell size so a query only has to check the 27
// neighboring cells instead of every charged atom in the structure.
const CUTOFF = 15;

// Buckets charged atoms into a uniform 3D grid so potentialAt() only has to
// scan nearby cells rather than every charged atom — the whole point of a
// cutoff radius is wasted if the lookup itself is still O(n).
export class ChargeGrid {
    private cells = new Map<string, ChargedAtom[]>();

    private cellKey(x: number, y: number, z: number): string {
        return `${Math.floor(x / CUTOFF)},${Math.floor(y / CUTOFF)},${Math.floor(z / CUTOFF)}`;
    }

    add(atom: ChargedAtom): void {
        const key = this.cellKey(atom.x, atom.y, atom.z);
        const bucket = this.cells.get(key);
        if (bucket) bucket.push(atom);
        else this.cells.set(key, [atom]);
    }

    get size(): number {
        let n = 0;
        for (const bucket of this.cells.values()) n += bucket.length;
        return n;
    }

    // Screened potential at (x,y,z): sum of charge / (r + 1) over every
    // charged atom within CUTOFF. The "+1" avoids a singularity at r=0
    // without needing a separate self-exclusion check.
    potentialAt(x: number, y: number, z: number): number {
        const cx = Math.floor(x / CUTOFF);
        const cy = Math.floor(y / CUTOFF);
        const cz = Math.floor(z / CUTOFF);
        let sum = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const bucket = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
                    if (!bucket) continue;
                    for (const atom of bucket) {
                        const r = Math.sqrt((x - atom.x) ** 2 + (y - atom.y) ** 2 + (z - atom.z) ** 2);
                        if (r > CUTOFF) continue;
                        sum += atom.charge / (r + 1);
                    }
                }
            }
        }
        return sum;
    }
}

// Maps a signed potential to a diverging red(negative)-white(neutral)-
// blue(positive) RGB color, matching the universal convention used by
// APBS/PyMOL/ChimeraX electrostatic surface coloring. vMax bounds the color
// scale (typically the largest |potential| seen across the structure, so
// contrast adapts per-structure) — values beyond it saturate.
export function potentialToColor(v: number, vMax: number): number {
    const norm = vMax > 0 ? Math.max(-1, Math.min(1, v / vMax)) : 0;
    const fade = Math.round(255 * (1 - Math.abs(norm)));
    if (norm <= 0) return (255 << 16) | (fade << 8) | fade; // red -> white
    return (fade << 16) | (fade << 8) | 255; // white -> blue
}
