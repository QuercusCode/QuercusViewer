import type { RepresentationType, ColoringType, CustomColorRule, StoryboardPayload } from '../types';
import type { DataSource } from '../utils/pdbUtils';

export interface AppState {
    pdbId: string;
    representation: RepresentationType;
    coloring: ColoringType;
    customColors?: CustomColorRule[];
    orientation?: any; // Matrix or Quaternion array
    isSpinning: boolean;
    showLigands: boolean;
    showSurface: boolean;
    measurements?: { atom1: any, atom2: any, distance: number }[];
    customBackgroundColor?: string | null;
    dataSource?: DataSource; // Added for chemical structures
    assignmentPayload?: import('../types').AssignmentPayload;
    storyboardPayload?: StoryboardPayload;
}

export interface MultiViewState {
    viewMode: 'single' | 'dual' | 'triple' | 'quad';
    viewports: Partial<AppState>[];
}

/**
 * Serializes the current app state (single or multi-view) into a URL.
 */
export const getShareableURL = (viewMode: string, viewports: AppState[]): string => {
    const params = new URLSearchParams();

    // Set View Mode if not single
    if (viewMode !== 'single') {
        params.set('view', viewMode);
    }

    // Preserve 'struct' parameter for database-loaded structures
    const currentParams = new URLSearchParams(window.location.search);
    const structId = currentParams.get('struct');
    if (structId && viewMode === 'single') {
        params.set('struct', structId);
    }

    // Helper to set params with optional prefix
    const setParams = (prefix: string, state: AppState) => {
        const p = (key: string) => prefix ? `${prefix}_${key}` : key;

        if (state.pdbId) params.set(p('pdb'), state.pdbId);
        params.set(p('rep'), state.representation);
        params.set(p('color'), state.coloring);

        if (state.dataSource && state.dataSource !== 'pdb') {
            params.set(p('src'), state.dataSource);
        }

        if (state.customColors && state.customColors.length > 0) {
            try {
                const b64 = btoa(JSON.stringify(state.customColors));
                params.set(p('cc'), b64);
            } catch (e) { }
        }

        if (state.isSpinning) params.set(p('spin'), '1');
        if (state.showLigands) params.set(p('lig'), '1');
        if (state.showSurface) params.set(p('surf'), '1');

        if (state.orientation) {
            try {
                // Optimize: Round floats to 3 decimal places to save space
                // NGL orientation is usually a 16-element array (matrix) or similar
                let optimizedOrientation = state.orientation;
                if (Array.isArray(state.orientation)) {
                    optimizedOrientation = state.orientation.map((n: any) =>
                        typeof n === 'number' ? Number(n.toFixed(3)) : n
                    );
                }
                const b64 = btoa(JSON.stringify(optimizedOrientation));
                params.set(p('cam'), b64);
            } catch (e) { console.warn("Serialization warning", e); }
        }


        if (state.measurements && state.measurements.length > 0) {
            try {
                const minimalData = state.measurements.map(m => ({
                    a1: { c: m.atom1.chain, r: m.atom1.resNo, a: m.atom1.atomName },
                    a2: { c: m.atom2.chain, r: m.atom2.resNo, a: m.atom2.atomName }
                }));
                const b64 = btoa(JSON.stringify(minimalData));
                params.set(p('meas'), b64);
            } catch (e) { }
        }

        if (state.customBackgroundColor) {
            params.set(p('bg'), encodeURIComponent(state.customBackgroundColor));
        }

        if (state.assignmentPayload) {
            try {
                const b64 = btoa(JSON.stringify(state.assignmentPayload));
                params.set(p('assign'), b64);
            } catch (e) { }
        }

        if (state.storyboardPayload) {
            try {
                const jsonStr = JSON.stringify(state.storyboardPayload);
                const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
                params.set(p('story'), b64);
            } catch (e) { console.warn("Storyboard serialization failed", e); }
        }
    };

    // Encode states
    if (viewMode === 'single') {
        // Legacy/Simple format (no prefix)
        if (viewports[0]) setParams('', viewports[0]);
    } else {
        // Multi-view format (v0_, v1_, etc.)
        viewports.forEach((vp, index) => {
            // Only save if it has content (pdbId)
            if (vp.pdbId) {
                setParams(`v${index}`, vp);
            }
        });
    }

    const url = new URL(window.location.href);
    url.search = params.toString();
    return url.toString();
};

