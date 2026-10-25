


// A UniProt functional annotation (domain, active site, binding site, etc.)
// with its UniProt-numbered range already converted to PDB author residue
// numbering for a specific chain, via SIFTS (see src/services/siftsMapping.ts).
export interface MappedUniProtFeature {
    type: string;
    description: string;
    pdbStart: number;
    pdbEnd: number;
    accession: string;
}

// Another PDB entry sharing a UniProt accession with the loaded structure
// (e.g. a different crystal form, mutant, or ligand-bound state of the same
// protein) — via UniProt's own PDB cross-references, not a structural
// similarity search.
export interface RelatedPdbEntry {
    id: string;
    method?: string;
    resolution?: string;
    chains?: string;
}

export interface CustomColorRule {
    selection: string;
    color: string;
    representation?: RepresentationType;
}

export interface CustomStyleRule {
    id: string; // unique ID for deletion
    chain: string;
    residues: string; // e.g. "50-60"
    style: RepresentationType;
}

export interface CustomTransparencyRule {
    id: string;
    chain: string;
    residues?: string; // e.g. "50-60", optional
    opacity: number; // 0.0 to 1.0
    // When set, this rule targets a bound ligand/ion by its PDB chemical
    // component code (e.g. "HEM") instead of chain/residues — rendered as
    // its own independent pass, same as ligandStyles/ligandColors.
    ligandCode?: string;
}

export interface NucleicResidueRule {
    id: string;
    chain: string;
    residues: string;
    baseStyle?: string;
    baseColor?: string;
    backboneStyle?: string;
    backboneColor?: string;
}

export interface NucleicResidueRule {
    id: string;
    chain: string;
    residues: string;
    baseStyle?: string;
    baseColor?: string;
    backboneStyle?: string;
    backboneColor?: string;
}

export interface AtomInfo {
    serial: number;
    name: string;
    element: string;
    resNo: number; // In case we have a few residues
    chain: string;
}

export interface ChainInfo {
    name: string;
    min: number;
    max: number;
    sequence: string;
    residueMap?: number[]; // Added: Maps sequence index to actual PDB residue number
    type?: 'protein' | 'nucleic' | 'unknown'; // Added: To distinguish polymer type
    atoms?: AtomInfo[]; // Added: For small chemicals, list atoms directly
    bFactors?: number[]; // Added: Per-residue B-factor for coloring sync
    coords?: { x: number; y: number; z: number }[]; // Added: C-alpha/P coordinates for RMSD
}

export interface StructureInfo {
    chains: ChainInfo[];
    ligands: string[];
    isSmallMolecule?: boolean;
}

export interface Snapshot {
    id: string;
    url: string;
    timestamp: number;
    description?: string;
    resolutionFactor?: number;
    transparent?: boolean;
    pdbId?: string;
}

export interface Movie {
    id: string;
    url: string; // Blob URL
    blob: Blob;
    timestamp: number;
    duration: number; // in seconds
    format: string; // 'webm' or 'mp4'
    pdbId?: string;
    customBackgroundColor?: string | null;
    description?: string;
}

export interface SuperposedStructure {
    id: string;
    pdbId?: string;
    file?: File;
    color: string;
    description?: string;
    isVisible: boolean;
    opacity?: number;
    representation?: RepresentationType; // Defaults to 'cartoon' when unset
    chains?: ChainInfo[]; // Added for Sequence Alignment
    ligands?: string[]; // Bound ligand/ion codes on this overlay, for ligand-mode style/color/transparency editing
    superpositionFailed?: boolean; // True if automatic 3D alignment onto the main structure failed — it's shown in its original, unfitted orientation, and any RMSD computed against it is not meaningful.

    // When both set, restricts the 3D superposition fit to this specific
    // chain pair (this overlay's chain onto this main-structure chain)
    // instead of the default whole-structure, sequence-alignment-guided fit
    // across all chains — useful when chain IDs don't correspond 1:1
    // between the two structures, or to compare a single domain/subunit.
    alignOverlayChain?: string;
    alignMainChain?: string;

