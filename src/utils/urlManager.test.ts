import { describe, it, expect, beforeEach } from 'vitest';
import { getShareableURL, parseURLState } from './urlManager';
import type { AppState } from './urlManager';

// Minimal valid AppState factory. Required fields per the interface in
// urlManager.ts: pdbId, representation, coloring, isSpinning, showLigands,
// showSurface. Everything else is optional.
const makeState = (overrides: Partial<AppState> = {}): AppState => ({
    pdbId: '1ABC',
    representation: 'cartoon',
    coloring: 'chainid',
    isSpinning: false,
    showLigands: false,
    showSurface: false,
    ...overrides,
});

// Helper to get a URLSearchParams for a URL string returned by getShareableURL.
const searchOf = (url: string) => new URL(url).searchParams;

beforeEach(() => {
    window.history.pushState({}, '', '/');
});

describe('getShareableURL', () => {
    describe('single view mode', () => {
        it('encodes pdb/rep/color unprefixed and omits false boolean flags', () => {
            const url = getShareableURL('single', [makeState()]);
            const params = searchOf(url);

            expect(params.get('pdb')).toBe('1ABC');
            expect(params.get('rep')).toBe('cartoon');
            expect(params.get('color')).toBe('chainid');
            expect(params.has('spin')).toBe(false);
            expect(params.has('lig')).toBe(false);
            expect(params.has('surf')).toBe(false);
            // Single mode never sets a 'view' param.
            expect(params.has('view')).toBe(false);
        });

        it('sets spin=1 when isSpinning is true', () => {
            const url = getShareableURL('single', [makeState({ isSpinning: true })]);
            expect(searchOf(url).get('spin')).toBe('1');
        });

        it('sets lig=1 when showLigands is true', () => {
            const url = getShareableURL('single', [makeState({ showLigands: true })]);
            expect(searchOf(url).get('lig')).toBe('1');
        });

        it('sets surf=1 when showSurface is true', () => {
            const url = getShareableURL('single', [makeState({ showSurface: true })]);
            expect(searchOf(url).get('surf')).toBe('1');
        });

        it('omits the pdb param when pdbId is an empty string', () => {
            const url = getShareableURL('single', [makeState({ pdbId: '' })]);
            const params = searchOf(url);
            expect(params.has('pdb')).toBe(false);
            // rep/color are unconditional, so they are still set.
            expect(params.get('rep')).toBe('cartoon');
            expect(params.get('color')).toBe('chainid');
        });

        it('omits src when dataSource is "pdb" (the default)', () => {
            const url = getShareableURL('single', [makeState({ dataSource: 'pdb' })]);
            expect(searchOf(url).has('src')).toBe(false);
        });

        it('includes src when dataSource is a non-pdb source', () => {
            const url = getShareableURL('single', [makeState({ dataSource: 'pubchem' })]);
            expect(searchOf(url).get('src')).toBe('pubchem');
        });

        it('base64-encodes a non-empty customColors array under cc', () => {
            const customColors = [{ selection: ':A', color: '#ff0000' }];
            const url = getShareableURL('single', [makeState({ customColors })]);
            const cc = searchOf(url).get('cc');
            expect(cc).toBeTruthy();
            expect(JSON.parse(atob(cc as string))).toEqual(customColors);
        });

        it('omits cc when customColors is an empty array', () => {
            const url = getShareableURL('single', [makeState({ customColors: [] })]);
            expect(searchOf(url).has('cc')).toBe(false);
        });

        it('omits rads when radiusScale is set but radiusType is not', () => {
            const url = getShareableURL('single', [makeState({ radiusScale: 2.5 })]);
            const params = searchOf(url);
            expect(params.has('radt')).toBe(false);
            expect(params.has('rads')).toBe(false);
        });

        it('includes radt and rads when radiusType is set alongside radiusScale', () => {
            const url = getShareableURL('single', [
                makeState({ radiusType: 'bfactor', radiusScale: 1.5 }),
            ]);
            const params = searchOf(url);
            expect(params.get('radt')).toBe('bfactor');
            expect(params.get('rads')).toBe('1.5');
        });

        it('includes rads=0 when radiusScale is exactly 0 (not treated as unset)', () => {
            const url = getShareableURL('single', [
                makeState({ radiusType: 'vdw', radiusScale: 0 }),
            ]);
            expect(searchOf(url).get('rads')).toBe('0');
        });

        it('includes radt but omits rads when radiusType is set and radiusScale is undefined', () => {
            const url = getShareableURL('single', [makeState({ radiusType: 'sstruc' })]);
            const params = searchOf(url);
            expect(params.get('radt')).toBe('sstruc');
            expect(params.has('rads')).toBe(false);
        });

        it('sets wire=1 when surfaceWireframe is true', () => {
            const url = getShareableURL('single', [makeState({ surfaceWireframe: true })]);
            expect(searchOf(url).get('wire')).toBe('1');
        });

        it('includes surft when surfaceType is set', () => {
            const url = getShareableURL('single', [makeState({ surfaceType: 'ses' })]);
            expect(searchOf(url).get('surft')).toBe('ses');
        });

        it('base64-encodes orientation, rounding array-of-number entries to 3 decimals', () => {
            const url = getShareableURL('single', [
                makeState({ orientation: [1.23456, 2, 3.999999] }),
            ]);
            const cam = searchOf(url).get('cam');
            expect(cam).toBeTruthy();
            // Hand-verified: (1.23456).toFixed(3) -> 1.235, (2).toFixed(3) -> 2,
            // (3.999999).toFixed(3) -> 4.000 (carries).
            expect(JSON.parse(atob(cam as string))).toEqual([1.235, 2, 4]);
        });

        it('base64-encodes a non-array orientation value as-is (no rounding applied)', () => {
            const orientation = { matrix: [1, 2, 3] };
            const url = getShareableURL('single', [makeState({ orientation })]);
            const cam = searchOf(url).get('cam');
            expect(JSON.parse(atob(cam as string))).toEqual(orientation);
        });

        it('base64-encodes a minimal projection of measurements under meas (dropping distance)', () => {
            const measurements = [
                {
                    atom1: { chain: 'A', resNo: 10, atomName: 'CA' },
                    atom2: { chain: 'B', resNo: 20, atomName: 'CB' },
                    distance: 5.5,
                },
            ];
            const url = getShareableURL('single', [makeState({ measurements })]);
            const meas = searchOf(url).get('meas');
            expect(meas).toBeTruthy();
            expect(JSON.parse(atob(meas as string))).toEqual([
                { a1: { c: 'A', r: 10, a: 'CA' }, a2: { c: 'B', r: 20, a: 'CB' } },
            ]);
        });

        it('omits meas when measurements is an empty array', () => {
            const url = getShareableURL('single', [makeState({ measurements: [] })]);
            expect(searchOf(url).has('meas')).toBe(false);
        });

        it('URI-encodes customBackgroundColor under bg', () => {
            const url = getShareableURL('single', [
                makeState({ customBackgroundColor: 'rgba(10,20,30,0.5)' }),
            ]);
            const bg = searchOf(url).get('bg');
            // The source calls encodeURIComponent explicitly before params.set(),
            // and URLSearchParams itself percent-encodes on serialization too
            // (e.g. '%' -> '%25'). A single params.get() only undoes the
            // serialization layer, so what comes back is the once
            // encodeURIComponent'd string, not the raw original value.
            // (parseURLState's own decodeURIComponent call undoes this layer
            // correctly -- see the round-trip test below.)
            expect(bg).toBe(encodeURIComponent('rgba(10,20,30,0.5)'));
        });

        it('omits bg when customBackgroundColor is null', () => {
            const url = getShareableURL('single', [makeState({ customBackgroundColor: null })]);
            expect(searchOf(url).has('bg')).toBe(false);
        });

        it('base64-encodes assignmentPayload under assign', () => {
            const assignmentPayload = {
                question: 'Pick the active site',
                successMessage: 'Correct!',
                targetChain: 'A',
                targetResNo: 42,
            };
            const url = getShareableURL('single', [makeState({ assignmentPayload })]);
            const assign = searchOf(url).get('assign');
            expect(JSON.parse(atob(assign as string))).toEqual(assignmentPayload);
        });

        it('base64-encodes storyboardPayload under story, round-tripping unicode', () => {
            const storyboardPayload = {
                title: 'Café Tour 🧬',
                slides: [
                    { id: 's1', title: 'Intro', description: 'Overview' },
                ],
            };
            const url = getShareableURL('single', [makeState({ storyboardPayload })]);
            const story = searchOf(url).get('story');
            expect(story).toBeTruthy();
            const decoded = JSON.parse(decodeURIComponent(escape(atob(story as string))));
            expect(decoded).toEqual(storyboardPayload);
        });

        it('omits si when storyboardSlideIndex is 0', () => {
            const url = getShareableURL('single', [makeState({ storyboardSlideIndex: 0 })]);
            expect(searchOf(url).has('si')).toBe(false);
        });

        it('includes si when storyboardSlideIndex is greater than 0', () => {
            const url = getShareableURL('single', [makeState({ storyboardSlideIndex: 5 })]);
            expect(searchOf(url).get('si')).toBe('5');
        });

        it('preserves an existing struct param from the current location', () => {
            window.history.pushState({}, '', '/?struct=5XYZ');
            const url = getShareableURL('single', [makeState()]);
            expect(searchOf(url).get('struct')).toBe('5XYZ');
        });

        it('does nothing when viewports is empty', () => {
            const url = getShareableURL('single', []);
            const params = searchOf(url);
            expect(params.has('pdb')).toBe(false);
            expect(params.has('rep')).toBe(false);
            expect(Array.from(params.keys())).toEqual([]);
        });
    });

    describe('multi view mode', () => {
        it('prefixes each viewport and sets a top-level view param, with no unprefixed pdb', () => {
            const url = getShareableURL('dual', [
                makeState({ pdbId: '1ABC' }),
                makeState({ pdbId: '2XYZ' }),
            ]);
            const params = searchOf(url);

            expect(params.get('view')).toBe('dual');
            expect(params.get('v0_pdb')).toBe('1ABC');
            expect(params.get('v1_pdb')).toBe('2XYZ');
            expect(params.get('v0_rep')).toBe('cartoon');
            expect(params.get('v1_color')).toBe('chainid');
            expect(params.has('pdb')).toBe(false);
        });

        it('skips viewports whose pdbId is falsy', () => {
            const url = getShareableURL('dual', [
                makeState({ pdbId: '1ABC' }),
                makeState({ pdbId: '' }),
            ]);
            const params = searchOf(url);

            expect(params.get('v0_pdb')).toBe('1ABC');
            expect(params.has('v1_pdb')).toBe(false);
            expect(params.has('v1_rep')).toBe(false);
        });

        it('does not preserve the struct param in non-single view modes', () => {
            window.history.pushState({}, '', '/?struct=5XYZ');
            const url = getShareableURL('dual', [makeState({ pdbId: '1ABC' })]);
            expect(searchOf(url).has('struct')).toBe(false);
        });

        it('uses the viewMode string verbatim for quad/triple as well', () => {
            const url = getShareableURL('quad', [makeState({ pdbId: '1ABC' })]);
            expect(searchOf(url).get('view')).toBe('quad');
        });
    });
});

