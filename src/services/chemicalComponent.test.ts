import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchChemicalComponent } from './chemicalComponent';

function mockFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchChemicalComponent', () => {
    it('parses formula, molecular weight, name, and SMILES from a successful response', async () => {
        mockFetchOnce({
            ok: true,
            json: async () => ({
                chem_comp: { name: "ADENOSINE-5'-TRIPHOSPHATE", formula: 'C10 H16 N5 O13 P3', formula_weight: 507.18 },
                rcsb_chem_comp_descriptor: { smiles_stereo: 'c1nc(c2c(n1)n(cn2)...)', smiles: 'fallback-smiles' },
            }),
        });

        const info = await fetchChemicalComponent('ATP1');
        expect(info).toEqual({
            name: "ADENOSINE-5'-TRIPHOSPHATE",
            formula: 'C10 H16 N5 O13 P3',
            molecularWeight: 507.18,
            smiles: 'c1nc(c2c(n1)n(cn2)...)',
        });
    });

    it('prefers the stereo SMILES but falls back to the plain SMILES when absent', async () => {
        mockFetchOnce({
            ok: true,
            json: async () => ({
                chem_comp: { name: 'Zinc ion', formula: 'Zn', formula_weight: 65.38 },
                rcsb_chem_comp_descriptor: { smiles: '[Zn+2]' },
            }),
        });

        const info = await fetchChemicalComponent('ZN1');
        expect(info?.smiles).toBe('[Zn+2]');
    });

    it('returns null when the response is not OK', async () => {
        mockFetchOnce({ ok: false });
        expect(await fetchChemicalComponent('XYZ1')).toBeNull();
    });

    it('returns null when chem_comp is missing from the response body', async () => {
        mockFetchOnce({ ok: true, json: async () => ({}) });
        expect(await fetchChemicalComponent('XYZ2')).toBeNull();
    });

    it('returns null when every field is unusable (not just blank/missing individually)', async () => {
        mockFetchOnce({ ok: true, json: async () => ({ chem_comp: { name: 123, formula: null } }) });
        expect(await fetchChemicalComponent('XYZ3')).toBeNull();
    });

    it('returns null and does not throw when fetch itself rejects', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('network down')));
        expect(await fetchChemicalComponent('XYZ4')).toBeNull();
    });

    it('caches a successful lookup and does not refetch for the same code', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce({
            ok: true,
            json: async () => ({ chem_comp: { name: 'Heme', formula: 'C34 H32 Fe N4 O4', formula_weight: 616.49 } }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const first = await fetchChemicalComponent('HEM1');
        const second = await fetchChemicalComponent('hem1'); // lowercase - same cache key

        expect(first).toEqual(second);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed lookup, so a later call retries', async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: false })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ chem_comp: { name: 'Retried', formula: 'C' } }) });
        vi.stubGlobal('fetch', fetchMock);

        const first = await fetchChemicalComponent('RET1');
        const second = await fetchChemicalComponent('RET1');

        expect(first).toBeNull();
        expect(second).toEqual({ name: 'Retried', formula: 'C', molecularWeight: undefined, smiles: undefined });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('returns null for an empty/whitespace-only code without calling fetch', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        expect(await fetchChemicalComponent('   ')).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