    // When 'difference', the renderer colors this overlay's
    // residueDeviationChain by per-residue structural deviation (green/low
    // -> red/high) instead of the flat `color` above; 'custom' (default)
    // keeps the normal flat color.
    colorMode?: 'custom' | 'difference';
    // Per-residue structural deviation (Å) from the main structure's aligned
    // residue, computed once when "Color by Deviation" is turned on for this
    // overlay — keyed by this overlay's PDB residue number on
    // residueDeviationChain.
    residueDeviations?: Record<number, number>;
    residueDeviationChain?: string;

    // Full per-structure styling, mirroring the main structure's own
    // Advanced Styles / Advanced Colors / Transparency system so an overlay
    // can be customized the exact same way (by chain, by residue range, or
    // by bound ligand/ion code) instead of only a single flat representation
    // + color + opacity.
    customColors?: CustomColorRule[];
    chainStyles?: Record<string, RepresentationType>;
    customStyles?: CustomStyleRule[];
    customTransparency?: CustomTransparencyRule[];
    ligandStyles?: Record<string, RepresentationType>;
    ligandColors?: Record<string, string>;
}



export interface ResidueInfo {
    chain: string;
    resNo: number;
    resName: string;
    atomIndex?: number;
    atomName?: string;   // Added
    atomSerial?: number; // Added
    element?: string;    // Added
    position?: { x: number; y: number; z: number };
}


export type RepresentationType =
    | 'cartoon'
    | 'ribbon'
    | 'ball+stick'
    | 'spacefill'
    | 'surface'
    | 'line'
    | 'backbone'
    | 'licorice'
    | 'trace'
    | 'tube'
    | 'rope'
    | 'rocket'
    | 'point'
    | 'hyperball';

// Radius source for structure representations (NGL's native radiusType param).
// 'bfactor' gives a PyMOL "putty"-style flexibility visualization.
export type RadiusSourceType = 'vdw' | 'covalent' | 'bfactor' | 'sstruc' | 'size';

// NGL surface algorithm variants (PyMOL's surface taxonomy: vws/sas/ms/ses/av)
export type SurfaceAlgorithm = 'vws' | 'sas' | 'ms' | 'ses' | 'av';
export type ColoringType = 'chainid' | 'residue' | 'secondary' | 'hydrophobicity' | 'structure' | 'bfactor' | 'electrostatic' | 'residueindex' | 'element' | 'custom';
export type ColorPalette = 'standard' | 'viridis' | 'magma' | 'cividis' | 'plasma';




export type MeasurementTextColor = 'auto' | string;


export interface PDBMetadata {
    method: string;
    resolution: string;
    organism: string;
    depositionDate: string;
    title?: string;
    formula?: string; // Chemical Formula
    molecularWeight?: number; // Molecular Weight
    cid?: string; // PubChem CID for 2D Image
}

// Chemical identity of a bound ligand/ion, looked up by its PDB Chemical
// Component Dictionary code (the same code already in StructureInfo.ligands)
// — not tied to a specific bound instance, since the same code means the
// same chemical everywhere.
export interface LigandChemicalInfo {
    name?: string;
    formula?: string;
    molecularWeight?: number;
    smiles?: string;
}

export interface LigandInteraction {
    ligandName: string;
    ligandChain: string;
    ligandResNo: number;
    contacts: {
        residueChain: string;
        residueNumber: number;
        residueSeq?: number; // 1-based sequential index
        residueName: string;
        distance: number;
        type?: string;
    }[];
}

export interface Measurement {
    id: string;
    name: string;
    distance: number;
    color: string;
    atom1: ResidueInfo;
    atom2: ResidueInfo;
}

export interface AtomContact {
    atom1Name: string;
    atom1Index: number;
    atom2Name: string;
    atom2Index: number;
    distance: number;
}

// All close atom-pair contacts between two residues (picked by clicking each in
// Interaction Mode), plus a heuristic overall classification (salt bridge,
// hydrophobic contact, etc. — from getInteractionType) for the pair as a whole.
export interface ResidueInteraction {
    id: string;
    residue1: ResidueInfo;
    residue2: ResidueInfo;
    minDistance: number;
    interactionType: string | null;
    interactionColor: string | null;
    contacts: AtomContact[]; // sorted by distance ascending, within the contact cutoff
}

