import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import clsx from 'clsx';
import { Skeleton } from './Skeleton';
import type {
    ChainInfo,
    ColorPalette,
    RepresentationType,
    ColoringType,
    ResidueInfo,
    Measurement,
    StructureInfo,
    MeasurementTextColor,
    AtomInfo,
    CustomColorRule,
    SuperposedStructure,
    Annotation
} from '../types';
import { type DataSource, getStructureUrl } from '../utils/pdbUtils';


declare global {
    interface Window {
        NGL: any;
    }
}


export interface MeasurementData {
    atom1: { chain: string, resNo: number, atomName: string, x: number, y: number, z: number, index?: number };
    atom2: { chain: string, resNo: number, atomName: string, x: number, y: number, z: number, index?: number };
    distance: number;
    shapeId: string;
}

export interface ProteinViewerProps {
    pdbId: string;
    dataSource?: DataSource; // Added source
    file?: File;
    fileType?: 'pdb' | 'mmcif' | 'sdf' | 'mol' | 'mol2';

    // Appearance
    isLightMode: boolean;
    isSpinning: boolean;
    isRocking?: boolean;
    theme?: 'light' | 'dark';
    backgroundColor?: string;
    representation: RepresentationType;
    showSurface: boolean;
    showLigands?: boolean;  // Optional, defaults to true
    showIons?: boolean;     // New prop
    coloring: ColoringType;
    palette: ColorPalette;
    customColors?: CustomColorRule[];
    measurementTextColor?: MeasurementTextColor; // Added prop
    overlays?: SuperposedStructure[];

    // Quality
    quality?: 'low' | 'medium' | 'high';
    enableAmbientOcclusion?: boolean;
    initialOrientation?: any; // New prop for setting start view



    // Callbacks
    onStructureLoaded?: (info: StructureInfo) => void;
    onError?: (error: string) => void;
    loading?: boolean;
    setLoading?: (loading: boolean) => void;
    error?: string | null;
    setError?: (error: string | null) => void;

    onAtomClick?: (info: ResidueInfo | null) => void;
    onHover?: (info: ResidueInfo | null) => void;

    // Measurement
    isMeasurementMode?: boolean;
    measurements?: Measurement[];
    onAddMeasurement?: (m: Measurement) => void;


    // Actions
    resetCamera?: number; // Increment to trigger reset
    className?: string;
    disableScroll?: boolean; // New: Scroll Protection

    onCameraChange?: (orientation: any) => void;

    // Interaction
    // Interaction
    isInteractive?: boolean;

    // Annotations
    annotations?: Annotation[];
    onAddAnnotation?: (annotation: Annotation) => void;

    // Remote Interaction
    remoteHoveredResidue?: ResidueInfo | null;

    // Layout
    isMultiView?: boolean;
    onLayoutChange?: (isExpanded: boolean) => void;
}

export interface ProteinViewerRef {
    getSnapshotBlob: (resolutionFactor?: number, transparent?: boolean) => Promise<Blob | null>;
    highlightResidue: (chain: string, resNo: number) => void;
    focusLigands: () => void;
    clearHighlight: () => void;

    getAtomCoordinates: () => Promise<{ x: number[], y: number[], z: number[], labels: string[], ss: string[] }[]>;
    getTorsionData: () => Promise<{ phi: number | null, psi: number | null, chain: string, resNo: number, resName: string }[]>;
    getAtomPosition: (chain: string, resNo: number, atomName?: string) => { x: number, y: number, z: number } | null;
    getAtomPositionByIndex: (atomIndex: number) => { x: number, y: number, z: number } | null;
    addResidue: (chainName: string, resType: string) => Promise<Blob | null>;
    recordTurntable: (duration?: number) => Promise<Blob>;
    recordMovie: (duration: number, options?: {
        watermark?: { text: string; show: boolean };
        overlays?: { id: string; text: string; start: number; end: number; x: number; y: number }[];
        transitions?: { start: number; end: number; type: 'fade'; duration: number }[];
    }) => Promise<Blob>; // Updated
    resetCamera: () => void;
    clearMeasurements: () => void;
    getMeasurements: () => MeasurementData[];
    restoreMeasurements: (measurements: { atom1: any, atom2: any }[]) => void; // Legacy internal
    visualizeContact: (chainA: string, resA: number, chainB: string, resB: number) => void;
    captureImage: (resolutionFactor?: number, transparent?: boolean) => Promise<void>;
    highlightRegion: (selection: string, label?: string) => void;
    getLigandInteractions: () => Promise<import('../types').LigandInteraction[]>;
    focusResidue: (chain: string, resNo: number) => void;
    highlightAtom: (serial: number) => void;
    getOrientation: () => any;
    setOrientation: (orientation: any) => void;
    getPdbBlob: () => Blob | null; // Method to extract current structure as blob
    container: HTMLDivElement | null; // Expose container for canvas access
}

