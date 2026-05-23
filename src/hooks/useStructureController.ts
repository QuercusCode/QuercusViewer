import { useState, useCallback } from 'react';
import type { RepresentationType, ColoringType, ResidueInfo, Measurement, PDBMetadata, ChainInfo, CustomColorRule, CustomStyleRule, CustomTransparencyRule, SuperposedStructure } from '../types';
import type { DataSource } from '../utils/pdbUtils';

// Types for the Controller Return Value
export interface StructureController {
    // State
    pdbId: string;
    setPdbId: (id: string) => void;
    dataSource: DataSource;
    setDataSource: (source: DataSource) => void;
    file: File | null;
    setFile: (file: File | null) => void;
    fileType: 'pdb' | 'mmcif' | 'sdf' | 'mol' | 'mol2';

    // Visualization
    representation: RepresentationType;
    setRepresentation: (type: RepresentationType) => void;
    coloring: ColoringType;
    setColoring: (type: ColoringType) => void;
    customColors: CustomColorRule[];
    setCustomColors: (colors: CustomColorRule[] | ((prev: CustomColorRule[]) => CustomColorRule[])) => void;
    chainStyles: Record<string, RepresentationType>;
    setChainStyle: (chain: string, style: RepresentationType | null) => void;
    customStyles: CustomStyleRule[];
    setCustomStyles: (styles: CustomStyleRule[] | ((prev: CustomStyleRule[]) => CustomStyleRule[])) => void;
    customTransparency: CustomTransparencyRule[];
    setCustomTransparency: (rules: CustomTransparencyRule[] | ((prev: CustomTransparencyRule[]) => CustomTransparencyRule[])) => void;
    isSpinning: boolean;
    setIsSpinning: (spinning: boolean | ((prev: boolean) => boolean)) => void;
    isRocking: boolean;
    setIsRocking: (rocking: boolean | ((prev: boolean) => boolean)) => void;
    showSurface: boolean;
    setShowSurface: (show: boolean | ((prev: boolean) => boolean)) => void;
    showLigands: boolean;
    setShowLigands: (show: boolean | ((prev: boolean) => boolean)) => void;
    showIons: boolean;
    setShowIons: (show: boolean | ((prev: boolean) => boolean)) => void;

    customBackgroundColor: string | null;
    setCustomBackgroundColor: (color: string | null) => void;

    // Data/Analysis
    chains: ChainInfo[];
    setChains: (chains: ChainInfo[]) => void;
    ligands: string[];
    setLigands: (ligands: string[]) => void;
    pdbMetadata: PDBMetadata | null;
    setPdbMetadata: (meta: PDBMetadata | null) => void;
    proteinTitle: string | null;
    setProteinTitle: (title: string | null) => void;

    // Interaction
    highlightedResidue: ResidueInfo | null;
    setHighlightedResidue: (res: ResidueInfo | null) => void;
    measurements: Measurement[];
    setMeasurements: (measurements: Measurement[] | ((prev: Measurement[]) => Measurement[])) => void;
    isMeasurementPanelOpen: boolean;
    setIsMeasurementPanelOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;

    // Superposition
    overlays: SuperposedStructure[];
    setOverlays: React.Dispatch<React.SetStateAction<SuperposedStructure[]>>;
    addOverlay: (structure: SuperposedStructure) => void;
    removeOverlay: (id: string) => void;
    toggleOverlay: (id: string) => void;

    smoothSheetEnabled: boolean;
    setSmoothSheetEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;

    // Actions
    handleUpload: (file: File, isCif?: boolean, preservePdbId?: boolean) => void;
    handleResetView: () => void;
    resetKey: number; // Used to trigger re-renders/resets in the viewer

    assignmentPayload?: import('../types').AssignmentPayload;
}

