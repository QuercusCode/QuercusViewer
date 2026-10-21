import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchUniProtDataByAccession } from './uniprot';

function mockFetchOnce(response: { ok: boolean; json?: () => Promise<unknown> }) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response));
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchUniProtDataByAccession - relatedPdbEntries', () => {
    it('extracts only PDB cross-references, ignoring other cross-reference databases', async () => {
        mockFetchOnce({
            ok: true,
            json: async () => ({
                primaryAccession: 'P69905',
                uniProtkbId: 'HBA_HUMAN',
                uniProtKBCrossReferences: [
                    { database: 'PDB', id: '1IVO', properties: [{ key: 'Method', value: 'X-ray' }, { key: 'Resolution', value: '2.80 Å' }] },
                    { database: 'EMBL', id: 'AY260759' },
                    { database: 'PDB', id: '2DN2', properties: [{ key: 'Method', value: 'X-ray' }, { key: 'Resolution', value: '1.25 Å' }, { key: 'Chains', value: 'A=1-141' }] },
                ],
            }),
        });

        const data = await fetchUniProtDataByAccession('P69905');
        expect(data?.relatedPdbEntries).toEqual([
            { id: '1IVO', method: 'X-ray', resolution: '2.80 Å', chains: undefined },
            { id: '2DN2', method: 'X-ray', resolution: '1.25 Å', chains: 'A=1-141' },
        ]);
    });

    it('returns an empty array when there are no cross-references at all', async () => {
        mockFetchOnce({
            ok: true,
            json: async () => ({ primaryAccession: 'P00000', uniProtkbId: 'TEST_HUMAN' }),
        });

        const data = await fetchUniProtDataByAccession('P00000');
        expect(data?.relatedPdbEntries).toEqual([]);
    });

    it('handles a PDB cross-reference with no properties array at all', async () => {
        mockFetchOnce({
            ok: true,
            json: async () => ({
                primaryAccession: 'P00001',
                uniProtkbId: 'TEST_HUMAN',
                uniProtKBCrossReferences: [{ database: 'PDB', id: '1ABC' }],
            }),
        });

        const data = await fetchUniProtDataByAccession('P00001');
        expect(data?.relatedPdbEntries).toEqual([{ id: '1ABC', method: undefined, resolution: undefined, chains: undefined }]);
    });

    it('returns null on a non-OK response, without throwing', async () => {
        mockFetchOnce({ ok: false });
        expect(await fetchUniProtDataByAccession('P99999')).toBeNull();
    });
});
