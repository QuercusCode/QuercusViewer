


export interface UniProtFeature {
    type: string;
    description: string;
    start: number;
    end: number;
    chain?: string;
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


export type RepresentationType = 'cartoon' | 'licorice' | 'backbone' | 'spacefill' | 'surface' | 'ribbon' | 'ball+stick' | 'line';
export type ColoringType = 'chainid' | 'residue' | 'secondary' | 'hydrophobicity' | 'structure' | 'bfactor' | 'charge' | 'residueindex' | 'element' | 'custom';
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