export const useStructureController = (initialState: any = {}): StructureController => {
    // Core Data
    const [pdbId, setPdbId] = useState<string>(initialState.pdbId || '');
    const [dataSource, setDataSource] = useState<DataSource>(initialState.dataSource || 'rcsb');
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<'pdb' | 'mmcif' | 'sdf' | 'mol' | 'mol2'>('pdb');

    // Visuals
    const [representation, setRepresentation] = useState<RepresentationType>(initialState.representation || 'cartoon');
    const [coloring, setColoring] = useState<ColoringType>(initialState.coloring || 'chainid');
    const [customColors, setCustomColors] = useState<CustomColorRule[]>(initialState.customColors || []);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isRocking, setIsRocking] = useState(false);
    const [showSurface, setShowSurface] = useState(false);
    const [showLigands, setShowLigands] = useState(false);
    const [showIons, setShowIons] = useState(initialState.showIons ?? false);
    const [smoothSheetEnabled, setSmoothSheetEnabled] = useState(initialState.smoothSheetEnabled ?? false);

    const [customBackgroundColor, setCustomBackgroundColor] = useState<string | null>(null);
    // Analysis
    const [chains, setChains] = useState<ChainInfo[]>([]);
    const [ligands, setLigands] = useState<string[]>([]);
    const [pdbMetadata, setPdbMetadata] = useState<PDBMetadata | null>(null);
    const [proteinTitle, setProteinTitle] = useState<string | null>(null);

    // Interaction
    const [highlightedResidue, setHighlightedResidue] = useState<ResidueInfo | null>(null);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);

    const [isMeasurementPanelOpen, setIsMeasurementPanelOpen] = useState(false);

    const [overlays, setOverlays] = useState<SuperposedStructure[]>([]);

    // View Control
    const [resetKey, setResetKey] = useState(0);

    // Chain Styling
    const [chainStyles, setChainStyles] = useState<Record<string, RepresentationType>>({});

    const setChainStyle = useCallback((chain: string, style: RepresentationType | null) => {
        setChainStyles(prev => {
            if (style === null) {
                const next = { ...prev };
                delete next[chain];
                return next;
            }
            return { ...prev, [chain]: style };
        });
    }, []);

    // Custom Residue Styles
    const [customStyles, setCustomStyles] = useState<CustomStyleRule[]>([]);

    // Custom Transparency
    const [customTransparency, setCustomTransparency] = useState<CustomTransparencyRule[]>([]);

    const [assignmentPayload] = useState<import('../types').AssignmentPayload | undefined>(initialState.assignmentPayload);

    // -- Handlers --

    const handleResetView = useCallback(() => {
        setResetKey(prev => prev + 1);
    }, []);

    const handleUpload = useCallback((uploadedFile: File, isCif?: boolean, preservePdbId?: boolean) => {
        setFile(uploadedFile);
        // Detect type from extension
        const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
        if (isCif || ext === 'cif' || ext === 'bcif') setFileType('mmcif');
        else if (['sdf', 'mol', 'mol2'].includes(ext || '')) setFileType(ext as any);
        else setFileType('pdb');
        if (!preservePdbId) {
            setPdbId('');
            // Only switch to url if not preserving. Actually handleUpload usually implies local file so 'url' mode is confusing naming but acceptable?
            // Actually 'url' source is usually used for URL-loaded files. 
            // If user uploads from disk, we might want a new source 'file'? 
            // But preserving existing logic: App used `setDataSource('pdb')` or similar?
            // Let's stick to 'url' or leave dataSource as is if we don't care.
            // App logic: `setDataSource` wasn't explicitly called in handleUpload but usually implied?
            // Wait, App logic (Step 7635) didn't touch dataSource in handleUpload.
            // But `handleUpload` clears `pdbId` unless preserved.
        }

        // Reset analysis data
        setChains([]);
        setLigands([]);
        setMeasurements([]);
        setHighlightedResidue(null);
        // Set Title
        const filenameTitle = uploadedFile.name.replace(/\.[^/.]+$/, "");
        setProteinTitle(filenameTitle);

        // Basic chemical title extraction
        const fileExt = uploadedFile.name.split('.').pop()?.toLowerCase();
        if (fileExt === 'sdf' || fileExt === 'mol') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                if (content) {
                    const match = content.match(/>\s*<PUBCHEM_IUPAC_NAME>\s*\n(.*?)\n/i);
                    if (match && match[1]) setProteinTitle(match[1].trim());
                    else {
                        const firstLine = content.split('\n')[0].trim();
                        if (firstLine.length > 0 && firstLine.length < 150) setProteinTitle(firstLine);
                    }
                }
            };
            reader.readAsText(uploadedFile);
        }
    }, []);

    const addOverlay = useCallback((structure: SuperposedStructure) => {
        setOverlays(prev => [...prev, structure]);
    }, []);

    const removeOverlay = useCallback((id: string) => {
        setOverlays(prev => prev.filter(o => o.id !== id));
    }, []);

    const toggleOverlay = useCallback((id: string) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, isVisible: !o.isVisible } : o));
    }, []);

    return {
        pdbId, setPdbId,
        dataSource, setDataSource,
        file, setFile,
        fileType,
        representation, setRepresentation,
        coloring, setColoring,
        customColors, setCustomColors,
        chainStyles, setChainStyle,
        customStyles, setCustomStyles,
        customTransparency, setCustomTransparency,
        isSpinning, setIsSpinning,
        isRocking, setIsRocking,
        showSurface, setShowSurface,
        showLigands, setShowLigands,
        showIons,
        setShowIons,
        smoothSheetEnabled,
        setSmoothSheetEnabled,

        customBackgroundColor, setCustomBackgroundColor,
        chains, setChains,
        ligands, setLigands,
        pdbMetadata, setPdbMetadata,
        proteinTitle, setProteinTitle,
        highlightedResidue, setHighlightedResidue,
        measurements, setMeasurements,

        isMeasurementPanelOpen, setIsMeasurementPanelOpen,
        overlays, setOverlays, addOverlay, removeOverlay, toggleOverlay,
        handleUpload,
        handleResetView,
        resetKey,
        assignmentPayload
    };
};