/**
 * Parses the current URL search parameters to restore state.
 * Returns a MultiViewState object.
 */
export const parseURLState = (): MultiViewState => {
    const params = new URLSearchParams(window.location.search);

    const viewMode = (params.get('view') as any) || 'single';
    const viewports: Partial<AppState>[] = [];

    // Helper to parse params with optional prefix
    const parseParams = (prefix: string): Partial<AppState> | null => {
        const p = (key: string) => prefix ? `${prefix}_${key}` : key;
        const state: Partial<AppState> = {};

        const pdb = params.get(p('pdb'));
        const hasAssign = params.get(p('assign')) || params.get('assign') || params.get(p('story')) || params.get('story');
        if (!pdb && !hasAssign) return null; // No PDB and no assignment/story = empty viewport

        state.pdbId = pdb || undefined;
        state.representation = (params.get(p('rep')) as any) || 'cartoon';
        state.coloring = (params.get(p('color')) as any) || 'chainid';

        const cc = params.get(p('cc'));
        if (cc) {
            try { state.customColors = JSON.parse(atob(cc)); } catch (e) { }
        }

        const src = params.get(p('src')) as DataSource | null;
        if (src === 'pubchem' || src === 'alphafold') {
            state.dataSource = src;
        } else {
            state.dataSource = 'pdb';
        }


        if (params.get(p('spin')) === '1') state.isSpinning = true;
        if (params.get(p('lig')) === '1') state.showLigands = true;
        if (params.get(p('surf')) === '1') state.showSurface = true;

        const cam = params.get(p('cam'));
        if (cam) {
            try { state.orientation = JSON.parse(atob(cam)); } catch (e) { }
        }

        const meas = params.get(p('meas'));
        if (meas) {
            try {
                const minimalData = JSON.parse(atob(meas));
                state.measurements = minimalData.map((m: any) => ({
                    atom1: { chain: m.a1.c, resNo: m.a1.r, atomName: m.a1.a },
                    atom2: { chain: m.a2.c, resNo: m.a2.r, atomName: m.a2.a },
                    distance: 0
                }));
            } catch (e) { }
        }

        const bg = params.get(p('bg'));
        if (bg) state.customBackgroundColor = decodeURIComponent(bg);

        const assign = params.get(p('assign'));
        if (assign) {
            try { state.assignmentPayload = JSON.parse(atob(assign)); } catch (e) { }
        }

        const story = params.get(p('story'));
        if (story) {
            try {
                const decodedStr = decodeURIComponent(escape(atob(story)));
                state.storyboardPayload = JSON.parse(decodedStr);
            } catch (e) { console.warn("Storyboard deserialization failed", e); }
        }

        return state;
    };

    if (viewMode === 'single') {
        const vp = parseParams(''); // Try legacy format
        if (vp) viewports[0] = vp;
    } else {
        // Try parsing v0 to v3
        for (let i = 0; i < 4; i++) {
            const vp = parseParams(`v${i}`);
            // If it's a valid view mode, we might want to respect the slot even if empty?
            // But parseParams returns null if no PDB. 
            // Let's populate the array with what we found.
            // If explicit holes are needed, we'd need a stronger signal in URL.
            // For now, index-based mapping is crucial.
            if (vp) viewports[i] = vp;
            else viewports[i] = {}; // Empty slot
        }
    }

    // Default cleanup: ensure at least one empty object if nothing parsed
    if (viewports.length === 0) viewports.push({});

    return {
        viewMode,
        viewports
    };
};
