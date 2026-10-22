import { useState, useCallback } from 'react';
import type { RepresentationType, ColoringType, ResidueInfo, Measurement, ResidueInteraction, PDBMetadata, ChainInfo, CustomColorRule, CustomStyleRule, CustomTransparencyRule, SuperposedStructure, NucleicResidueRule, RadiusSourceType, SurfaceAlgorithm, MappedUniProtFeature, RelatedPdbEntry } from '../types';
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
    // Per-ligand/ion styling — keyed by PDB chemical component code (e.g.
    // "HEM"), mirroring chainStyles but scoped to bound chemicals instead of
    // chains, since ligands are only tracked by a flat code list, not chain
    // membership.
    ligandStyles: Record<string, RepresentationType>;
    setLigandStyle: (code: string, style: RepresentationType | null) => void;
    ligandColors: Record<string, string>;
    setLigandColor: (code: string, color: string | null) => void;
    resetLigandOverrides: () => void;
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
    showWaters: boolean;
    setShowWaters: (show: boolean | ((prev: boolean) => boolean)) => void;
    chainVisibility: Record<string, boolean>;
    setChainVisibility: (chain: string, visible: boolean) => void;
    resetChainVisibility: () => void;

    // Advanced Style (PyMOL-style radius source / surface rendering)
    radiusType?: RadiusSourceType;
    setRadiusType: (type: RadiusSourceType | undefined) => void;
    radiusScale: number;
    setRadiusScale: (scale: number) => void;
    surfaceWireframe: boolean;
    setSurfaceWireframe: (wireframe: boolean) => void;
    surfaceType?: SurfaceAlgorithm;
    setSurfaceType: (type: SurfaceAlgorithm | undefined) => void;

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
    uniprotFeatures: Record<string, MappedUniProtFeature[]> | null;
    setUniprotFeatures: (features: Record<string, MappedUniProtFeature[]> | null) => void;
    relatedStructures: RelatedPdbEntry[] | null;
    setRelatedStructures: (entries: RelatedPdbEntry[] | null) => void;

    // Interaction
    highlightedResidue: ResidueInfo | null;
    setHighlightedResidue: (res: ResidueInfo | null) => void;
    measurements: Measurement[];
    setMeasurements: (measurements: Measurement[] | ((prev: Measurement[]) => Measurement[])) => void;
    isMeasurementPanelOpen: boolean;
    setIsMeasurementPanelOpen: (isOpen: boolean | ((prev: boolean) => boolean)) => void;
    residueInteractions: ResidueInteraction[];
    setResidueInteractions: (interactions: ResidueInteraction[] | ((prev: ResidueInteraction[]) => ResidueInteraction[])) => void;

    // Superposition
    overlays: SuperposedStructure[];
    setOverlays: React.Dispatch<React.SetStateAction<SuperposedStructure[]>>;
    addOverlay: (structure: SuperposedStructure) => void;
    removeOverlay: (id: string) => void;
    toggleOverlay: (id: string) => void;

    smoothSheetEnabled: boolean;
    setSmoothSheetEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;

    // Nucleic Acid Independent Controls
    nucleicBackboneStyle: string;
    setNucleicBackboneStyle: (s: string) => void;
    nucleicBackboneColor: ColoringType | undefined;
    setNucleicBackboneColor: (c: ColoringType | undefined) => void;
    nucleicBaseStyle: string;
    setNucleicBaseStyle: (s: string) => void;
    nucleicBaseColor: ColoringType | undefined;
    setNucleicBaseColor: (c: ColoringType | undefined) => void;
    nucleicBackboneOpacity: number;
    setNucleicBackboneOpacity: (v: number) => void;
    nucleicBaseOpacity: number;
    setNucleicBaseOpacity: (v: number) => void;
    nucleicResidueRules: NucleicResidueRule[];
    setNucleicResidueRules: (rules: NucleicResidueRule[] | ((prev: NucleicResidueRule[]) => NucleicResidueRule[])) => void;

    // Actions
    handleUpload: (file: File, isCif?: boolean, preservePdbId?: boolean) => void;
    handleResetView: () => void;
    resetKey: number; // Used to trigger re-renders/resets in the viewer
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
    const [showWaters, setShowWaters] = useState(false);
    const [smoothSheetEnabled, setSmoothSheetEnabled] = useState(initialState.smoothSheetEnabled ?? false);

    const [nucleicBackboneStyle, setNucleicBackboneStyle] = useState<string>('tube');
    const [nucleicBackboneColor, setNucleicBackboneColor] = useState<ColoringType | undefined>(undefined);
    const [nucleicBaseStyle, setNucleicBaseStyle] = useState<string>('licorice');
    const [nucleicBaseColor, setNucleicBaseColor] = useState<ColoringType | undefined>(undefined);
    const [nucleicBackboneOpacity, setNucleicBackboneOpacity] = useState(100);
    const [nucleicBaseOpacity, setNucleicBaseOpacity] = useState(100);
    const [nucleicResidueRules, setNucleicResidueRules] = useState<NucleicResidueRule[]>([]);

    const [customBackgroundColor, setCustomBackgroundColor] = useState<string | null>(null);
    // Analysis
    const [chains, setChains] = useState<ChainInfo[]>([]);
    const [ligands, setLigands] = useState<string[]>([]);
    const [pdbMetadata, setPdbMetadata] = useState<PDBMetadata | null>(null);
    const [proteinTitle, setProteinTitle] = useState<string | null>(null);
    const [uniprotFeatures, setUniprotFeatures] = useState<Record<string, MappedUniProtFeature[]> | null>(null);
    const [relatedStructures, setRelatedStructures] = useState<RelatedPdbEntry[] | null>(null);

    // Interaction
    const [highlightedResidue, setHighlightedResidue] = useState<ResidueInfo | null>(null);
    const [measurements, setMeasurements] = useState<Measurement[]>([]);

    const [isMeasurementPanelOpen, setIsMeasurementPanelOpen] = useState(false);
    const [residueInteractions, setResidueInteractions] = useState<ResidueInteraction[]>([]);

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

    // Chain Visibility (isolation)
    const [chainVisibility, setChainVisibilityState] = useState<Record<string, boolean>>({});

    const setChainVisibility = useCallback((chain: string, visible: boolean) => {
        setChainVisibilityState(prev => {
            if (visible) {
                const next = { ...prev };
                delete next[chain]; // default = visible; no need to store `true`
                return next;
            }
            return { ...prev, [chain]: false };
        });
    }, []);

    const resetChainVisibility = useCallback(() => {
        setChainVisibilityState({});
    }, []);

    // Ligand/Ion Styling — per-chemical-code style + color override.
    const [ligandStyles, setLigandStyles] = useState<Record<string, RepresentationType>>({});

    const setLigandStyle = useCallback((code: string, style: RepresentationType | null) => {
        setLigandStyles(prev => {
            if (style === null) {
                const next = { ...prev };
                delete next[code];
                return next;
            }
            return { ...prev, [code]: style };
        });
    }, []);

    const [ligandColors, setLigandColorsState] = useState<Record<string, string>>({});

    const setLigandColor = useCallback((code: string, color: string | null) => {
        setLigandColorsState(prev => {
            if (color === null) {
                const next = { ...prev };
                delete next[code];
                return next;
            }
            return { ...prev, [code]: color };
        });
    }, []);

    const resetLigandOverrides = useCallback(() => {
        setLigandStyles({});
        setLigandColorsState({});
    }, []);

    // Advanced Style (PyMOL-style radius source / surface rendering).
    // radiusType/surfaceType default to undefined so nothing is passed to NGL
    // unless the user explicitly opts in — current visuals stay unchanged.
    const [radiusType, setRadiusType] = useState<RadiusSourceType | undefined>(initialState.radiusType);
    const [radiusScale, setRadiusScale] = useState<number>(initialState.radiusScale ?? 1.0);
    const [surfaceWireframe, setSurfaceWireframe] = useState<boolean>(initialState.surfaceWireframe ?? false);
    const [surfaceType, setSurfaceType] = useState<SurfaceAlgorithm | undefined>(initialState.surfaceType);

    // Custom Residue Styles
    const [customStyles, setCustomStyles] = useState<CustomStyleRule[]>([]);

    // Custom Transparency
    const [customTransparency, setCustomTransparency] = useState<CustomTransparencyRule[]>([]);

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
        resetChainVisibility();
        resetLigandOverrides();
        setMeasurements([]);
        setResidueInteractions([]);
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
    }, [resetChainVisibility, resetLigandOverrides]);

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
        ligandStyles, setLigandStyle,
        ligandColors, setLigandColor,
        resetLigandOverrides,
        customStyles, setCustomStyles,
        customTransparency, setCustomTransparency,
        isSpinning, setIsSpinning,
        isRocking, setIsRocking,
        showSurface, setShowSurface,
        showLigands, setShowLigands,
        showIons,
        setShowIons,
        showWaters,
        setShowWaters,
        chainVisibility,
        setChainVisibility,
        resetChainVisibility,
        radiusType, setRadiusType,
        radiusScale, setRadiusScale,
        surfaceWireframe, setSurfaceWireframe,
        surfaceType, setSurfaceType,
        smoothSheetEnabled,
        setSmoothSheetEnabled,

        nucleicBackboneStyle, setNucleicBackboneStyle,
        nucleicBackboneColor, setNucleicBackboneColor,
        nucleicBaseStyle, setNucleicBaseStyle,
        nucleicBaseColor, setNucleicBaseColor,
        nucleicBackboneOpacity, setNucleicBackboneOpacity,
        nucleicBaseOpacity, setNucleicBaseOpacity,
        nucleicResidueRules, setNucleicResidueRules,

        customBackgroundColor, setCustomBackgroundColor,
        chains, setChains,
        ligands, setLigands,
        pdbMetadata, setPdbMetadata,
        proteinTitle, setProteinTitle,
        uniprotFeatures, setUniprotFeatures,
        relatedStructures, setRelatedStructures,
        highlightedResidue, setHighlightedResidue,
        measurements, setMeasurements,

        isMeasurementPanelOpen, setIsMeasurementPanelOpen,
        residueInteractions, setResidueInteractions,
        overlays, setOverlays, addOverlay, removeOverlay, toggleOverlay,
        handleUpload,
        handleResetView,
        resetKey
    };
};