describe('parseURLState', () => {
    it('defaults to viewMode "single" with a single empty-object viewport when the URL is empty', () => {
        // beforeEach already pushed '/'.
        const state = parseURLState();
        expect(state.viewMode).toBe('single');
        expect(state.viewports).toHaveLength(1);
        expect(state.viewports[0].pdbId).toBeUndefined();
    });

    it('round-trips a single-view state through getShareableURL', () => {
        const original = makeState({ pdbId: '1ABC', representation: 'surface', coloring: 'bfactor' });
        const url = getShareableURL('single', [original]);
        window.history.pushState({}, '', new URL(url).search);

        const state = parseURLState();
        expect(state.viewMode).toBe('single');
        expect(state.viewports[0].pdbId).toBe('1ABC');
        expect(state.viewports[0].representation).toBe('surface');
        expect(state.viewports[0].coloring).toBe('bfactor');
    });

    it('round-trips a dual-view state, leaving indices 2 and 3 as empty objects', () => {
        const vp0 = makeState({ pdbId: '1ABC', representation: 'ribbon' });
        const vp1 = makeState({ pdbId: '2XYZ', representation: 'spacefill' });
        const url = getShareableURL('dual', [vp0, vp1]);
        window.history.pushState({}, '', new URL(url).search);

        const state = parseURLState();
        expect(state.viewMode).toBe('dual');
        expect(state.viewports).toHaveLength(4);
        expect(state.viewports[0].pdbId).toBe('1ABC');
        expect(state.viewports[0].representation).toBe('ribbon');
        expect(state.viewports[1].pdbId).toBe('2XYZ');
        expect(state.viewports[1].representation).toBe('spacefill');
        expect(state.viewports[2]).toEqual({});
        expect(state.viewports[3]).toEqual({});
    });

    it('round-trips isSpinning:true as true, but a false isSpinning round-trips as undefined', () => {
        const spinningUrl = getShareableURL('single', [makeState({ isSpinning: true })]);
        window.history.pushState({}, '', new URL(spinningUrl).search);
        expect(parseURLState().viewports[0].isSpinning).toBe(true);

        window.history.pushState({}, '', '/');
        const notSpinningUrl = getShareableURL('single', [makeState({ isSpinning: false })]);
        window.history.pushState({}, '', new URL(notSpinningUrl).search);
        // The source only ever sets the flag to true when the '1' param is present;
        // it never explicitly sets it to false. A false value is therefore dropped
        // on write (no 'spin' param) and comes back as undefined, not false.
        expect(parseURLState().viewports[0].isSpinning).toBeUndefined();
    });

    it('round-trips showLigands/showSurface the same way (true stays true, false becomes undefined)', () => {
        const url = getShareableURL('single', [
            makeState({ showLigands: true, showSurface: false }),
        ]);
        window.history.pushState({}, '', new URL(url).search);
        const vp = parseURLState().viewports[0];
        expect(vp.showLigands).toBe(true);
        expect(vp.showSurface).toBeUndefined();
    });

    it('defaults representation to "cartoon" and coloring to "chainid" when absent', () => {
        window.history.pushState({}, '', '/?pdb=1ABC');
        const vp = parseURLState().viewports[0];
        expect(vp.representation).toBe('cartoon');
        expect(vp.coloring).toBe('chainid');
    });

    it('defaults dataSource to "pdb" when src is absent', () => {
        window.history.pushState({}, '', '/?pdb=1ABC');
        expect(parseURLState().viewports[0].dataSource).toBe('pdb');
    });

    it('parses src=pubchem and src=alphafold as dataSource', () => {
        window.history.pushState({}, '', '/?pdb=1ABC&src=pubchem');
        expect(parseURLState().viewports[0].dataSource).toBe('pubchem');

        window.history.pushState({}, '', '/?pdb=1ABC&src=alphafold');
        expect(parseURLState().viewports[0].dataSource).toBe('alphafold');
    });

    it('falls back to dataSource "pdb" for an unrecognized src value', () => {
        window.history.pushState({}, '', '/?pdb=1ABC&src=someUnknownSource');
        expect(parseURLState().viewports[0].dataSource).toBe('pdb');
    });

    it('round-trips radiusScale of exactly 0', () => {
        const url = getShareableURL('single', [
            makeState({ radiusType: 'vdw', radiusScale: 0 }),
        ]);
        window.history.pushState({}, '', new URL(url).search);
        const vp = parseURLState().viewports[0];
        expect(vp.radiusType).toBe('vdw');
        expect(vp.radiusScale).toBe(0);
    });

    it('round-trips measurements but always resets distance to 0 (minimal projection loses it)', () => {
        const measurements = [
            {
                atom1: { chain: 'A', resNo: 10, atomName: 'CA' },
                atom2: { chain: 'B', resNo: 20, atomName: 'CB' },
                distance: 5.5,
            },
        ];
        const url = getShareableURL('single', [makeState({ measurements })]);
        window.history.pushState({}, '', new URL(url).search);
        const vp = parseURLState().viewports[0];
        expect(vp.measurements).toEqual([
            {
                atom1: { chain: 'A', resNo: 10, atomName: 'CA' },
                atom2: { chain: 'B', resNo: 20, atomName: 'CB' },
                distance: 0,
            },
        ]);
    });

    it('round-trips customBackgroundColor containing special characters', () => {
        const url = getShareableURL('single', [
            makeState({ customBackgroundColor: 'rgba(10,20,30,0.5)' }),
        ]);
        window.history.pushState({}, '', new URL(url).search);
        expect(parseURLState().viewports[0].customBackgroundColor).toBe('rgba(10,20,30,0.5)');
    });

    it('round-trips storyboardSlideIndex, and rejects a negative value injected directly in the URL', () => {
        const url = getShareableURL('single', [makeState({ storyboardSlideIndex: 7 })]);
        window.history.pushState({}, '', new URL(url).search);
        expect(parseURLState().viewports[0].storyboardSlideIndex).toBe(7);

        window.history.pushState({}, '', '/?pdb=1ABC&si=-3');
        expect(parseURLState().viewports[0].storyboardSlideIndex).toBeUndefined();
    });

    it('treats a non-numeric si value as absent (NaN is rejected)', () => {
        window.history.pushState({}, '', '/?pdb=1ABC&si=notanumber');
        expect(parseURLState().viewports[0].storyboardSlideIndex).toBeUndefined();
    });

    it('returns a non-null viewport (pdbId undefined) when only assign is present, with no pdb', () => {
        const assignmentPayload = {
            question: 'Pick the binding site',
            successMessage: 'Nice!',
            targetChain: 'A',
            targetResNo: 1,
        };
        const b64 = btoa(JSON.stringify(assignmentPayload));
        window.history.pushState({}, '', `/?assign=${b64}`);

        const state = parseURLState();
        expect(state.viewports).toHaveLength(1);
        expect(state.viewports[0].pdbId).toBeUndefined();
        expect(state.viewports[0].assignmentPayload).toEqual(assignmentPayload);
    });

    it('returns a non-null viewport (pdbId undefined) when only story is present, with no pdb', () => {
        const storyboardPayload = { title: 'No PDB here', slides: [] };
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(storyboardPayload))));
        window.history.pushState({}, '', `/?story=${b64}`);

        const state = parseURLState();
        expect(state.viewports).toHaveLength(1);
        expect(state.viewports[0].pdbId).toBeUndefined();
        expect(state.viewports[0].storyboardPayload).toEqual(storyboardPayload);
    });

    it('treats an unparseable cc/cam/meas/story value as absent rather than throwing', () => {
        window.history.pushState(
            {},
            '',
            '/?pdb=1ABC&cc=not-valid-base64!!&cam=not-valid-base64!!&meas=not-valid-base64!!'
        );
        const vp = parseURLState().viewports[0];
        expect(vp.pdbId).toBe('1ABC');
        expect(vp.customColors).toBeUndefined();
        expect(vp.orientation).toBeUndefined();
        expect(vp.measurements).toBeUndefined();
    });

    it('in multi-view mode, an unprefixed top-level assign param makes every empty slot non-empty', () => {
        // This documents a real quirk of the source: hasAssign is computed as
        // `params.get(p('assign')) || params.get('assign') || params.get(p('story')) || params.get('story')`,
        // i.e. it checks the BARE 'assign'/'story' keys in addition to the
        // prefixed ones. So a single unprefixed 'assign' param causes every
        // v0..v3 slot (even ones with no pdb and no prefixed assign of their
        // own) to produce a default-filled object instead of {}.
        const assignmentPayload = {
            question: 'Pick a residue',
            successMessage: 'Yes!',
            targetChain: 'A',
            targetResNo: 5,
        };
        const b64 = btoa(JSON.stringify(assignmentPayload));
        window.history.pushState({}, '', `/?view=dual&assign=${b64}`);

        const state = parseURLState();
        expect(state.viewMode).toBe('dual');
        expect(state.viewports).toHaveLength(4);
        for (const vp of state.viewports) {
            expect(vp).not.toEqual({});
            expect(vp.pdbId).toBeUndefined();
            expect(vp.representation).toBe('cartoon');
            expect(vp.coloring).toBe('chainid');
        }
        // Only the slot whose OWN prefixed key would match actually gets the
        // decoded payload; the bare key is not itself prefix-specific so none
        // of v0_assign..v3_assign exist, and none of the slots decode a payload.
        expect(state.viewports[0].assignmentPayload).toBeUndefined();
    });

    it('populates viewports with distinct data per prefix and does not cross-contaminate slots', () => {
        window.history.pushState(
            {},
            '',
            '/?view=dual&v0_pdb=1ABC&v0_rep=cartoon&v1_pdb=2XYZ&v1_rep=surface&v1_spin=1'
        );
        const state = parseURLState();
        expect(state.viewports[0].pdbId).toBe('1ABC');
        expect(state.viewports[0].representation).toBe('cartoon');
        expect(state.viewports[0].isSpinning).toBeUndefined();
        expect(state.viewports[1].pdbId).toBe('2XYZ');
        expect(state.viewports[1].representation).toBe('surface');
        expect(state.viewports[1].isSpinning).toBe(true);
    });
});