export interface Annotation {
    id: string; // UUID
    residue: ResidueInfo;
    text: string;
    position: { x: number, y: number, z: number }; // 3D coordinates
    author?: string; // Optional author name
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type: 'text' | 'system' | 'link';
}

export interface RecordedEvent {
    timestamp: number; // Delta from start
    type: 'state' | 'camera' | 'annotation' | 'chat';
    payload: any;
}

export interface AudioClip {
    id: string;
    trackId: string; // Reference to audioTrack (or sfxTrack)
    name: string;
    startTime: number; // Global timeline start
    duration: number; // Duration on timeline
    sourceStartTime: number; // Offset into the source audio
    type: 'music' | 'sfx';
    data?: string; // Optional direct data storage (Data URL)
}

export interface RecordedSession {
    id: string;
    version: number;
    metadata: {
        title: string;
        author: string;
        date: string;
        duration: number;
        description?: string;
        thumbnail?: string; // Data URL
        watermarkText?: string; // Custom watermark text
        watermarkLogo?: string; // Custom watermark image
        audioTrack?: {
            id: string;
            name: string;
            data: string; // Base64 Data URL
            type: 'music' | 'voiceover';
        };
        sfxTrack?: {
            id: string;
            name: string;
            data: string;
            type: 'sfx';
        };
        audioClips?: AudioClip[]; // Array of audio clips on timeline
        textOverlays?: {
            id: string;
            text: string;
            start: number; // Global time
            end: number;
            x: number; // 0-1 relative
            y: number; // 0-1 relative
        }[];
        settings?: {
            showCursor?: boolean;
            showWatermark?: boolean;
            watermarkText?: string; // Moved/Duplicated for clarity in storage? No, kept in metadata root, but position here?
            watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
            watermarkImage?: string; // Data URL for logo
            exportQuality?: 'low' | 'medium' | 'high';
            exportFormat?: 'webm' | 'mp4' | 'gif';
            fps?: 24 | 30 | 60;
            aspectRatio?: '16:9' | '9:16' | '1:1';
            backgroundColor?: string;
            ssao?: boolean;
            resolutionScale?: 1 | 2;
        };
    };
    initialState: any; // Full SessionState
    events: RecordedEvent[];
}

export interface TimelineSegment {
    id: string;
    sessionId: string; // ID of the source session
    startTime: number; // Global timeline position (ms)
    duration: number; // Duration of this segment (ms)
    sourceStartTime: number; // Start time within source recording (ms)
    color?: string; // Optional color for visual distinction
    transition?: {
        type: 'fade';
        duration: number; // ms
    };
}

export interface ProjectState {
    id: string;
    duration: number; // Total project duration
    segments: TimelineSegment[];
    sources: Record<string, RecordedSession>; // Map of source sessions by ID
}

export interface NotebookEntry {
    id: string;
    user_id: string;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
}

export interface AssignmentPayload {
    question: string;
    successMessage: string;
    targetChain: string;
    targetResNo: number;
    targetAtomName?: string;
}

export interface SlideQuiz {
    question: string;
    options: string[];
    correctIndex: number;
}

export interface SlideAnnotation {
    id: string;
    text: string;
    x: number;
    y: number;
    color: string;
}

export interface StoryboardSlide {
    id: string;
    title: string;
    description: string;
    cameraOrientation?: any;
    representation?: RepresentationType;
    coloring?: ColoringType;
    customColors?: CustomColorRule[];
    selectedResidue?: any;
    showSurface?: boolean;
    showLigands?: boolean;
    screenshot?: string;
    quiz?: SlideQuiz;
    annotations?: SlideAnnotation[];
    speakerNotes?: string;
    audioNarration?: string;
    transitionDurationMs?: number;
    loadAction?: string;
}

export interface StoryboardPayload {
    title: string;
    slides: StoryboardSlide[];
    autoPlaySeconds?: number;
}