export const ProteinViewer = forwardRef<ProteinViewerRef, ProteinViewerProps>(({
    pdbId,
    dataSource = 'pdb',
    file,
    representation = 'cartoon',
    coloring = 'chainid',
    customColors,
    overlays,

    palette: colorPalette = 'standard', // Rename to matches internal usage
    className,
    onStructureLoaded,
    loading: externalLoading,
    setLoading: setExternalLoading,
    error: externalError,
    setError: setExternalError,
    resetCamera,

    onAtomClick,
    backgroundColor = "black",
    showSurface = false,
    showLigands = false,
    showIons = false,
    isSpinning = false,
    isRocking = false,
    isMeasurementMode = false,
    measurements,
    onAddMeasurement,

    onHover,
    isLightMode,
    quality = 'medium',
    enableAmbientOcclusion = false,
    measurementTextColor = 'auto',
    initialOrientation,
    disableScroll = false,
    onCameraChange,
    isInteractive = true,
    annotations,
    onAddAnnotation,
    remoteHoveredResidue
}: ProteinViewerProps, ref: React.Ref<ProteinViewerRef>) => {

    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<any>(null);
    const componentRef = useRef<any>(null);
    const highlightComponentRef = useRef<any>(null);
    const isMounted = useRef(true);
    const onHoverRef = useRef(onHover);

    // Update ref when prop changes
    useEffect(() => {
        onHoverRef.current = onHover;
    }, [onHover]);

    const onCameraChangeRef = useRef(onCameraChange);
    useEffect(() => {
        onCameraChangeRef.current = onCameraChange;
    }, [onCameraChange]);

    const measurementsRef = useRef<MeasurementData[]>([]);
    const measurementRepsRef = useRef<any[]>([]); // Track NGL Representations for cleanup
    const contactLineRepRef = useRef<any>(null); // Track single contact line representation
    const regionHighlightRepRef = useRef<any>(null); // V6: Track region highlight
    const overlayComponentsRef = useRef<Map<string, any>>(new Map()); // Track overlay components
    const selectedAtomsRef = useRef<any[]>([]);

    // Helper to find atom
    const findAtom = (chain: string, resNo: number, atomName: string) => {
        if (!componentRef.current) return null;
        let found: any = null;
        // Selection string must be robust
        const selection = new window.NGL.Selection(`${resNo}:${chain} and .${atomName}`);
        if (componentRef.current && componentRef.current.structure) {
            componentRef.current.structure.eachAtom((atom: any) => {
                found = atom;
            }, selection);
        }
        return found;
    };







    const drawMeasurement = (m: MeasurementData) => {
        // Legacy internal measurement drawing - kept for compatibility if needed,
        // but we are moving to props-driven measurements.
        // Unused for now in new mode.
        console.log(m);
        const atom1 = findAtom(m.atom1.chain, m.atom1.resNo, m.atom1.atomName);
        const atom2 = findAtom(m.atom2.chain, m.atom2.resNo, m.atom2.atomName);

        if (atom1 && atom2 && stageRef.current) {
            // Use Native NGL Distance Representation (Most Robust)
            // This bypasses Shape primitive issues by using built-in measurement rendering
            // We need atom indices for this
            let idx1 = m.atom1.index;
            let idx2 = m.atom2.index;

            // Fallback for legacy data or if index is missing: careful lookups
            // Note: We avoid holding two proxies simultaneously to prevent reuse issues
            if (idx1 === undefined) {
                const a1 = findAtom(m.atom1.chain, m.atom1.resNo, m.atom1.atomName);
                if (a1) idx1 = a1.index;
            }
            if (idx2 === undefined) {
                const a2 = findAtom(m.atom2.chain, m.atom2.resNo, m.atom2.atomName);
                if (a2) idx2 = a2.index;
            }

            if (typeof idx1 === 'number' && typeof idx2 === 'number') {
                const params = {
                    labelUnit: 'angstrom',
                    labelSize: 2.0,
                    labelColor: 'white',
                    color: 'yellow',
                    atomPair: [[idx1, idx2]],
                    opacity: 1.0
                };

                try {
                    const distanceRep = componentRef.current.addRepresentation("distance", params);
                    if (distanceRep) {
                        measurementRepsRef.current.push(distanceRep);
                    }
                } catch (e) {
                    console.warn("Failed to add distance representation", e);
                }
            } else {
                console.warn("Could not find atom indices for distance rep", m);
            }
        }
    };




    const [internalLoading, setInternalLoading] = React.useState(false);
    const [internalError, setInternalError] = React.useState<string | null>(null);

    const loading = externalLoading !== undefined ? externalLoading : internalLoading;
    const setLoading = setExternalLoading || setInternalLoading;
    const error = externalError !== undefined ? externalError : internalError;
    const setError = setExternalError || setInternalError;

    const performVideoRecord = async (
        duration: number,
        options: {
            watermark?: { text: string; show: boolean };
            overlays?: { id: string; text: string; start: number; end: number; x: number; y: number }[];
            transitions?: { start: number; end: number; type: 'fade'; duration: number }[];
        } = {}
    ): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            if (!stageRef.current || !stageRef.current.viewer) {
                reject(new Error("Viewer not initialized"));
                return;
            }
            const stage = stageRef.current;
            const canvas = containerRef.current?.querySelector('canvas');
            if (!canvas) {
                reject(new Error("No canvas found"));
                return;
            }

            // 1. Setup Composite Canvas
            const width = canvas.width;
            const height = canvas.height;
            const compositeCanvas = document.createElement('canvas');
            compositeCanvas.width = width;
            compositeCanvas.height = height;
            const compositeCtx = compositeCanvas.getContext('2d');

            if (!compositeCtx) {
                reject(new Error("Failed to create composite context"));
                return;
            }

            // 2. Setup Stream
            const stream = compositeCanvas.captureStream(30);

            // Robust MIME type detection
            const mimeTypes = [
                'video/webm;codecs=vp9',
                'video/webm;codecs=vp8',
                'video/webm',
                'video/mp4'
            ];

            let selectedMimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    selectedMimeType = type;
                    break;
                }
            }

            const recOptions: MediaRecorderOptions = {
                mimeType: selectedMimeType || 'video/webm',
                videoBitsPerSecond: 8000000
            };

            try {
                const mediaRecorder = new MediaRecorder(stream, recOptions);
                const chunks: Blob[] = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                // Store original state
                const originalSpin = stage.spinAnimation.paused;
                const oldSpeed = stage.getParameters().spinSpeed;
                const originalPixelRatio = stage.viewer.pixelRatio;

                mediaRecorder.onstop = () => {
                    // Restore state immediately
                    if (originalSpin) stage.setSpin(false);
                    stage.setParameters({ spinSpeed: oldSpeed, pixelRatio: originalPixelRatio });

                    const blob = new Blob(chunks, { type: selectedMimeType || 'video/webm' });
                    resolve(blob);
                };

                mediaRecorder.onerror = (e: any) => {
                    console.error("MediaRecorder Error:", e);
                    if (originalSpin) stage.setSpin(false);
                    stage.setParameters({ spinSpeed: oldSpeed, pixelRatio: originalPixelRatio });
                    reject(new Error(e.error?.message || "MediaRecorder error"));
                };

                // 3. Start Recording
                mediaRecorder.start();

                // 4. Animation Loop
                const startTime = performance.now();
                const defaultSpeed = 0.01;
                const targetSpeed = defaultSpeed * (4000 / duration);

                // Boost Quality
                stage.setParameters({ spinSpeed: targetSpeed, pixelRatio: 3 });
                stage.setSpin(true);

                const animate = () => {
                    const now = performance.now();
                    const elapsed = now - startTime;

                    if (elapsed >= duration) {
                        mediaRecorder.stop();
                        return;
                    }

                    // Render WebGL
                    stage.viewer.requestRender();

                    // Composite Step
                    // Draw WebGL Canvas onto Composite
                    compositeCtx.drawImage(canvas, 0, 0);

                    // 1. Watermark
                    if (options.watermark?.show && options.watermark.text) {
                        const fontSize = Math.max(20, Math.floor(height * 0.03));
                        compositeCtx.font = `700 ${fontSize}px "Inter", sans-serif`;
                        compositeCtx.textAlign = 'right';
                        compositeCtx.textBaseline = 'bottom';
                        compositeCtx.shadowColor = 'rgba(0,0,0,0.6)';
                        compositeCtx.shadowBlur = 4;
                        compositeCtx.shadowOffsetX = 1;
                        compositeCtx.shadowOffsetY = 1;
                        compositeCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        const margin = Math.floor(width * 0.02);
                        compositeCtx.fillText(options.watermark.text, width - margin, height - margin);
                    }

                    // 2. Text Overlays
                    if (options.overlays) {
                        options.overlays.forEach(overlay => {
                            // Note: 'start' & 'end' in overlay here should be relative to clip time 0-duration
                            // Or we map them before passing. Let's assume passed relative to 0.
                            if (elapsed >= overlay.start && elapsed <= overlay.end) {
                                const fontSize = Math.max(24, Math.floor(height * 0.05));
                                compositeCtx.font = `800 ${fontSize}px "Inter", sans-serif`;
                                compositeCtx.textAlign = 'center';
                                compositeCtx.textBaseline = 'middle';
                                compositeCtx.fillStyle = 'white';
                                compositeCtx.shadowColor = 'black';
                                compositeCtx.shadowBlur = 6;
                                compositeCtx.fillText(overlay.text, width * overlay.x, height * overlay.y);
                            }
                        });
                    }

                    // 3. Transitions (Fade In/Out)
                    // Currently handling simple Fade In at start and Fade Out at end relative to clip
                    // passed via options.transitions = [{start: 0, end: 1000, type: 'fade', duration: 1000}]
                    // Wait, logic: Fade In means opacity 1->0 for black overlay.
                    if (options.transitions) {
                        options.transitions.forEach(t => {
                            let opacity = 0;
                            // If t.start is 0, it's a Fade In
                            if (t.start === 0 && elapsed < t.duration) {
                                opacity = 1 - (elapsed / t.duration);
                            }
                            // If t.end is end, it's a Fade Out
                            // Not implemented yet fully to match segments logic, but support generic overlay

                            if (opacity > 0) {
                                compositeCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                                compositeCtx.fillRect(0, 0, width, height);
                            }
                        });
                    }

                    requestAnimationFrame(animate);
                };

                requestAnimationFrame(animate);

            } catch (e: any) {
                reject(e);
            }
        });
    };

    useImperativeHandle(ref, () => ({
        recordMovie: performVideoRecord, // Exposed
        highlightRegion: (selection: string, _label?: string) => {
            if (!componentRef.current) return;
            const component = componentRef.current;

            // 1. Remove Previous Highlight
            if (regionHighlightRepRef.current) {
                try {
                    component.removeRepresentation(regionHighlightRepRef.current);
                    regionHighlightRepRef.current = null;
                } catch (e) { }
            }

            if (!selection) return;

            // 2. Add New Highlight (Ball & Stick)
            try {
                const rep = component.addRepresentation('ball+stick', {
                    sele: selection,
                    color: 'magenta',
                    radius: 0.3,
                    name: 'region-highlight'
                });
                regionHighlightRepRef.current = rep;

                // 3. Focus View
                component.autoView(selection, 1000);
            } catch (e) {
                console.warn("Failed to highlight region:", selection, e);
            }
        },
        focusResidue: (chain: string, resNo: number) => {
            if (!componentRef.current) return;
            const selection = `:${chain} and ${resNo}`;

            // 1. Remove previous click-highlight if any
            // We need a way to track the specific representation added by this click action.
            // Since we don't have a dedicated state for "click highlight rep" in the ref easily accessible here 
            // without refactoring the whole component state, we can use a "name" for the representation 
            // and remove it by name if NGL supports it, or just manage it if we add a ref for it.
            // For now, let's try to add a uniquely named representation or just use the highlight mechanism.

            // Actually, let's use a simpler approach: Add a new Ball+Stick representation for just this residue.
            // We should ideally track it to remove it later when another residue is clicked.
            // Let's assume we want "only one focused residue at a time".

            // Remove ANY existing 'user-focus' representations
            componentRef.current.stage.getRepresentationsByName('user-focus').dispose();

            // 2. Add new Ball+Stick representation
            componentRef.current.addRepresentation('ball+stick', {
                sele: selection,
                name: 'user-focus',
                colorVal: '#ff0000', // Highlight color? Or keep element colors?
                // Let's use element coloring but maybe specific scale or just default
                colorScheme: 'element',
                radiusScale: 2.0 // Make it pop
            });

            // 3. Zoom
            try {
                componentRef.current.autoView(selection, 1000);
            } catch (e) {
                console.warn("AutoView failed:", e);
            }
        },

        getSnapshotBlob: async (resolutionFactor: number = 3, transparent: boolean = true) => {
            if (!stageRef.current) return null;

            const fixPngBlob = async (blob: Blob): Promise<Blob> => {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                    let isMissingSignature = false;
                    for (let i = 0; i < pngSignature.length; i++) {
                        if (uint8Array[i] !== pngSignature[i]) {
                            isMissingSignature = true;
                            break;
                        }
                    }
                    if (isMissingSignature) {
                        const newBuffer = new Uint8Array(pngSignature.length + uint8Array.length);
                        newBuffer.set(pngSignature, 0);
                        newBuffer.set(uint8Array, pngSignature.length);
                        return new Blob([newBuffer], { type: 'image/png' });
                    }
                    return blob;
                } catch (e) {
                    return blob;
                }
            };

            return new Promise<Blob | null>(async (resolve) => {
                try {
                    const blob = await stageRef.current!.makeImage({
                        factor: resolutionFactor,
                        antialias: true,
                        trim: false,
                        transparent: transparent
                    });

                    // Fix potentially broken NGL blob
                    const fixedBlob = await fixPngBlob(blob);

                    // Add Watermark via Canvas
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(fixedBlob);
                            return;
                        }

                        // Draw Structure
                        ctx.drawImage(img, 0, 0);

                        // Draw Watermark
                        // 3% of height or max 40px, min 20px
                        const fontSize = Math.max(20, Math.min(40, Math.floor(img.height * 0.025)));
                        ctx.font = `700 ${fontSize}px "Inter", sans-serif`; // Use project font
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'bottom';

                        // Drop Shadow for legibility on any background
                        ctx.shadowColor = 'rgba(0,0,0,0.6)';
                        ctx.shadowBlur = 4;
                        ctx.shadowOffsetX = 1;
                        ctx.shadowOffsetY = 1;

                        // Add "QuercusViewer" Logo text
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

                        const margin = Math.floor(img.width * 0.02);
                        ctx.fillText("Powered by QuercusViewer", img.width - margin, img.height - margin);

                        // Convert back to blob
                        canvas.toBlob((finalBlob) => {
                            URL.revokeObjectURL(img.src); // Cleanup
                            resolve(finalBlob || fixedBlob);
                        }, 'image/png');
                    };

                    img.onerror = (e) => {
                        console.error("Watermark generation failed", e);
                        resolve(fixedBlob);
                    };

                    img.src = URL.createObjectURL(fixedBlob);

                } catch (e) {
                    console.error("Snapshot generation failed", e);
                    resolve(null);
                }
            });
        },


        getAtomPosition: (chain: string, resNo: number, atomName: string = 'CA') => {
            // Helper to get 3D coordinates for a residue
            if (!componentRef.current) return null;
            let position: { x: number, y: number, z: number } | null = null;

            componentRef.current.structure.eachResidue((res: any) => {
                if (res.chain.name === chain && res.resno === resNo) {
                    const atom = res.getAtomByName(atomName) || res.getAtomByName('C3\'') || res.getAtomByName('P') || res.getAtomByIndex(0);
                    if (atom) {
                        position = { x: atom.x, y: atom.y, z: atom.z };
                    }
                }
            });
            return position;
        },
        getAtomPositionByIndex: (atomIndex: number) => {
            if (!componentRef.current) return null;
            try {
                const proxy = componentRef.current.structure.getAtomProxy(atomIndex);
                if (proxy) {
                    return { x: proxy.x, y: proxy.y, z: proxy.z };
                }
            } catch (e) { console.error("Error getting atom by index", e); }
            return null;
        },
        captureImage: async (resolutionFactor: number = 3, transparent: boolean = false) => {
            const fixPngBlob = async (blob: Blob): Promise<Blob> => {
                try {
                    const arrayBuffer = await blob.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);

                    // Standard PNG Signature
                    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];

                    // Check if signature is missing
                    let isMissingSignature = false;
                    for (let i = 0; i < pngSignature.length; i++) {
                        if (uint8Array[i] !== pngSignature[i]) {
                            isMissingSignature = true;
                            break;
                        }
                    }

                    if (isMissingSignature) {
                        console.warn("Detected missing PNG signature. Repairing file...");
                        const newBuffer = new Uint8Array(pngSignature.length + uint8Array.length);
                        newBuffer.set(pngSignature, 0);
                        newBuffer.set(uint8Array, pngSignature.length);
                        return new Blob([newBuffer], { type: 'image/png' });
                    }

                    return blob;
                } catch (e) {
                    console.error("Error checking PNG signature:", e);
                    return blob;
                }
            };

            const downloadBlob = async (blob: Blob, suffix: string = '') => {
                const fixedBlob = await fixPngBlob(blob);
                const url = URL.createObjectURL(fixedBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `snapshot-${pdbId || 'structure'}${suffix}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };

            if (stageRef.current) {
                // High Quality Export with custom parameters
                stageRef.current.makeImage({
                    factor: resolutionFactor,
                    type: 'png',
                    antialias: true,
                    trim: false,
                    transparent: transparent
                }).then((blob: Blob) => {
                    downloadBlob(blob);
                }).catch((err: any) => {
                    console.warn("High-res export failed, trying fallback...", err);
                    // Fallback to standard resolution if custom fails
                    stageRef.current.makeImage({
                        factor: 1,
                        type: 'png',
                        antialias: true,
                        trim: false,
                        transparent: transparent
                    }).then((blob: Blob) => {
                        downloadBlob(blob, '-fallback');
                    }).catch((err2: any) => {
                        console.error("Export definitely failed:", err2);
                        setError("Failed to export image.");
                    });
                });
            }
        },
        highlightResidue: (chain: string, resNo: number) => {
            if (!componentRef.current || !stageRef.current) return;
            const component = componentRef.current;

            try {
                if (highlightComponentRef.current) {
                    component.removeRepresentation(highlightComponentRef.current);
                    highlightComponentRef.current = null;
                }

                if (!chain || resNo === undefined) return;

                const selection = `:${chain} and ${resNo}`;
                console.log(`Highlighting selection: ${selection}`);

                highlightComponentRef.current = component.addRepresentation('ball+stick', {
                    sele: selection,
                    color: 'element',
                    radius: 0.3
                });

                const duration = 1000;
                component.autoView(selection, duration);

            } catch (e) {
                console.warn("Highlight residue failed:", e);
            }
        },
        highlightAtom: (serial: number) => {
            if (!componentRef.current) return;
            const component = componentRef.current;
            try {
                if (highlightComponentRef.current) {
                    component.removeRepresentation(highlightComponentRef.current);
                    highlightComponentRef.current = null;
                }
                const selection = `@${serial}`;
                console.log(`Highlighting atom: ${selection}`);

                highlightComponentRef.current = component.addRepresentation('spacefill', {
                    sele: selection,
                    color: '#FFD700', // Gold
                    radius: 0.5
                });

                // component.autoView(selection, 1000);
                // Manual Zoom to avoid being too close (inside the atom)
                let atomCenter: any = null;
                component.structure.eachAtom((a: any) => {
                    atomCenter = new window.NGL.Vector3(a.x, a.y, a.z);
                }, new window.NGL.Selection(selection));

                if (atomCenter && stageRef.current) {
                    // Zoom distance -20 ensuring we see the atom clearly but not too close
                    stageRef.current.animationControls.zoomMove(atomCenter, -20, 1000);
                } else {
                    component.autoView(selection, 1000);
                }
            } catch (e) { console.warn("Highlight atom failed:", e); }
        },
        focusLigands: () => {
            if (!componentRef.current || !stageRef.current) return;
            const component = componentRef.current;
            try {
                // "ligand" selector usually works for hetatms not water
                const selection = "ligand and not (water or ion)";
                // Check if any atom matches
                let count = 0;
                component.structure.eachAtom(() => { count++; }, new window.NGL.Selection(selection));

                if (count > 0) {
                    console.log(`Focusing on ${count} ligand atoms`);
                    component.autoView(selection, 1000);
                } else {
                    console.log("No ligands found to focus on.");
                }
            } catch (e) { console.warn("Focus ligands failed", e); }
        },
        clearHighlight: () => {
            if (!componentRef.current) return;
            const component = componentRef.current;
            try {
                if (highlightComponentRef.current) {
                    component.removeRepresentation(highlightComponentRef.current);
                    highlightComponentRef.current = null;
                }
            } catch (e) {
                console.warn("Clear highlight failed:", e);
            }
        },
        getPdbBlob: () => {
            if (!componentRef.current || !componentRef.current.structure) return null;
            try {
                const writer = new window.NGL.PdbWriter(componentRef.current.structure);
                const pdbString = writer.getData();
                return new Blob([pdbString], { type: 'text/plain' });
            } catch (e) {
                console.error("Failed to write PDB blob:", e);
                return null;
            }
        },
        container: containerRef.current,
        getOrientation: () => {
            if (!stageRef.current || !stageRef.current.viewerControls) return null;
            const orientation = stageRef.current.viewerControls.getOrientation();
            // Ensure we return a plain array for JSON serialization
            if (orientation && orientation.elements) {
                return Array.from(orientation.elements);
            } else if (orientation && typeof orientation.length === 'number') {
                return Array.from(orientation);
            }
            return orientation;
        },
        setOrientation: (orientation: any) => {
            if (!stageRef.current || !stageRef.current.viewerControls || !orientation) return;
            try {
                // If it's a plain array, NGL should handle it
                // Mark as programmatic to avoid infinite loop with onCameraChange
                stageRef.current.isProgrammaticRotate = true;
                stageRef.current.viewerControls.orient(orientation);
                // Reset flag after a short delay or next tick
                setTimeout(() => {
                    if (stageRef.current) stageRef.current.isProgrammaticRotate = false;
                }, 50);
            } catch (e) {
                console.warn("Failed to set orientation:", e);
            }
        },
        resetCamera: () => {
            if (stageRef.current) stageRef.current.autoView();
        },

        getAtomCoordinates: async () => {
            if (!componentRef.current) return [];
            const component = componentRef.current;
            const data: { x: number[], y: number[], z: number[], labels: string[], ss: string[] }[] = [];

            // Iterate chains
            component.structure.eachChain((chain: any) => {
                const x: number[] = [];
                const y: number[] = [];
                const z: number[] = [];
                const labels: string[] = [];
                const ss: string[] = [];

                // Iterate CA atoms
                chain.eachResidue((res: any) => {
                    let atomToUse: any = null;

                    // Prioritize CA (Protein) > C3' (Nucleic) > P (Backbone fallback)
                    res.eachAtom((atom: any) => {
                        const name = atom.atomname;
                        if (name === 'CA') atomToUse = atom;
                        else if (!atomToUse && name === "C3'") atomToUse = atom;
                        else if (!atomToUse && name === 'P') atomToUse = atom;
                    });

                    if (atomToUse) {
                        x.push(atomToUse.x);
                        y.push(atomToUse.y);
                        z.push(atomToUse.z);
                        // Robust chain name
                        const cName = chain.chainname || chain.name || chain.id || "?";
                        labels.push(`${cName}:${res.resname} ${res.resno}`);

                        // Capture Secondary Structure (h=helix, s=sheet, etc.)
                        ss.push(res.sstruc || "");
                    }
                });

                if (x.length > 0) {
                    data.push({ x, y, z, labels, ss });
                }
            });

            return data;
        },
        getTorsionData: async () => {
            if (!componentRef.current) return [];
            const component = componentRef.current;
            const results: { phi: number | null, psi: number | null, chain: string, resNo: number, resName: string }[] = [];

            const Vector3 = window.NGL.Vector3;

            // Helper: Calculate Dihedral Angle (in degrees)
            const calculateDihedral = (a: any, b: any, c: any, d: any) => {
                if (!a || !b || !c || !d) return null;

                const v1 = new Vector3().subVectors(b, a);
                const v2 = new Vector3().subVectors(c, b);
                const v3 = new Vector3().subVectors(d, c);

                const n1 = new Vector3().crossVectors(v1, v2).normalize();
                const n2 = new Vector3().crossVectors(v2, v3).normalize();

                const x = n1.dot(n2);
                const y = new Vector3().crossVectors(n1, n2).dot(v2.normalize());

                return -Math.atan2(y, x) * (180 / Math.PI);
            };

            component.structure.eachChain((chain: any) => {
                const residues: any[] = [];
                chain.eachResidue((res: any) => residues.push(res));

                // Need random access for prev/next
                for (let i = 0; i < residues.length; i++) {
                    const curr = residues[i];
                    const prev = i > 0 ? residues[i - 1] : null;
                    const next = i < residues.length - 1 ? residues[i + 1] : null;

                    // Helper: Get Atom Coordinates safely
                    const getAtomPos = (r: any, name: string): any => {
                        let pos = null;
                        r.eachAtom((at: any) => {
                            if (at.atomname === name) {
                                pos = new window.NGL.Vector3(at.x, at.y, at.z);
                            }
                        });
                        return pos;
                    };

                    const vN = getAtomPos(curr, 'N');
                    const vCA = getAtomPos(curr, 'CA');
                    const vC = getAtomPos(curr, 'C');

                    let phi = null;
                    let psi = null;

                    // Calculate Phi: C(prev) - N - CA - C
                    if (prev && vN && vCA && vC) {
                        const vPrevC = getAtomPos(prev, 'C');
                        if (vPrevC) {
                            // Check connectivity distance (~1.33A) to ensure unbroken chain
                            if (vPrevC.distanceTo(vN) < 2.0) {
                                phi = calculateDihedral(vPrevC, vN, vCA, vC);
                            }
                        }
                    }

                    // Calculate Psi: N - CA - C - N(next)
                    if (next && vN && vCA && vC) {
                        const vNextN = getAtomPos(next, 'N');
                        if (vNextN) {
                            // Check connectivity
                            if (vC.distanceTo(vNextN) < 2.0) {
                                psi = calculateDihedral(vN, vCA, vC, vNextN);
                            }
                        }
                    }

                    if (phi !== null || psi !== null) {
                        results.push({
                            phi,
                            psi,
                            chain: chain.chainname,
                            resNo: curr.resno,
                            resName: curr.resname
                        });
                    }
                }
            });
            return results;
        },
        recordTurntable: async (duration: number = 4000) => {
            return performVideoRecord(duration);
        },


        addResidue: async (chainName: string, resType: string) => {
            if (!componentRef.current) return null;
            const structure = componentRef.current.structure;
            const NGL = window.NGL;
            // 1. Find the Chain
            let targetChain: any = null;
            structure.eachChain((c: any) => {
                if (c.chainname === chainName) targetChain = c;
            });

            if (!targetChain) {
                console.warn(`Chain ${chainName} not found.`);
                return null;
            }

            // 2. Find Last Valid Residue (must have Backbone Atoms)
            let maxResNo = -Infinity;
            targetChain.eachResidue((r: any) => {
                // Check for CA and C atoms to ensure it's a valid extension point
                const ca = r.getAtomByName('CA');
                const c = r.getAtomByName('C');
                if (ca && c && r.resno > maxResNo) {
                    maxResNo = r.resno;
                }
            });

            if (maxResNo === -Infinity) {
                console.warn("No valid C-terminus found.");
                return null;
            }

            // 3. Get Reference Atoms SAFELY (Re-finding the residue)
            let vCA: any = null;
            let vC: any = null;

            targetChain.eachResidue((r: any) => {
                if (r.resno === maxResNo) {
                    const atomCA = r.getAtomByName('CA');
                    const atomC = r.getAtomByName('C');
                    if (atomCA && atomC) {
                        // Clone coordinates immediately to avoid Proxy issues
                        vCA = new NGL.Vector3(atomCA.x, atomCA.y, atomCA.z);
                        vC = new NGL.Vector3(atomC.x, atomC.y, atomC.z);
                    }
                }
            });

            if (!vCA || !vC) {
                console.warn("Could not retrieve backbone atoms for last residue.");
                return null;
            }

            // 4. Calculate New Position (Simple Extension)
            // Vector: CA -> C (Using vCA/vC from above)
            const dir = new NGL.Vector3().subVectors(vC, vCA).normalize();

            // Place New N approx 1.33A away
            const newN = new NGL.Vector3().copy(vC).add(dir.clone().multiplyScalar(1.33));
            // Place New CA approx 1.45A from N (slightly angled? simplified: straight line for MVP)
            const newCA = new NGL.Vector3().copy(newN).add(dir.clone().multiplyScalar(1.45));
            // Place New C approx 1.52A from CA
            const newC = new NGL.Vector3().copy(newCA).add(dir.clone().multiplyScalar(1.52));
            // Place New O
            const orth = new NGL.Vector3(0, 1, 0); // Arbitrary up
            const newO = new NGL.Vector3().copy(newC).add(orth.multiplyScalar(1.23));

            // 5. Generate PDB Records
            // We need to fetch the existing PDB string first
            let originalPdb = '';
            try {
                // NGL writer isn't exposed easily on structure object directly in all versions, 
                // but we can try getting the blob from the component?
                // Easier: Just assume we loaded a PDB and modify the 'file' content? 
                // No, we need the *current* structure state (rotated? no, coords are static).
                // Use built-in writer:
                const writer = new NGL.PdbWriter(structure);
                originalPdb = writer.getData();
            } catch (e) {
                console.error("Failed to write PDB:", e);
                return null;
            }


            const lines = originalPdb.split('\n');
            let lastSerial = 0;
            // Scan from bottom
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].startsWith("ATOM") || lines[i].startsWith("HETATM")) {
                    const serialStr = lines[i].substring(6, 11).trim();
                    lastSerial = parseInt(serialStr) || 0;
                    break;
                }
            }

            const formatAtom = (serial: number, name: string, resName: string, chain: string, resSeq: number, x: number, y: number, z: number) => {
                const sSerial = String(serial).padStart(5);
                const sName = name.padEnd(4); // "N   "
                const sResName = resName.padStart(3);
                const sChain = chain.substring(0, 1);
                const sResSeq = String(resSeq).padStart(4);
                const sX = x.toFixed(3).padStart(8);
                const sY = y.toFixed(3).padStart(8);
                const sZ = z.toFixed(3).padStart(8);
                const element = name.substring(0, 1);
                return `ATOM  ${sSerial} ${sName} ${sResName} ${sChain}${sResSeq}    ${sX}${sY}${sZ}  1.00 20.00           ${element}`;
            };

            const nextResNo = maxResNo + 1;
            const newLines = [];

            // Add N
            lastSerial++;
            newLines.push(formatAtom(lastSerial, " N  ", resType, chainName, nextResNo, newN.x, newN.y, newN.z));
            // Add CA
            lastSerial++;
            newLines.push(formatAtom(lastSerial, " CA ", resType, chainName, nextResNo, newCA.x, newCA.y, newCA.z));
            // Add C
            lastSerial++;
            newLines.push(formatAtom(lastSerial, " C  ", resType, chainName, nextResNo, newC.x, newC.y, newC.z));
            // Add O
            lastSerial++;
            newLines.push(formatAtom(lastSerial, " O  ", resType, chainName, nextResNo, newO.x, newO.y, newO.z));

            // Append to PDB (filtering out END if present)
            const cleanPdb = originalPdb.replace(/^END\s*$/m, '');
            const finalPdb = cleanPdb.trimEnd() + '\n' + newLines.join('\n') + '\nEND';

            return new Blob([finalPdb], { type: 'text/plain' });
        },

        visualizeContact: (chainA: string, resA: number, chainB: string, resB: number) => {
            if (!componentRef.current) return;
            const comp = componentRef.current;

            // 1. Clean up previous contact line
            if (contactLineRepRef.current) {
                try {
                    comp.removeRepresentation(contactLineRepRef.current);
                } catch (e) { }
                contactLineRepRef.current = null;
            }

            // 2. Find Atoms (Prefer CA, fallback to center or first atom)
            const getSafeAtomIndex = (c: string, r: number, preferredAtom: string | null = null) => {
                let idx: number | null = null;

                // If specific atom requested (e.g. CA or CB), try that first
                if (preferredAtom && comp.structure) {
                    const sel = new window.NGL.Selection(`${r}:${c} and .${preferredAtom}`);
                    comp.structure.eachAtom((atom: any) => {
                        // Capture index immediately!
                        idx = atom.index;
                    }, sel);
                }

                if (idx !== null) return idx;

                // Fallback: Try CA (Alpha Carbon/Backbone)
                if (comp.structure) {
                    const sel = new window.NGL.Selection(`${r}:${c} and .CA`);
                    comp.structure.eachAtom((atom: any) => {
                        idx = atom.index;
                    }, sel);
                }

                if (idx !== null) return idx;

                // Fallback: First atom of residue
                if (comp.structure) {
                    const sel = new window.NGL.Selection(`${r}:${c}`);
                    comp.structure.eachAtom((atom: any) => {
                        if (idx === null) idx = atom.index;
                    }, sel);
                }

                return idx;
            };

            // Use 'CA' (Alpha Carbon) to match the Contact Map data generation (getAtomCoordinates uses CA)
            // and the visual backbone (Cartoon/Ribbon).
            const idx1 = getSafeAtomIndex(chainA, resA, 'CA');
            const idx2 = getSafeAtomIndex(chainB, resB, 'CA');

            if (idx1 !== null && idx2 !== null) {
                try {
                    const params = {
                        labelVisible: false,
                        color: '#d946ef', // Magenta-500 (High visibility)
                        atomPair: [[idx1, idx2]],
                        opacity: 1.0,
                        linewidth: 5.0
                    };
                    const rep = comp.addRepresentation("distance", params);
                    contactLineRepRef.current = rep;
                } catch (e) {
                    console.warn("Failed to visual contact", e);
                }
            }
        },

        getLigandInteractions: async () => {
            if (!componentRef.current) return [];
            const component = componentRef.current;
            const interactions: import('../types').LigandInteraction[] = [];

            try {
                // 1. Identify Ligands via Residue Scan
                const ligandIndices = new Set<number>();
                const ligandMetadata = new Map<number, { resname: string, chainname: string, resno: number }>();

                // Sequential Numbering Logic
                const residueSeqMap = new Map<string, number>(); // Key: "Chain:ResNo" -> SeqIdx
                const chainCounters = new Map<string, number>();

                component.structure.eachResidue((r: any) => {
                    const name = r.resname.trim().toUpperCase();

                    // Track sequential index for proteins
                    if (r.isProtein()) {
                        const cName = r.chainname;
                        const currentCount = chainCounters.get(cName) || 0;
                        const newCount = currentCount + 1;
                        chainCounters.set(cName, newCount);
                        residueSeqMap.set(`${cName}:${r.resno}`, newCount);
                    }

                    // Log everything for first few residues to sanity check
                    if (r.index < 5 || name === 'HEM' || name === 'ZN') {
                        console.log(`[LigandDebug] Inspect: ${name} (idx: ${r.index}) IsProtein: ${r.isProtein()} IsWater: ${r.isWater()} IsNucleic: ${r.isNucleic()}`);
                    }

                    // Check standard flags
                    if (r.isWater()) return;
                    if (r.isProtein()) return;
                    if (r.isNucleic()) return;

                    if (['HOH', 'WAT', 'DOD', 'SOL', 'TIP3', 'TIP4'].includes(name)) return;

                    // It's a valid ligand/ion
                    ligandIndices.add(r.index);
                    ligandMetadata.set(r.index, { resname: name, chainname: r.chainname, resno: r.resno });
                    console.log(`[LigandDebug] ACCEPTED: ${name} (idx: ${r.index})`);
                });

                console.log(`[LigandDebug] Total identified ligand residues: ${ligandIndices.size}`);

                if (ligandIndices.size === 0) {
                    console.warn("[LigandDebug] No ligands passed filtering!");
                    return [];
                }

                // 2. Collect Atoms
                const ligandAtomsMap = new Map<number, { x: number, y: number, z: number }[]>();
                const proteinAtoms: { x: number, y: number, z: number, chain: string, resno: number, resname: string, seqIdx?: number }[] = [];

                let totalLigandAtoms = 0;
                let totalProteinAtoms = 0;

                component.structure.eachAtom((a: any) => {
                    if (ligandIndices.has(a.residueIndex)) {
                        // Ligand Atom
                        if (!ligandAtomsMap.has(a.residueIndex)) {
                            ligandAtomsMap.set(a.residueIndex, []);
                        }
                        ligandAtomsMap.get(a.residueIndex)?.push({ x: a.x, y: a.y, z: a.z });
                        totalLigandAtoms++;
                    } else if (a.residue.isProtein()) {
                        // Protein Atom
                        const seqIdx = residueSeqMap.get(`${a.chainname}:${a.resno}`);
                        proteinAtoms.push({
                            x: a.x, y: a.y, z: a.z,
                            chain: a.chainname, resno: a.resno, resname: a.resname,
                            seqIdx: seqIdx
                        });
                        totalProteinAtoms++;
                    }
                });



                // 3. Distance Calculation
                for (const [rIndex, lAtoms] of ligandAtomsMap.entries()) {
                    const meta = ligandMetadata.get(rIndex);
                    if (!meta) continue;



                    const contacts: any[] = [];
                    const seenResidues = new Set<string>();

                    for (const pAtom of proteinAtoms) {
                        const resKey = `${pAtom.chain}:${pAtom.resno}`;
                        if (seenResidues.has(resKey)) continue;

                        let isContact = false;
                        let minDist = 100.0;

                        for (const lAtom of lAtoms) {
                            const dist = Math.sqrt(
                                Math.pow(pAtom.x - lAtom.x, 2) +
                                Math.pow(pAtom.y - lAtom.y, 2) +
                                Math.pow(pAtom.z - lAtom.z, 2)
                            );
                            if (dist < minDist) minDist = dist;
                            if (dist <= 5.0) {
                                isContact = true;
                                break;
                            }
                        }

                        if (isContact) {
                            seenResidues.add(resKey);
                            contacts.push({
                                residueChain: pAtom.chain,
                                residueNumber: pAtom.resno,
                                residueSeq: pAtom.seqIdx, // Pass sequential index
                                residueName: pAtom.resname,
                                distance: parseFloat(minDist.toFixed(2))
                            });
                        }
                    }

                    if (contacts.length > 0) {

                        interactions.push({
                            ligandName: meta.resname,
                            ligandChain: meta.chainname,
                            ligandResNo: meta.resno,
                            contacts: contacts.sort((a, b) => a.distance - b.distance)
                        });
                    } else {

                    }
                }

            } catch (e) {
                console.error("Failed to calculate ligand interactions:", e);
            }


            return interactions;
        },

        clearMeasurements: () => {
            measurementsRef.current = [];
            selectedAtomsRef.current = [];

            // 1. Remove Representations (Distance Lines)
            if (componentRef.current) {
                const comp = componentRef.current;
                measurementRepsRef.current.forEach(rep => {
                    try {
                        comp.removeRepresentation(rep);
                        // Also try removing from the internal reprList if removeRepresentation doesn't fully work (NGL quirk)
                        // But mostly removeRepresentation is enough
                    } catch (e) {
                        console.warn("Failed to remove measurement representation", e);
                    }
                });
                measurementRepsRef.current = [];
            }

            // 2. Remove selection spheres (Shapes)
            if (stageRef.current) {
                stageRef.current.eachComponent((comp: any) => {
                    if (comp.name && (comp.name.startsWith("measure-") || comp.name.startsWith("sel-"))) {
                        stageRef.current.removeComponent(comp);
                    }
                });
            }
        },
        getMeasurements: () => measurementsRef.current,
        restoreMeasurements: (list: { atom1: any, atom2: any }[]) => {
            if (!componentRef.current || !list || list.length === 0) return;
            // Clear existing first
            measurementsRef.current = [];

            // Helper to find atom index
            const findAtom = (info: any) => {
                let found: any = null;
                if (!componentRef.current) return null;
                // Try precise match first
                const sel = new window.NGL.Selection(`${info.r}:${info.c} and .${info.a}`);
                componentRef.current.structure.eachAtom((atom: any) => {
                    found = atom;
                }, sel);
                return found;
            };

            list.forEach(m => {
                const a1 = findAtom({ c: m.atom1.chain, r: m.atom1.resNo, a: m.atom1.atomName });
                const a2 = findAtom({ c: m.atom2.chain, r: m.atom2.resNo, a: m.atom2.atomName });

                if (a1 && a2) {
                    const dx = a1.x - a2.x;
                    const dy = a1.y - a2.y;
                    const dz = a1.z - a2.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    const mData: MeasurementData = {
                        atom1: { chain: a1.chainname, resNo: a1.resno, atomName: a1.atomname, x: a1.x, y: a1.y, z: a1.z, index: a1.index },
                        atom2: { chain: a2.chainname, resNo: a2.resno, atomName: a2.atomname, x: a2.x, y: a2.y, z: a2.z, index: a2.index },
                        distance: dist,
                        shapeId: `measure-${Date.now()}-${Math.random()}`
                    };
                    measurementsRef.current.push(mData);
                    drawMeasurement(mData);
                }
            });
        }
    }));

    useEffect(() => {
        if (stageRef.current) {
            stageRef.current.setSpin(isSpinning);
        }
    }, [isSpinning]);

    // Handle Window Resize
    useEffect(() => {
        if (stageRef.current) {
            const bgColor = backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : backgroundColor;
            stageRef.current.setParameters({ backgroundColor: bgColor });
        }
    }, [backgroundColor]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;

        try {
            const bgColor = backgroundColor === 'transparent' ? 'rgba(0,0,0,0)' : backgroundColor;
            const stage = new window.NGL.Stage(containerRef.current, {
                backgroundColor: bgColor,
                tooltip: false, // Disable default NGL tooltip to use HUD
                webglParams: {
                    preserveDrawingBuffer: true,
                    alpha: true // Enable transparency support
                }
            });
            stageRef.current = stage;

            // --- HOVER HANDLING (HUD) ---
            let hoveredAtomIndex = -1;
            stage.signals.hovered.add((pickingProxy: any) => {
                if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
                    const atom = pickingProxy.atom || (pickingProxy.bond ? pickingProxy.bond.atom1 : null);

                    if (atom && atom.index !== hoveredAtomIndex) {
                        hoveredAtomIndex = atom.index;
                        if (onHoverRef.current) {
                            let displayResName = atom.resname;
                            // Use Structure Title/Filename for generic HET residues (chemicals)
                            if (['HET', 'UNL', 'LIG', 'UNK'].includes(displayResName) && atom.structure && atom.structure.name) {
                                const cleanName = atom.structure.name.split('.')[0];
                                if (cleanName) displayResName = cleanName;
                            }

                            onHoverRef.current({
                                chain: atom.chainname,
                                resNo: atom.resno,
                                resName: displayResName,
                                atomIndex: atom.index,
                                atomName: atom.atomname,
                                atomSerial: atom.serial,
                                element: atom.element
                            });
                        }
                    }
                } else {
                    if (hoveredAtomIndex !== -1) {
                        hoveredAtomIndex = -1;
                        if (onHoverRef.current) onHoverRef.current(null);
                    }
                }
            });

            // Handle Container Resize (Robust)
            const resizeObserver = new ResizeObserver(() => {
                stage.handleResize();
            });
            if (containerRef.current) {
                resizeObserver.observe(containerRef.current);
            }

            // --- Camera Signal Logic ---
            if (stage.viewerControls) {
                stage.viewerControls.signals.changed.add(() => {
                    // We only want to notify if the change came from user interaction,
                    // but NGL doesn't easily distinguish. 
                    // However, we can use a flag if we are setting it programmatically.
                    // However, we can use a flag if we are setting it programmatically.
                    if (onCameraChangeRef.current && !stage.isProgrammaticRotate) {
                        const orientation = stage.viewerControls.getOrientation();
                        // Convert Matrix to array to be safe
                        const elements = Array.from(orientation.elements);
                        onCameraChangeRef.current(elements);
                    }
                });
            }

            return () => {
                resizeObserver.disconnect();
                try { stage.dispose(); } catch (e) { }
                stageRef.current = null;
            };
        } catch (err) {
            console.error("Failed to init NGL Stage:", err);
            setError?.(err instanceof Error ? err.message : String(err));
        }
    }, []); // Run once on mount

    // --- INTERACTION CONTROL ---
    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;
        const ngl = window.NGL;

        if (isInteractive) {
            // Restore Controls
            stage.mouseControls.add("drag-left", ngl.MouseActions.rotateDrag);
            stage.mouseControls.add("scroll", ngl.MouseActions.zoomScroll);
            stage.mouseControls.add("drag-right", ngl.MouseActions.panDrag);
        } else {
            // Remove Manipulation Controls (Keep Hover/Signals)
            stage.mouseControls.remove("drag-left");
            stage.mouseControls.remove("scroll");
            stage.mouseControls.remove("drag-right");
        }
    }, [isInteractive]);

    useEffect(() => {
        const loadStructure = async () => {
            const stage = stageRef.current;
            if (!stage) return;

            try {
                if (stage.viewer) {
                    try { stage.removeAllComponents(); } catch (e) { }
                }
            } catch (e) { /* ignore */ }

            componentRef.current = null;
            if (isMounted.current) setError(null);
            if (isMounted.current) setLoading(true);

            const currentPdbId = pdbId;
            const currentFile = file;

            try {
                // Generic Loader Function
                const loadStructure = async () => {
                    if (currentFile) {
                        console.log("Loading from file:", currentFile.name);
                        // Detect extension
                        const rawExt = currentFile.name.split('.').pop()?.toLowerCase() || 'pdb';
                        console.log(`[ProteinViewer] Loading File: ${currentFile.name} | Size: ${currentFile.size} | Ext: ${rawExt}`);
                        let ext = rawExt;

                        // Normalize extensions
                        if (ext === 'ent') {
                            ext = 'pdb';
                        }

                        // We read as ArrayBuffer to handle all file types correctly (PDB/CIF/BinaryCIF)
                        const fileContent = await new Promise<ArrayBuffer>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
                            reader.onerror = (e) => reject(e);
                            reader.readAsArrayBuffer(currentFile);
                        });

                        const blob = new Blob([fileContent], { type: 'application/octet-stream' });
                        const objectUrl = URL.createObjectURL(blob);

                        console.log(`Loading via Object URL: ${objectUrl} as ${ext}`);

                        const safeName = `structure.${ext}`;
                        try {
                            return await stage.loadFile(objectUrl, {
                                defaultRepresentation: false,
                                ext,
                                name: safeName
                            });
                        } finally {
                            // URL.revokeObjectURL(objectUrl);
                        }
                    }


                    if (currentPdbId) {
                        const cleanId = String(currentPdbId).trim().toLowerCase();
                        // PDB IDs are 4 chars. PubChem CIDs can be 1+ digits.
                        if (dataSource === 'pdb' && cleanId.length < 3) return null;
                        if (dataSource === 'pubchem' && cleanId.length < 1) return null;

                        let url = getStructureUrl(cleanId, dataSource);
                        let loadParams: any = { defaultRepresentation: false };

                        // Add extension hint for NGL if needed
                        if (dataSource === 'pubchem') loadParams.ext = 'sdf';

                        const AVAILABLE_LOCAL_PDBS = ['2b3p', '4hhb'];
                        if (dataSource === 'pdb' && AVAILABLE_LOCAL_PDBS.includes(cleanId)) {
                            url = `./${cleanId}.pdb`;
                        }

                        console.log(`Fetching from: ${url}`);

                        try {
                            const comp = await stage.loadFile(url, loadParams);
                            if (!comp) throw new Error("NGL returned null component");

                            // CRITICAL: Check if structure is actually populated
                            console.log(`[ProteinViewer] Loaded Component. AtomCount: ${comp.structure ? comp.structure.atomCount : 'N/A'}`);
                            if (comp.structure && comp.structure.atomCount === 0) {
                                // If 3D structure is empty, trigger fallback
                                comp.structure.dispose(); // Cleanup
                                throw new Error("Loaded 3D structure has 0 atoms");
                            }

                            return comp;
                        } catch (primaryErr) {
                            console.warn(`Primary load failed for ${url}`, primaryErr);

                            // Fallback Logic for PubChem (Try 2D SDF if 3D fails)
                            if (dataSource === 'pubchem') {
                                console.log("Attempting PubChem 2D Fallback...");
                                const fallbackUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cleanId}/record/SDF/?record_type=2d`;
                                try {
                                    const component = await stage.loadFile(fallbackUrl, { ...loadParams, name: `structure-2d.sdf` });
                                    // Ensure 2D structures are visible (force Line representation)
                                    if (component) {
                                        console.log("2D Fallback Loaded. Adding Line representation...");
                                        component.addRepresentation('line', { color: 'element' }); // Simple, robust
                                        component.autoView();
                                    }
                                    return component;
                                } catch (secondaryErr) {
                                    console.error("Fallback load failed", secondaryErr);
                                    if (isMounted.current) setError("Failed to load structure (3D and 2D unavailable).");
                                    return null;
                                }
                            }

                            // Propagate error for PDB
                            if (isMounted.current) setError("Failed to fetch structure.");
                            return null;
                        }
                    }
                    return null;
                };

                const component = await loadStructure();
                if (!component) {
                    if (isMounted.current) setLoading(false);
                    return;
                }

                if (component && isMounted.current) {
                    console.log("Component loaded. Type:", component.type);
                    componentRef.current = component;

                    if (component.structure && onStructureLoaded) {
                        try {
                            const chains: ChainInfo[] = [];
                            const seenChains = new Set<string>();

                            console.log("Structure details:", {
                                atomCount: component.structure.atomCount,
                                modelCount: component.structure.modelStore.count,
                                chainCount: component.structure.chainStore.count
                            });

                            if (component.structure.atomCount === 0) {
                                console.warn("Loaded structure has 0 atoms.");
                                if (currentFile) {
                                    // Check if it might be a Structure Factors file
                                    const fileContent = await currentFile.text(); // Re-read text safe here since it already loaded
                                    if (!fileContent.includes('_atom_site')) {
                                        const isSF = currentFile.name.includes('-sf') || fileContent.includes('_refln');
                                        const msg = isSF
                                            ? "This appears to be a Structure Factors file (diffraction data), not a coordinate model. Please upload the model file (usually .pdb or .cif without '-sf')."
                                            : "The file was parsed but contains no atoms. Please check the file format.";

                                        if (isMounted.current) setError(msg);
                                        return;
                                    }
                                }
                            }

                            component.structure.eachChain((c: any) => {
                                if (seenChains.has(c.chainname)) return;
                                seenChains.add(c.chainname);

                                let seq = "";
                                let minSeq = Infinity;
                                let maxSeq = -Infinity;
                                let nucleicCount = 0;
                                let proteinCount = 0;

                                const resMap: number[] = [];
                                const bFactors: number[] = [];

                                try {
                                    c.eachResidue((r: any) => {
                                        let resNo = r.resno;
                                        if (resNo === undefined && typeof r.getResno === 'function') {
                                            resNo = r.getResno();
                                        }

                                        if (typeof resNo === 'number') {
                                            if (resNo < minSeq) minSeq = resNo;
                                            if (resNo > maxSeq) maxSeq = resNo;
                                            resMap.push(resNo); // Valid residue number
                                        } else {
                                            // Fallback for weird cases
                                            resMap.push((maxSeq > -Infinity ? maxSeq : 0) + 1);
                                        }

                                        // B-Factor Extraction (Average of atoms in residue)
                                        let bSum = 0;
                                        let bCount = 0;
                                        r.eachAtom((a: any) => {
                                            bSum += a.bfactor;
                                            bCount++;
                                        });
                                        const avgB = bCount > 0 ? bSum / bCount : 0;
                                        bFactors.push(avgB);

                                        // Determine Type
                                        if (r.isNucleic()) nucleicCount++;
                                        else if (r.isProtein()) proteinCount++;

                                        // Parse Residue Name
                                        let resName = 'X';
                                        if (r.isNucleic()) {
                                            const rawName = r.resname.trim().toUpperCase();
                                            // DNA: DA, DT, DC, DG
                                            // RNA: A, U, C, G
                                            if (rawName.length === 1) resName = rawName;
                                            else if (rawName.length === 2 && rawName.startsWith('D')) resName = rawName[1];
                                            else if (rawName.length === 2 && rawName.endsWith('A')) resName = 'A'; // Weird cases
                                            else resName = rawName.substring(0, 1); // Best guess
                                        } else {
                                            // Protein
                                            if (r.getResname1) resName = r.getResname1();
                                            else if (r.resname) resName = r.resname[0];
                                        }
                                        seq += resName;
                                    });
                                } catch (eRes) {
                                    console.warn(`Residue iteration failed for chain ${c.chainname}`, eRes);
                                }

                                if (minSeq === Infinity) minSeq = 0;
                                if (maxSeq === -Infinity) maxSeq = 0;

                                // Infer Chain Type
                                let chainType: 'protein' | 'nucleic' | 'unknown' = 'unknown';
                                if (nucleicCount > proteinCount) chainType = 'nucleic';
                                else if (proteinCount > 0) chainType = 'protein';

                                // Extract Atoms for Small Molecules
                                let atomList: AtomInfo[] = [];
                                if (chainType === 'unknown' && seq.length < 50) { // Limit to reasonable size
                                    try {
                                        c.eachResidue((r: any) => {
                                            r.eachAtom((a: any) => {
                                                atomList.push({
                                                    serial: a.serial,
                                                    name: a.atomname,
                                                    element: a.element,
                                                    resNo: r.resno,
                                                    chain: c.chainname
                                                });
                                            });
                                        });
                                    } catch (eAtom) { console.warn("Atom iteration failed", eAtom); }
                                }

                                console.log(`Chain ${c.chainname}: Range ${minSeq}-${maxSeq}, SeqLen: ${seq.length}, Type: ${chainType}`);
                                chains.push({
                                    name: c.chainname,
                                    min: minSeq,
                                    max: maxSeq,
                                    sequence: seq,
                                    residueMap: resMap,
                                    type: chainType,
                                    atoms: atomList.length > 0 ? atomList : undefined,
                                    bFactors: bFactors // Added
                                });
                            });

                            // Extract Ligands
                            const ligandSet = new Set<string>();
                            component.structure.eachResidue((r: any) => {
                                // Basic filter for ligands: isHetero and not Water/Ion (generic check)
                                // NGL might mark waters as hetero. Typical water names: HOH, WAT, TIP
                                const invalidLigands = ['HOH', 'WAT', 'TIP', 'SOL', 'DOD'];
                                if (r.isHetero() && !invalidLigands.includes(r.resname)) {
                                    ligandSet.add(r.resname);
                                }
                            });
                            const ligands = Array.from(ligandSet).sort();
                            const isSmallMolecule = chains.every(c => c.type === 'unknown'); // Naive but effective for PDB/SDF parsing

                            if (onStructureLoaded) {
                                onStructureLoaded({ chains, ligands, isSmallMolecule });
                            }
                        } catch (e) { console.warn("Chain parsing error", e); }
                    }

                    console.log("Applying initial representation...");
                    try {
                        updateRepresentation(component);
                    } catch (reprErr) {
                        console.error("Initial representation failure:", reprErr);
                    }

                    setTimeout(() => {
                        if (!isMounted.current) return;
                        try {
                            console.log("AutoView & Resize...");
                            stage.handleResize();
                            // Apply Orientation or AutoView
                            if (initialOrientation && stage.viewerControls) {
                                try {
                                    stage.viewerControls.orient(initialOrientation);
                                } catch (e) {
                                    console.warn("Failed to apply initial orientation, falling back to autoView", e);
                                    component.autoView();
                                }
                            } else {
                                component.autoView();
                            }
                            if (stage.viewer) stage.viewer.requestRender();
                        } catch (e) { console.warn("AutoView failed", e); }
                    }, 1000);
                }
            } catch (err) {
                if (isMounted.current) {
                    console.error("Load Error (caught):", err);
                    setError(`Failed to load: ${err instanceof Error ? err.message : String(err)}`);
                }
            } finally {
                if (isMounted.current) setLoading(false);
            }
        };

        // Allow short IDs for PubChem (or non-PDB sources)
        const isIdValid = pdbId && (String(pdbId).length >= 3 || dataSource !== 'pdb');

        if (file || isIdValid) {
            loadStructure();
        } else {
            if (stageRef.current) stageRef.current.removeAllComponents();
            componentRef.current = null;
        }
    }, [pdbId, dataSource, file]);


    // --- OVERLAY SUPERPOSITION ---
    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;
        const mainComponent = componentRef.current;

        // If no main component, we can't superpose, but maybe we can still load?
        // For now, assume superposition requires a base.
        if (!mainComponent) return;

        // 1. Handle Removals
        const currentIds = new Set(overlays?.map(o => o.id) || []);
        overlayComponentsRef.current.forEach((comp, id) => {
            if (!currentIds.has(id)) {
                stage.removeComponent(comp);
                overlayComponentsRef.current.delete(id);
            }
        });

        // 2. Handle Additions/Updates
        overlays?.forEach(async (overlay) => {
            let comp = overlayComponentsRef.current.get(overlay.id);

            if (!comp) {
                // Load New Overlay
                console.log(`Loading overlay: ${overlay.id} (${overlay.pdbId || overlay.file?.name})`);
                try {
                    if (overlay.file) {
                        const blob = overlay.file; // File object is a Blob
                        // NGL might need extension hint
                        const ext = overlay.file.name.split('.').pop()?.toLowerCase() || 'pdb';
                        comp = await stage.loadFile(blob, { ext, defaultRepresentation: false });
                    } else if (overlay.pdbId) {
                        const url = getStructureUrl(overlay.pdbId, 'pdb');
                        // Handle local 2b3p/4hhb special case if needed, but getStructureUrl handles RCSB mostly
                        comp = await stage.loadFile(url, { defaultRepresentation: false });
                    }

                    if (comp) {
                        // SUPERPOSE
                        console.log(`Superposing ${overlay.id} onto main structure...`);
                        try {
                            // Verify main component structure availability
                            if (!mainComponent || !mainComponent.structure) {
                                console.warn("[Superpose] Main component or structure missing!", mainComponent);
                                return;
                            }

                            const mainAtoms = mainComponent.structure.atomCount;
                            const overlayAtoms = comp.structure.atomCount;
                            console.log(`[Superpose] Aligning '${overlay.id}' (${overlayAtoms} atoms) to Main (${mainAtoms} atoms)`);

                            // align=true moves the component
                            try {
                                comp.superpose(mainComponent, true, "CA");
                                // Also try to update position just in case
                                comp.updateRepresentations({ position: true });
                            } catch (e) {
                                console.warn("Superposition failed:", e);
                            }
                        } catch (e) {
                            console.warn("Superposition failed:", e);
                        }

                        // Add Representation
                        comp.addRepresentation('cartoon', {
                            color: overlay.color || 'lightgrey',
                            opacity: overlay.opacity ?? 0.7,
                            side: 'front'
                        });

                        overlayComponentsRef.current.set(overlay.id, comp);
                    }
                } catch (e) {
                    console.error(`Failed to load overlay ${overlay.id}`, e);
                }
            } else {
                // Update Existing
                comp.setVisibility(overlay.isVisible);
                // Update opacity/color if changed?
                // Re-superposing every render is expensive/jumpy. Assume static once aligned.
            }
        });

    }, [overlays]); // Dependency on overlays array. Note: Deep compare might be better if frequent updates.




    // Annotations Logic
    const [overlayPositions, setOverlayPositions] = React.useState<Record<string, { x: number, y: number, visible: boolean }>>({});
    const annotationsRef = useRef(annotations || []); // Keep track of latest annotations for render loop
    const onAddAnnotationRef = useRef(onAddAnnotation);

    useEffect(() => {
        annotationsRef.current = annotations || [];
    }, [annotations]);

    useEffect(() => {
        onAddAnnotationRef.current = onAddAnnotation;
    }, [onAddAnnotation]);

    // Handle Annotation Projection Loop
    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;

        const updatePositions = () => {
            if (!stage.viewer || !annotationsRef.current.length) return;

            const newPositions: Record<string, { x: number, y: number, visible: boolean }> = {};
            let hasUpdates = false;

            annotationsRef.current.forEach(ann => {
                const vec = new window.NGL.Vector3(ann.position.x, ann.position.y, ann.position.z);

                // Project to screen space
                vec.project(stage.viewer.camera);

                // Convert to Pixel Coordinates
                const canvas = stage.viewer.renderer.domElement;
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;

                const x = (vec.x * 0.5 + 0.5) * width;
                const y = (-(vec.y * 0.5) + 0.5) * height;

                // Check if visible
                const visible = (vec.z >= -1 && vec.z <= 1);

                newPositions[ann.id] = { x, y, visible };
                hasUpdates = true;
            });

            if (hasUpdates) {
                setOverlayPositions(newPositions);
            }
        };

        // Bind to Render Signal for smooth sync during rotation
        stage.viewer.signals.rendered.add(updatePositions);
        updatePositions(); // Initial

        return () => {
            if (stage.viewer) stage.viewer.signals.rendered.remove(updatePositions);
        };
    }, [stageRef.current]);

    // Handle Double Click for Adding Annotation
    useEffect(() => {
        if (!stageRef.current || !onAddAnnotation) return;
        const stage = stageRef.current;

        const dblClickHandler = (_stage: any, pickingProxy: any) => {
            if (pickingProxy && pickingProxy.atom && onAddAnnotationRef.current) {
                const atom = pickingProxy.atom;
                // Create Annotation
                const ann: Annotation = {
                    id: crypto.randomUUID(),
                    residue: {
                        chain: atom.chainname,
                        resNo: atom.resno,
                        resName: atom.resname,
                        atomIndex: atom.index,
                        atomName: atom.atomname,
                        element: atom.element
                    },
                    text: "New Note", // Default text
                    position: { x: atom.x, y: atom.y, z: atom.z },
                    author: "Unknown"
                };
                onAddAnnotationRef.current(ann);
            }
        };

        stage.mouseControls.add("dblclick", dblClickHandler);

        return () => {
            stage.mouseControls.remove("dblclick", dblClickHandler);
        };
    }, [stageRef.current]);

    // Laser Pointer Logic (Ghost Hover Visuals)
    const laserPointerCompRef = useRef<any>(null);
    const trailHistoryRef = useRef<Array<{ x: number, y: number, z: number }>>([]);

    useEffect(() => {
        if (!componentRef.current || !stageRef.current) return;
        const stage = stageRef.current;
        const component = componentRef.current;

        // Remove old pointer
        if (laserPointerCompRef.current) {
            stage.removeComponent(laserPointerCompRef.current);
            laserPointerCompRef.current = null;
        }

        if (!remoteHoveredResidue) {
            trailHistoryRef.current = []; // Clear trail on disconnect
            return;
        }

        // Find Position
        const { chain, resNo } = remoteHoveredResidue;
        let pos: { x: number, y: number, z: number } | null = null;

        // Helper inline search
        // Helper inline search
        component.structure.eachResidue((res: any) => {
            if (res.chain.name === chain && res.resno === resNo) {
                let atom;
                // High-precision atom targeting
                if (remoteHoveredResidue.atomSerial) {
                    res.eachAtom((a: any) => {
                        if (a.serial === remoteHoveredResidue.atomSerial) atom = a;
                    });
                } else if (remoteHoveredResidue.atomName) {
                    atom = res.getAtomByName(remoteHoveredResidue.atomName);
                }

                // Fallback
                if (!atom) {
                    atom = res.getAtomByName('CA') || res.getAtomByIndex(0);
                }

                if (atom) {
                    pos = { x: atom.x, y: atom.y, z: atom.z };
                }
            }
        });

        if (pos) {
            // Update Trail
            trailHistoryRef.current.push(pos as any);
            if (trailHistoryRef.current.length > 8) trailHistoryRef.current.shift();

            // Render Shape
            const shape = new window.NGL.Shape("laser-pointer");

            // Main Dot (Red/Pink Glowing)
            shape.addSphere([(pos as any).x, (pos as any).y, (pos as any).z], [1, 0, 0.5], 1.5);

            // Trail (Fading)
            trailHistoryRef.current.forEach((tPos: { x: number, y: number, z: number }, i: number) => {
                const alpha = (i / trailHistoryRef.current.length);
                const size = 0.5 + (alpha * 0.8);
                shape.addSphere([tPos.x, tPos.y, tPos.z], [1, 1 - alpha, 0.5 + (alpha * 0.5)], size);
            });

            const shapeComp = stage.addComponentFromObject(shape);
            shapeComp.addRepresentation("buffer", { opacity: 0.8 });
            laserPointerCompRef.current = shapeComp;
        }

    }, [remoteHoveredResidue]);

    // --- MEASUREMENT RENDERING ---
    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;

        // Clean up old measurement shapes
        stage.getComponentsByName("measurement-shape").list.forEach((c: any) => stage.removeComponent(c));

        measurements?.forEach((m: Measurement) => {
            const shape = new window.NGL.Shape("measurement-shape");
            const p1 = [m.atom1.position?.x || 0, m.atom1.position?.y || 0, m.atom1.position?.z || 0];
            const p2 = [m.atom2.position?.x || 0, m.atom2.position?.y || 0, m.atom2.position?.z || 0];

            // Draw Line
            // NGL colors are [r, g, b] 0-1. We need to convert hex string.
            // For simplicity, let's use a standard color or parse the hex.
            // Using a simple hash for now or default to orange [1, 0.5, 0]
            // Ideally we parse m.color

            // Convert simple hex (e.g. #ff0000) to RGB array
            const hexToRgb = (hex: string) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? [
                    parseInt(result[1], 16) / 255,
                    parseInt(result[2], 16) / 255,
                    parseInt(result[3], 16) / 255
                ] : [1, 1, 1];
            };
            const colorArr = hexToRgb(m.color);

            // Determine text color
            let labelColor = [0, 0, 0];
            const getBrightness = (color: string) => {
                let r, g, b;
                if (color.startsWith('#')) {
                    const hex = color.substring(1);
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                } else if (color === 'white') {
                    return 255;
                } else if (color === 'black') {
                    return 0;
                } else {
                    return isLightMode ? 255 : 0;
                }
                return (r * 299 + g * 587 + b * 114) / 1000;
            };

            if (measurementTextColor !== 'auto' && measurementTextColor.startsWith('#')) {
                // Custom Hex Color
                const hex = measurementTextColor.substring(1);
                labelColor = [
                    parseInt(hex.substring(0, 2), 16) / 255,
                    parseInt(hex.substring(2, 4), 16) / 255,
                    parseInt(hex.substring(4, 6), 16) / 255
                ];
            } else if (measurementTextColor === 'black') {
                labelColor = [0, 0, 0];
            } else if (measurementTextColor === 'white') {
                labelColor = [1.0, 0.8, 0.0]; // Keeping 'Gold' for legacy 'white'
            } else {
                // Auto mode
                const bgBrightness = getBrightness(backgroundColor || (isLightMode ? 'white' : 'black'));
                labelColor = bgBrightness > 128 ? [0, 0, 0] : [1.0, 0.8, 0.0];
            }

            shape.addCylinder(p1, p2, colorArr, 0.1);
            shape.addSphere(p1, colorArr, 0.2);
            shape.addSphere(p2, colorArr, 0.2);
            shape.addText(
                [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2],
                labelColor,
                2.5, // Increased size from 0.8
                m.distance.toFixed(2) + " A" // Use 'A' instead of symbol for compatibility
            );

            const comp = stage.addComponentFromObject(shape);
            comp.addRepresentation("buffer", { depthTest: false });
        });

    }, [measurements, isLightMode, backgroundColor, measurementTextColor]);


    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;

        const handleClick = (pickingProxy: any) => {
            if (!pickingProxy || !pickingProxy.atom) {
                if (onAtomClick) onAtomClick(null);
                selectedAtomsRef.current = []; // Reset selection on background click
                // Clear temp selection shapes?
                stage.getComponentsByName("temp-selection").list.forEach((c: any) => stage.removeComponent(c));
                return;
            }
            const atom = pickingProxy.atom;

            // MEASUREMENT MODE LOGIC
            // MEASUREMENT MODE LOGIC


            if (isMeasurementMode) {
                const atomData = {
                    chain: atom.chainname,
                    resNo: atom.resno,
                    resName: atom.resname,
                    atomIndex: atom.index,
                    atomName: atom.atomname,
                    position: { x: atom.x, y: atom.y, z: atom.z }
                };

                selectedAtomsRef.current.push(atomData);

                // Highlight choice
                const shape = new window.NGL.Shape("temp-selection");
                shape.addSphere([atom.x, atom.y, atom.z], [1, 0.84, 0], 0.3); // Gold
                const comp = stage.addComponentFromObject(shape);
                comp.addRepresentation("buffer", { depthTest: false });

                // Check for pair
                if (selectedAtomsRef.current.length === 2) {
                    const a1 = selectedAtomsRef.current[0];
                    const a2 = selectedAtomsRef.current[1];

                    // Calculate distance
                    const dx = a1.position.x - a2.position.x;
                    const dy = a1.position.y - a2.position.y;
                    const dz = a1.position.z - a2.position.z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // Generate measurement name
                    let measurementName: string;
                    const isChemical = a1.resName === 'HET' && a2.resName === 'HET';

                    if (isChemical && a1.atomName && a2.atomName) {
                        // For chemicals, show only atom names
                        measurementName = `${a1.atomName}-${a2.atomName}`;
                    } else {
                        // For proteins or mixed, show full residue info
                        measurementName = `${a1.resName} ${a1.resNo}${a1.atomName ? ` (${a1.atomName})` : ''}-${a2.resName} ${a2.resNo}${a2.atomName ? ` (${a2.atomName})` : ''}`;
                    }

                    const newMeasurement: Measurement = {
                        id: crypto.randomUUID(),
                        name: measurementName,
                        distance: dist,
                        color: '#3b82f6', // Default blue
                        atom1: a1,
                        atom2: a2
                    };

                    if (onAddMeasurement) onAddMeasurement(newMeasurement);

                    // Reset selection
                    selectedAtomsRef.current = [];
                    stage.getComponentsByName("temp-selection").list.forEach((c: any) => stage.removeComponent(c));
                }
                return;
            }

            console.log("DEBUG: Clicked Atom:", atom);



            // Standard Interaction (Bi-directional Sync)
            if (onAtomClick) {
                // Try to get exact click position, or fall back to atom center
                let pos = null;
                if (pickingProxy.position) {
                    pos = { x: pickingProxy.position.x, y: pickingProxy.position.y, z: pickingProxy.position.z };
                } else if (atom) {
                    pos = { x: atom.x, y: atom.y, z: atom.z };
                }

                console.log("DEBUG: Final Position for Click:", pos);

                onAtomClick({
                    chain: atom.chainname,
                    resNo: atom.resno,
                    resName: atom.resname,
                    atomIndex: atom.index,
                    position: pos || undefined
                });
            }
        };

        stage.signals.clicked.add(handleClick);

        return () => {
            stage.signals.clicked.remove(handleClick);

        };
    }, [onAtomClick, isMeasurementMode]);


    const updateRepresentation = (specificComponent?: any) => {
        if (!isMounted.current) return;
        const component = specificComponent || componentRef.current;
        if (!component || !component.structure) return;

        try {
            component.removeAllRepresentations();
            highlightComponentRef.current = null;

            console.log("[ProteinViewer] updateRepresentation: customColors =", customColors);




            let repType = representation || 'cartoon';
            let finalColor: any = coloring || 'chainid';

            // --- 1. RESOLVE ALIASES & DEFAULTS ---
            // Fix: NGL 'chainid' scheme can be ambiguous or monochromatic. Use 'chainindex' for distinct colors per chain.
            if (finalColor === 'chainid') finalColor = 'chainindex';

            if (finalColor === 'structure' || finalColor === 'secondary-structure') finalColor = 'sstruc';
            if (pdbId && pdbId.toLowerCase().includes('1crn') && finalColor === 'chainid') {
                finalColor = 'residue';
                repType = 'licorice';
            }

            // Handle "Force Element" for single chains/chemicals when default 'chainid' is picked
            const chainCount = component.structure ? component.structure.chainStore.count : 0;
            if (finalColor === 'chainid' && (chainCount <= 1 || dataSource === 'pubchem')) {
                finalColor = 'element';
            }

            // --- 2. REGISTER DYNAMIC SCHEMES (Charge & Custom) ---
            const NGL = window.NGL;

            // Custom Scheme Logic using Native NGL SelectionColormaker
            // This is robust because it uses NGL's internal selection handling and fallback logic.

            // Helper: Register Charge Scheme (Dynamic)
            if (finalColor === 'charge') {
                finalColor = NGL.ColormakerRegistry.addScheme(function (this: any, params: any) {
                    this.parameters = params;
                    this.atomColor = function (atom: any) {
                        const r = atom.resname;
                        if (['ARG', 'LYS', 'HIS'].includes(r)) return 0x0000FF; // Blue
                        if (['ASP', 'GLU'].includes(r)) return 0xFF0000; // Red
                        return 0xFFFFFF; // White
                    };
                }, 'charge_dynamic');
            }

            // --- 3. APPLY CUSTOM OVERRIDES USING SELECTION SCHEME ---
            if (customColors && customColors.length > 0 && NGL.ColormakerRegistry.addSelectionScheme) {
                const dataList: any[] = [];

                // 1. Add Custom Rules [color, selection] with VALIDATION
                customColors.forEach(rule => {
                    if (rule.selection && rule.color) {
                        try {
                            const testSel = new NGL.Selection(rule.selection);
                            if (testSel) {
                                dataList.push([rule.color, rule.selection]);
                            }
                        } catch (e) {
                            console.warn("Skipping invalid selection rule:", rule.selection);
                        }
                    }
                });

                // 2. Add Base Fallback [baseScheme, "*"]
                dataList.push([finalColor, "*"]);

                // 3. Register Selection Scheme
                try {
                    const params = {
                        schemeId: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    };
                    const compositeId = NGL.ColormakerRegistry.addSelectionScheme(dataList, params.schemeId);
                    if (compositeId) finalColor = compositeId;
                } catch (e) {
                    console.error("Failed to register selection scheme", e);
                }
            }

            // --- 4. RENDER SINGLE REPRESENTATION ---
            const PALETTES: Record<string, string[]> = {
                'viridis': ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
                'magma': ['#000004', '#51127c', '#b73779', '#fc8961', '#fcfdbf'],
                'cividis': ['#00204d', '#002051', '#7c7b78', '#fdea45', '#fdea45'],
                'plasma': ['#0d0887', '#7e03a8', '#cc4778', '#f89540', '#f0f921'],
                'standard': []
            };

            const params: any = {
                color: finalColor,
                quality: 'high',
                name: 'base_representation',
                multipleBond: 'symmetric' // Enable Double/Triple Bond Rendering
            };

            const scale = PALETTES[colorPalette];
            if (scale && scale.length > 0) {
                params.colorScale = scale;
            }

            const cartoonParams = {
                aspectRatio: 6.0,
                subdiv: 12,
                radialSegments: 20,
                smoothSheet: false,
                quality: 'high'
            };

            if (repType === 'cartoon') {
                Object.assign(params, cartoonParams);
                try { component.structure.eachModel((m: any) => m.calculateSecondaryStructure?.()); } catch (e) { }
            }

            // Add the single, unified representation
            component.addRepresentation(repType, params);

            // 2. Add Custom Representations (Overlay)

            // --- OVERLAYS ---
            const tryApply = (r: string, c: string, sele: string, params: any = {}) => {
                try { component.addRepresentation(r, { color: c, sele: sele, ...params }); } catch (e) { }
            };

            // Fix for "Licorice looks like Ball+Stick":
            // If we are visualizing a chemical/small molecule (chainCount <= 1) AND using an atomic representation (licorice/spacefill),
            // the Base Representation (which selects '*') already draws the ligands.
            // We should NOT apply the "Ball+Stick" overlay on top, as it hides the style of the base rep.
            const atomicReps = ['licorice', 'ball+stick', 'spacefill', 'line', 'point', 'hyperball'];
            const isBaseRepAtomic = atomicReps.includes(repType);
            const overlayChainCount = component.structure ? component.structure.chainStore.count : 0;
            const isSmallMoleculeOrSingleChain = overlayChainCount <= 1 || dataSource === 'pubchem';

            const skipLigandOverlay = isBaseRepAtomic && isSmallMoleculeOrSingleChain;

            if (showSurface) tryApply('surface', 'white', "*", { opacity: 0.4, depthWrite: false, side: 'front' });
            if (showLigands && !skipLigandOverlay) tryApply('ball+stick', 'element', 'ligand and not (water or ion)', { scale: 2.0 });
            if (showIons) tryApply('ball+stick', 'element', 'ion', { scale: 2.0 });

            // DNA/RNA Base Pairs (The "Steps" of the ladder)
            // We use 'base' representation for all nucleic acids
            tryApply('base', 'element', 'nucleic', { color: 'element', cylinderOnly: false });





            if (stageRef.current?.viewer) {
                stageRef.current.viewer.requestRender();
            }

        } catch (e) {
            console.error("Critical error in updateRepresentation:", e);
        }
    };

    // --- VISUAL ECSTASY: Stage Parameters Update ---
    useEffect(() => {
        if (!stageRef.current) return;
        const stage = stageRef.current;

        // NGL Stage Parameters for High Quality / Ambient Occlusion
        const params: any = {
            backgroundColor: backgroundColor,
            quality: quality, // 'medium' or 'high'
            lightIntensity: 1.0, // Standard key light
        };

        if (enableAmbientOcclusion) {
            params.sampleLevel = 2; // -1/0 = off, 1 = low, 2 = medium, 4 = high
            params.ambientColor = 0x202020; // Soft grey shadow rather than pitch black
            params.ambientIntensity = 1.0;
        } else {
            params.sampleLevel = 0;
            params.ambientIntensity = 0.0;
        }

        try {
            stage.setParameters(params);
        } catch (e) { console.warn("Failed to set stage params", e); }

    }, [backgroundColor, quality, enableAmbientOcclusion]);

    useEffect(() => {
        updateRepresentation();
    }, [representation, coloring, showSurface, showLigands, showIons, colorPalette, customColors]);

    useEffect(() => {
        if (stageRef.current) {
            stageRef.current.setSpin(isSpinning);
        }
    }, [isSpinning]);


    useEffect(() => {
        if (stageRef.current && resetCamera) {
            try { stageRef.current.autoView(); } catch (e) { }
        }
    }, [resetCamera]);

    // Rock Animation Effect
    useEffect(() => {
        if (!stageRef.current || !isRocking) return;

        const stage = stageRef.current;
        let animationId: number;
        const startTime = performance.now();
        const period = 3000; // 3 seconds for full oscillation
        const maxAngle = 15 * (Math.PI / 180); // ±15 degrees in radians

        // Capture initial orientation
        const initialOrientation = stage.viewerControls.getOrientation().clone();

        // Disable spin when rocking
        if (stage.spinAnimation && !stage.spinAnimation.paused) {
            stage.setSpin(false);
        }

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const angle = Math.sin((elapsed / period) * 2 * Math.PI) * maxAngle;

            // Create rotation matrix for this frame
            const rotation = new window.NGL.Matrix4();
            rotation.makeRotationY(angle);

            // Apply rotation relative to initial orientation
            const newOrientation = initialOrientation.clone().multiply(rotation);
            stage.viewerControls.orient(newOrientation);

            animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [isRocking]);


    // Handle Scroll Protection
    useEffect(() => {
        if (!stageRef.current) return;

        if (disableScroll) {
            stageRef.current.mouseControls.remove('scroll-zoom');
        } else {
            // Restore scroll zoom (default NGL behavior)
            // Note: NGL uses MouseActions.zoomScroll
            stageRef.current.mouseControls.add('scroll-zoom', window.NGL.MouseActions.zoomScroll);
        }
    }, [disableScroll]);

    return (
        <div className={clsx("relative w-full h-full", className)} style={backgroundColor === 'transparent' ? { background: 'transparent' } : {}}>
            <div ref={containerRef} className="w-full h-full" style={backgroundColor === 'transparent' ? { background: 'transparent' } : {}} />

            {/* HTML Overlays for Annotations */}
            {annotations && annotations.map(ann => {
                const pos = overlayPositions[ann.id];
                if (!pos || !pos.visible) return null;
                return (
                    <div
                        key={ann.id}
                        className="absolute pointer-events-auto bg-yellow-100 text-black text-xs p-2 rounded shadow-lg border border-yellow-300 max-w-[150px] transform -translate-x-1/2 -translate-y-full mb-2"
                        style={{
                            left: pos.x,
                            top: pos.y,
                            zIndex: 10
                        }}
                    >
                        <div className="font-bold border-b border-black/10 mb-1 pb-0.5 text-[10px] uppercase opacity-50">
                            {ann.residue.resName} {ann.residue.resNo}
                        </div>
                        <div contentEditable suppressContentEditableWarning
                            onBlur={() => {
                                // TODO: Update text callback
                            }}
                        >
                            {ann.text}
                        </div>
                        {/* Triangle/Pointer */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-yellow-100" />
                    </div>
                );
            })}

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 transition-all duration-300">
                    <Skeleton className="w-32 h-32 rounded-full opacity-50" />
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-20 p-8">
                    <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl max-w-md text-center">
                        <h3 className="text-xl font-bold text-red-500 mb-2">Error Loading Structure</h3>
                        <p className="text-red-200">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
});
ProteinViewer.displayName = 'ProteinViewer';
