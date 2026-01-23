import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPluginUI } from 'molstar/lib/commonjs/mol-plugin-ui';
import { DefaultPluginUISpec } from 'molstar/lib/commonjs/mol-plugin-ui/spec';
import { PluginUIContext } from 'molstar/lib/commonjs/mol-plugin-ui/context';
import 'molstar/lib/commonjs/mol-plugin-ui/skin/light.scss';
import type { ProteinViewerRef, ProteinViewerProps } from './ProteinViewer';

export const MolStarProteinViewer = forwardRef<ProteinViewerRef, ProteinViewerProps>((props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<PluginUIContext | null>(null);

    // Initialization
    useEffect(() => {
        if (!containerRef.current || pluginRef.current) return;

        const init = async () => {
            const spec = DefaultPluginUISpec();

            // Customize Layout to fit our "Platform" approach (minimal controls, let App handle UI)
            spec.layout = {
                initial: {
                    isExpanded: false,
                    showControls: false, // We hide sidebar controls
                    controlsDisplay: 'reactive',
                    regionState: {
                        left: 'hidden',
                        top: 'hidden',
                        right: 'hidden',
                        bottom: 'hidden',
                    }
                },
            };

            // Adjust behaviors if needed (e.g. minimal interaction)
            spec.behaviors = [
                ...DefaultPluginUISpec().behaviors,
                // Add any custom behaviors here
            ];

            try {
                pluginRef.current = await createPluginUI({
                    target: containerRef.current!,
                    spec,
                    render: (component, container) => {
                        createRoot(container).render(component);
                    }
                });

                // Set initial background
                if (pluginRef.current.canvas3d) {
                    const bgColor = props.isLightMode ? 0xFFFFFF : 0x000000;
                    pluginRef.current.canvas3d.setProps({
                        renderer: { backgroundColor: bgColor as any }
                    });
                }

                // Call onStructureLoaded if we had a PDB ID initially (or wait for prop change)
                if (props.pdbId) {
                    loadStructure(props.pdbId, props.dataSource || 'rcsb');
                }

            } catch (e) {
                console.error("Mol* Init Failed", e);
                props.onError?.(String(e));
            }
        };

        init();

        return () => {
            // Cleanup if necessary
            // pluginRef.current?.dispose(); // Mol* cleanup might be complex, careful here
        };
    }, []);

    // Watchers for props
    useEffect(() => {
        if (!pluginRef.current?.canvas3d) return;
        const bgColor = props.isLightMode ? 0xFFFFFF : 0x000000;
        // Mol* uses 0xRRGGBB format
        pluginRef.current.canvas3d.setProps({
            renderer: { backgroundColor: bgColor as any }
        });
    }, [props.isLightMode]);

    const loadStructure = async (id: string, source: string) => {
        if (!pluginRef.current) return;

        await pluginRef.current.clear();

        let url = '';
        let format: 'pdb' | 'mmcif' | 'bcif' = 'mmcif';
        let isBinary = false;

        if (source === 'pdb' || source === 'rcsb') {
            url = `https://files.rcsb.org/download/${id}.cif`;
        } else if (source === 'alphafold') {
            url = `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.cif`;
        } else if (source === 'pubchem') {
            // For simplicity, using one format, maybe SDF or CIF if available
            url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${id}/record/SDF/?record_type=3d`;
            // Mol* handles SDF via specific trajectory parsers, might need more logic
            // For phase 1, let's stick to PDB/MMCIF
        }

        try {
            const data = await pluginRef.current.builders.data.download({ url, isBinary }, { state: { isGhost: true } });
            const trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, format);
            await pluginRef.current.builders.structure.hierarchy.applyPreset(trajectory, 'default');

            // Notify Parent
            // We need to extract stats. Mol* hierarchy access is deep.
            // props.onStructureLoaded?.({ ... }); 
        } catch (e) {
            console.error("Mol* Load Error", e);
            props.onError?.("Failed to load structure");
        }
    };

    useEffect(() => {
        if (props.pdbId && pluginRef.current) {
            loadStructure(props.pdbId, props.dataSource || 'rcsb');
        }
    }, [props.pdbId, props.dataSource]);


    // Imperative Handle (The Contract)
    useImperativeHandle(ref, () => ({
        getSnapshotBlob: async (_resolutionFactor, _transparent) => {
            if (!pluginRef.current?.canvas3d) return null;
            // Native Mol* implementation needed
            // This is a placeholder. Mol* has a helper for this.
            return new Promise(resolve => {
                // @ts-ignore - toBlob exists on HTMLCanvasElement which canvas3d wraps or provides access to
                // Typically access canvas via: plugin.canvas3d.webgl.canvas
                const canvas = pluginRef.current?.canvas3d?.webgl?.gl?.canvas;
                if (canvas instanceof HTMLCanvasElement) {
                    canvas.toBlob(resolve);
                } else {
                    resolve(null);
                }
            });
        },
        highlightResidue: (_chain, _resNo) => {
            // Mol* Interactivity Logic
        },
        focusLigands: () => {
            // Mol* Camera Logic
        },
        clearHighlight: () => {
            // Mol* Clear Logic
        },
        getAtomCoordinates: async () => {
            return [];
        },
        getTorsionData: async () => {
            return [];
        },
        getAtomPosition: () => null,
        getAtomPositionByIndex: () => null,
        addResidue: async () => null,
        render: () => { }, // NGL specific?
        // Studio Features
        recordTurntable: async (_duration) => {
            return new Blob([]);
        },
        recordMovie: async (_duration, _options) => {
            return new Blob([]);
        },
        resetCamera: () => {
            pluginRef.current?.canvas3d?.requestCameraReset();
        },
        clearMeasurements: () => { },
        getMeasurements: () => [],
        removeMeasurement: () => { },
        addMeasurement: () => { },
        visualizeContact: () => { },
        getOrientation: () => null,
        setOrientation: () => { },
        getPdbBlob: () => null,

        // Missing Methods
        restoreMeasurements: () => { },
        captureImage: async () => { }, // Returns Promise<void> implicitly, or just return undefined
        highlightRegion: () => { },
        getLigandInteractions: async () => [],
        setOpacity: () => { },
        setVisibility: () => { },
        setZoom: () => { },
        focusResidue: (_chain, _resNo) => { },
        highlightAtom: (_atomIndex) => { },
        container: containerRef.current
    }));

    return (
        <div ref={containerRef} className={`w-full h-full relative ${props.className || ''}`} />
    );
});

MolStarProteinViewer.displayName = 'MolStarProteinViewer';
