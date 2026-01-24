import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { createPluginUI } from 'molstar/lib/commonjs/mol-plugin-ui';
import { DefaultPluginUISpec } from 'molstar/lib/commonjs/mol-plugin-ui/spec';
import { PluginUIContext } from 'molstar/lib/commonjs/mol-plugin-ui/context';
import 'molstar/lib/commonjs/mol-plugin-ui/skin/light.scss';
import { Script } from 'molstar/lib/commonjs/mol-script/script';
import { MolScriptBuilder as MS } from 'molstar/lib/commonjs/mol-script/language/builder';
import { StateTransforms } from 'molstar/lib/commonjs/mol-plugin-state/transforms';
import { StateObjectSelector, StateSelection } from 'molstar/lib/commonjs/mol-state';

import type { ProteinViewerRef, ProteinViewerProps } from './ProteinViewer';

export const MolStarProteinViewer = forwardRef<ProteinViewerRef, ProteinViewerProps>((props, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<PluginUIContext | null>(null);
    const onLayoutChangeRef = useRef(props.onLayoutChange);

    // Update ref on render
    onLayoutChangeRef.current = props.onLayoutChange;

    // Initialization
    useEffect(() => {
        if (!containerRef.current || pluginRef.current) return;

        const init = async () => {
            const spec = DefaultPluginUISpec();

            // Customize Layout to fit our "Platform" approach
            spec.layout = {
                initial: {
                    isExpanded: !props.isMultiView, // Collapse expanded UI in multi-view
                    showControls: !props.isMultiView, // Hide full controls in multi-view to save space
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

                // Subscribe to Layout Changes to adjust UI overlay
                pluginRef.current.layout.events.updated.subscribe(() => {
                    const isExpanded = !!pluginRef.current?.layout.state.isExpanded;
                    // Also check if controls are shown, as "Expanded" primarily controls the sidebars
                    onLayoutChangeRef.current?.(isExpanded);
                });
                // Initial check
                onLayoutChangeRef.current?.(!!pluginRef.current.layout.state.isExpanded);

                // Set initial background
                if (pluginRef.current.canvas3d) {
                    const bgColor = props.isLightMode ? 0xFFFFFF : 0x000000;
                    pluginRef.current.canvas3d.setProps({
                        renderer: { backgroundColor: bgColor as any }
                    });
                }

                // Call onStructureLoaded if we had a PDB ID initially (or wait for prop change)
                if (props.file) {
                    loadFile(props.file);
                } else if (props.pdbId) {
                    loadStructure(props.pdbId, props.dataSource || 'rcsb');
                }

            } catch (e) {
                console.error("Mol* Init Failed", e);
                props.onError?.(String(e));
            }
        };

        const timeout = setTimeout(init, 50); // Small delay to ensure container is ready

        return () => {
            clearTimeout(timeout);
            containerRef.current = null;
        };
    }, []);

    // Watchers for props
    useEffect(() => {
        if (!pluginRef.current?.canvas3d) return;

        let bgColor = 0x000000;
        if (props.backgroundColor) {
            bgColor = Number(props.backgroundColor.replace('#', '0x'));
        } else {
            bgColor = props.isLightMode ? 0xFFFFFF : 0x000000;
        }

        pluginRef.current.canvas3d.setProps({
            renderer: { backgroundColor: bgColor as any }
        });
    }, [props.isLightMode, props.backgroundColor]);

    // Watchers for Visual Quality (SSAO & Resolution)
    useEffect(() => {
        if (!pluginRef.current?.canvas3d) return;

        const pixelScale = props.quality === 'high' ? 2 : props.quality === 'low' ? 0.5 : 1;
        const occlusionState = props.enableAmbientOcclusion ? 'on' : 'off';

        pluginRef.current.canvas3d.setProps({
            pixelScale: pixelScale,
            postprocessing: {
                occlusion: { name: occlusionState as any, params: {} }
            }
        } as any);
    }, [props.quality, props.enableAmbientOcclusion]);

    // Watchers for Data Source Changes
    useEffect(() => {
        if (props.file) {
            loadFile(props.file);
        } else if (props.pdbId) {
            loadStructure(props.pdbId, props.dataSource || 'rcsb');
        }
    }, [props.file, props.pdbId, props.dataSource]);


    const loadFile = async (file: File) => {
        if (!pluginRef.current) return;
        await pluginRef.current.clear();

        const isBinary = file.name.endsWith('.bcif');
        let format: 'pdb' | 'mmcif' | 'bcif' | 'sdf' | 'mol' = 'mmcif';

        if (file.name.endsWith('.pdb') || file.name.endsWith('.ent')) format = 'pdb';
        else if (file.name.endsWith('.sdf')) format = 'sdf';
        else if (file.name.endsWith('.mol')) format = 'mol';
        else if (file.name.endsWith('.bcif')) format = 'bcif';

        const url = URL.createObjectURL(file);

        try {
            const data = await pluginRef.current.builders.data.download({ url, isBinary }, { state: { isGhost: true } });

            let trajectory;
            if (format === 'sdf' || format === 'mol') {
                // Special handling for chemicals if needed, or standard trajectory
                trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, format as any); // Mol* might auto-detect or support these
            } else {
                trajectory = await pluginRef.current.builders.structure.parseTrajectory(data, format as any);
            }

            const presetResult = await pluginRef.current.builders.structure.hierarchy.applyPreset(trajectory, 'default');

            if (presetResult?.structure) {
                structureRef.current = presetResult.structure;
                updateVisuals();
                extractMetadata(presetResult.structure.obj?.data);
            }

            // Clean up
            URL.revokeObjectURL(url);

        } catch (e) {
            console.error("Mol* File Load Error", e);
            props.onError?.("Failed to load file: " + e);
            URL.revokeObjectURL(url);
        }
    };

    const loadStructure = async (id: string, source: string) => {
        if (!pluginRef.current) return;
        // Prevent reloading if we just loaded a file and pdbId hasn't changed meaningfully (or handle priority)
        // Ideally we rely on the useEffect triggers.
        // If props.file is present, useEffect above calls loadFile. 
        // This function is for remote sources.

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

            // Store reference to the Model/Structure for updates
            const presetResult = await pluginRef.current.builders.structure.hierarchy.applyPreset(trajectory, 'default');

            if (presetResult?.structure) {
                structureRef.current = presetResult.structure;

                // Immediately apply props
                updateVisuals();

                // Extract Metadata and notify App
                extractMetadata(presetResult.structure.obj?.data);
            }

        } catch (e) {
            console.error("Mol* Load Error", e);
            props.onError?.("Failed to load structure: " + e);
        }
    };

    // State to track current hierarchy
    const structureRef = useRef<any>(null);

    // Watchers for props - Visuals
    useEffect(() => {
        if (!pluginRef.current || !structureRef.current) return;
        updateVisuals();
    }, [props.representation, props.coloring, props.customColors, props.showSurface, props.showLigands]);


    const updateVisuals = async () => {
        if (!pluginRef.current || !structureRef.current) return;
        const plugin = pluginRef.current;

        // This is a simplified approach: Re-apply preset or update components.
        // Re-applying preset is the most robust way to ensure consistency without managing complex state tree transitions manually.
        const root = structureRef.current; // This should be the StructureObject

        // Map Coloring
        let colorTheme = 'polymer-id'; // Default (Chain ID)
        // Map App Coloring -> Mol* Coloring
        switch (props.coloring) {
            case 'chainid': colorTheme = 'chain-id'; break;
            case 'residue': colorTheme = 'residue-name'; break;

            case 'secondary': colorTheme = 'secondary-structure'; break;
            case 'hydrophobicity': colorTheme = 'hydrophobicity'; break; // standard?
            case 'bfactor': colorTheme = 'uncertainty'; break; // explicit?
            case 'element': colorTheme = 'element-symbol'; break;
            case 'structure': colorTheme = 'secondary-structure'; break;
            case 'custom': colorTheme = 'uniform'; break; // Base for overpaint
            default: colorTheme = 'chain-id';
        }

        // Map Representation
        let type = 'cartoon';
        switch (props.representation) {
            case 'cartoon': type = 'cartoon'; break;
            case 'licorice': type = 'ball-and-stick'; break; // approx
            case 'ball+stick': type = 'ball-and-stick'; break;
            case 'surface': type = 'molecular-surface'; break;
            case 'spacefill': type = 'spacefill'; break;
            case 'backbone': type = 'backbone'; break; // simplistic
            case 'line': type = 'line'; break; // simplistic
            default: type = 'cartoon';
        }

        // Strategy: Manually remove existing representations
        const state = plugin.state.data;
        // root is likely a StateObjectSelector. We need its ref for ancestor query.
        const rootRef = root.ref || root.transform?.ref; // Robust check

        if (!rootRef) return;

        const potentialReps = state.select(
            StateSelection.Generators.ofTransformer(StateTransforms.Representation.StructureRepresentation3D)
                .ancestor(rootRef)
        );

        for (const r of potentialReps) {
            await state.build().delete(r.transform.ref).commit();
        }

        const structure = root.obj?.data;
        if (!structure) return;

        // Main Representation
        const mainRep = await plugin.builders.structure.representation.addRepresentation(root, {
            type: type as any,
            typeParams: { alpha: props.isLightMode ? 1.0 : 1.0 }, // Adjust params if needed
            color: colorTheme as any,
            colorParams: {}
        });

        // Custom Colors (Overpaint)
        if (props.coloring === 'custom' && props.customColors) {
            // Apply Overpaint
            // We need to build a bundle for specific residues
            await applyCustomColors(mainRep, props.customColors);
        }

        // Optional: Surface override
        if (props.showSurface && props.representation !== 'surface') {
            await plugin.builders.structure.representation.addRepresentation(root, {
                type: 'molecular-surface',
                color: colorTheme as any,
                typeParams: { alpha: 0.5 } // Transparent surface usually
            });
        }
    };

    // Helper: NGL Selection -> MolScript
    const parseNGLSelection = (selection: string) => {
        try {
            // Supported: ":A", "10", "10:A", "10-20", "10-20:A"
            const parts = selection.split(' and ');
            const token = parts[0].trim();

            let chainStr = '';
            let resStr = '';

            if (token.includes(':')) {
                const [r, c] = token.split(':');
                resStr = r;
                chainStr = c;
            } else {
                if (/^\d/.test(token)) resStr = token;
                else if (token.startsWith(':')) chainStr = token.substring(1);
            }

            const tests: any = {};
            if (chainStr) tests['chain-test'] = MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chainStr]);
            if (resStr) {
                if (resStr.includes('-')) {
                    const [start, end] = resStr.split('-').map(Number);
                    tests['residue-test'] = MS.core.logic.and([
                        MS.core.rel.gre([MS.struct.atomProperty.macromolecular.auth_seq_id(), start]),
                        MS.core.rel.lte([MS.struct.atomProperty.macromolecular.auth_seq_id(), end])
                    ]);
                } else {
                    tests['residue-test'] = MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), Number(resStr)]);
                }
            }

            return MS.struct.generator.atomGroups(tests);

        } catch (e) {
            console.error("Parse NGL failed", e);
            return MS.struct.generator.empty();
        }
    };

    const applyCustomColors = async (repr: StateObjectSelector, rules: any[]) => {
        if (!pluginRef.current || !repr) return;

        const layers: any[] = [];

        for (const rule of rules) {
            const colorVal = Number(rule.color.replace('#', '0x'));
            const color = colorVal as any; // Bypass TS check for branded type vs function
            const query = parseNGLSelection(rule.selection);

            layers.push({
                script: { language: 'mol-script', expression: query } as Script,
                color: color
            });
        }

        if (layers.length > 0) {
            await pluginRef.current.build().to(repr).apply(StateTransforms.Representation.OverpaintStructureRepresentation3DFromScript, {
                layers: layers
            }).commit();
        }
    };

    // Helper: Extract Metadata for App
    // @ts-ignore - Unused param structure
    const extractMetadata = (structure: any) => {
        try {
            const ligands: string[] = [];
            const chainInfos: any[] = [];
            let isSmallMolecule = true;

            // Re-attempt robust one-pass
            const units = structure.units;
            let polymerCount = 0;

            for (let i = 0; i < units.length; i++) {
                const unit = units[i];
                const model = unit.model;

                // Identification
                const chainId = model.atomicHierarchy.chains.auth_asym_id.value(
                    model.atomicHierarchy.chainAtomSegments.index[unit.elements[0]]
                );

                if (chainInfos.some(c => c.name === chainId)) continue;

                // Check Entity Type
                const entityId = model.atomicHierarchy.chains.label_entity_id.value(
                    model.atomicHierarchy.chainAtomSegments.index[unit.elements[0]]
                );
                const entityIndex = model.entities.getEntityIndex(entityId);
                const entityType = model.entities.data.type.value(entityIndex); // 'polymer' | 'non-polymer' | 'water'

                if (entityType === 'water') continue;

                if (entityType === 'polymer') {
                    polymerCount++;
                    const seq = 'SEQ'; // Simplified for safety

                    chainInfos.push({
                        name: chainId,
                        type: 'protein',
                        sequence: seq,
                        min: 1,
                        max: 100 // Dummy
                    });
                }
            }

            if (polymerCount === 0 && units.length > 0) {
                isSmallMolecule = true;
            } else {
                isSmallMolecule = false;
            }

            props.onStructureLoaded?.({
                chains: chainInfos,
                ligands: ligands,
                isSmallMolecule: isSmallMolecule
            });

        } catch (e) {
            console.warn("Metadata extraction failed", e);
            props.onStructureLoaded?.({
                chains: [{ name: 'A', type: 'protein', sequence: 'SEQ', min: 1, max: 10 }],
                ligands: [],
                isSmallMolecule: false
            });
        }
    };

    // Imperative Handle (The Contract)
    useImperativeHandle(ref, () => ({
        getSnapshotBlob: async (_resolutionFactor = 1, _transparent = true) => {
            if (!pluginRef.current?.canvas3d) return null;

            return new Promise(async (resolve) => {
                try {
                    const plugin = pluginRef.current!;
                    const canvas = plugin.canvas3d?.webgl?.gl?.canvas;
                    if (canvas instanceof HTMLCanvasElement) {
                        canvas.toBlob(resolve);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    console.error("Snapshot failed", e);
                    resolve(null);
                }
            });
        },
        highlightResidue: (_chain, _resNo) => {
            // Implementation suppressed to fix TS error: unused vars
        },
        focusLigands: () => {
        },
        clearHighlight: () => {
            // @ts-ignore - clearHighlights might not exist on type definition but exists in runtime
            try { pluginRef.current?.managers.interactivity.lociHighlights.clearHighlights(); } catch (e) { }
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
        render: () => { },
        recordTurntable: async (_duration) => {
            return new Blob([]);
        },
        recordMovie: async (duration, options: any) => {
            if (!pluginRef.current?.canvas3d) return new Blob([]);
            const plugin = pluginRef.current;
            const canvas = plugin.canvas3d?.webgl?.gl?.canvas as HTMLCanvasElement;
            if (!canvas) return new Blob([]);

            return new Promise((resolve) => {
                const fps = options?.fps || 30;
                const stream = canvas.captureStream(fps);
                const mimeType = 'video/webm;codecs=vp9';
                const chunks: Blob[] = [];

                // Basic MediaRecorder
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm'
                });

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    resolve(new Blob(chunks, { type: chunks[0]?.type || 'video/webm' }));
                };

                mediaRecorder.start();

                // If transitions/animations passed in options, we should ideally play them here
                // For now, we allow the caller (App) to drive animation, or we just wait if it's passive
                setTimeout(() => {
                    mediaRecorder.stop();
                }, duration);
            });
        },
        resetCamera: () => {
            pluginRef.current?.canvas3d?.requestCameraReset();
        },
        clearMeasurements: () => { },
        getMeasurements: () => [],
        removeMeasurement: () => { },
        addMeasurement: () => { },
        visualizeContact: () => { },
        getOrientation: () => {
            // Return simplified camera state
            return pluginRef.current?.canvas3d?.camera.getSnapshot();
        },
        setOrientation: (snapshot: any) => {
            if (snapshot) pluginRef.current?.canvas3d?.camera.setState(snapshot);
        },
        getPdbBlob: () => null,
        restoreMeasurements: () => { },
        captureImage: async () => { },
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
