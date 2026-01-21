import React, { useRef, useState, useEffect } from 'react';
import { Skeleton } from './Skeleton';
import { GalleryModal } from './GalleryModal';
import { MeasurementTable } from './MeasurementTable';
import {
    Activity,
    BookOpen,
    Camera,
    ChevronDown,
    Clock,
    Download,
    Eye,
    Grid3X3,
    HelpCircle,
    Hexagon,
    ImageIcon,
    Layers,
    Loader2,
    Menu,
    Minimize,
    Moon,
    Plus,
    Redo2,
    RefreshCw,
    RotateCcw,
    Ruler,
    ScanSearch,
    Search,
    Share2,
    Star,
    Sun,
    Trash2,
    Undo2,
    Upload,
    Video,
    Wrench,
    X
} from 'lucide-react';
import type { RepresentationType, ColoringType, ChainInfo, Snapshot, Movie, ColorPalette, PDBMetadata, CustomColorRule, Measurement } from '../types';
import type { DataSource } from '../utils/pdbUtils';
import type { HistoryItem } from '../hooks/useHistory';
import { formatChemicalId } from '../utils/pdbUtils';
import { findMotifs } from '../utils/searchUtils';
import type { MotifMatch } from '../utils/searchUtils';
import { MOTIF_LIBRARY } from '../data/motifLibrary';

// Reusable Sidebar Section Component - Defined outside to prevent re-renders losing focus
const SidebarSection = ({ title, icon: Icon, children, isOpen, onToggle, isLightMode, id }: { title: string, icon: any, children: React.ReactNode, isOpen: boolean, onToggle: () => void, isLightMode: boolean, id?: string }) => {
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && sectionRef.current) {
            // Timeout to match transition duration (300ms) or allow render
            setTimeout(() => {
                sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [isOpen]);

    return (
        <div ref={sectionRef} id={id} className={`rounded-xl overflow-hidden transition-colors ${isLightMode
            ? 'border border-neutral-900 bg-white'
            : 'border border-white/10 bg-black/20'
            }`}>
            <button
                onClick={onToggle}
                className={`w-full flex items-center justify-between p-3 text-xs font-bold uppercase tracking-wider transition-colors ${isLightMode
                    ? (isOpen ? 'bg-neutral-100 text-black' : 'hover:bg-neutral-50 text-neutral-900 hover:text-black')
                    : (isOpen ? 'bg-white/5 text-blue-400' : 'hover:bg-white/5 text-neutral-400')
                    }`}
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {title}
                </div>
                <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3 h-3" />
                </div>
            </button>
            {isOpen && (
                <div className={`p-3 space-y-3 border-t ${isLightMode ? 'border-neutral-900' : 'border-white/5'}`}>
                    {children}
                </div>
            )}
        </div>
    );
};

// Clean Structure Image Modal Component
const StructureImageModal = ({ cid }: { cid: string }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            {/* Thumbnail */}
            <div className="mt-1">
                <div
                    onClick={() => setIsModalOpen(true)}
                    className="bg-white p-3 rounded-sm border border-neutral-200 hover:border-blue-400 cursor-pointer transition-all flex justify-center items-center min-h-[120px] group"
                >
                    <img
                        src={`https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`}
                        alt="2D Structure"
                        className="max-h-[100px] w-auto object-contain mix-blend-multiply"
                    />
                </div>
                <div className="text-[8px] text-center text-neutral-400 mt-1">
                    Click to enlarge
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold">2D Chemical Structure</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-neutral-500 hover:text-black transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-white p-4 rounded border border-neutral-200 flex justify-center">
                            <img
                                src={`https://pubchem.ncbi.nlm.nih.gov/image/imgsrv.fcgi?cid=${cid}&t=l`}
                                alt="2D Structure (Large View)"
                                className="max-w-full h-auto"
                            />
                        </div>

                        <div className="mt-4 flex justify-center">
                            <a
                                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                                View on PubChem →
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// Chemical Properties Panel Component
const ChemicalPropertiesPanel = ({ cid, isLightMode, cardBg, subtleText }: { cid: string; isLightMode: boolean; cardBg: string; subtleText: string }) => {
    const [properties, setProperties] = useState<{
        smiles?: string;
        xLogP?: number;
        hBondDonorCount?: number;
        hBondAcceptorCount?: number;
        rotatableBondCount?: number;
        heavyAtomCount?: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            try {
                const res = await fetch(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/IsomericSMILES,XLogP,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,HeavyAtomCount/JSON`);
                if (res.ok) {
                    const data = await res.json();
                    const props = data.PropertyTable?.Properties?.[0];
                    if (props) {
                        setProperties({
                            smiles: props.IsomericSMILES,
                            xLogP: props.XLogP,
                            hBondDonorCount: props.HBondDonorCount,
                            hBondAcceptorCount: props.HBondAcceptorCount,
                            rotatableBondCount: props.RotatableBondCount,
                            heavyAtomCount: props.HeavyAtomCount,
                        });
                    }
                }
            } catch (e) {
                console.warn('Failed to fetch chemical properties', e);
            } finally {
                setLoading(false);
            }
        };
        fetchProperties();
    }, [cid]);

    return (
        <div className={`col-span-2 rounded-lg border ${cardBg} overflow-hidden`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:opacity-80 transition-all"
            >
                <span className="text-xs font-medium">Chemical Properties</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                    {loading ? (
                        <div className="space-y-2 py-2">
                            <Skeleton variant="text" className="h-3 w-1/3 bg-neutral-700/50" />
                            <Skeleton variant="text" className="h-4 w-full bg-neutral-800/50" />
                            <div className="pt-1 space-y-1">
                                <Skeleton variant="text" className="h-3 w-1/4 bg-neutral-700/50" />
                                <div className="grid grid-cols-3 gap-2">
                                    <Skeleton variant="rounded" className="h-8 bg-neutral-800/50" />
                                    <Skeleton variant="rounded" className="h-8 bg-neutral-800/50" />
                                    <Skeleton variant="rounded" className="h-8 bg-neutral-800/50" />
                                </div>
                            </div>
                        </div>
                    ) : properties ? (
                        <>
                            {properties.smiles && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>SMILES</div>
                                    <div className={`text-[10px] font-mono break-all ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.smiles}
                                    </div>
                                </div>
                            )}
                            {properties.xLogP !== undefined && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>XLogP</div>
                                    <div className={`text-[10px] ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.xLogP.toFixed(2)} (Lipophilicity)
                                    </div>
                                </div>
                            )}
                            {properties.hBondDonorCount !== undefined && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>H-Bond Donors</div>
                                    <div className={`text-[10px] ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.hBondDonorCount}
                                    </div>
                                </div>
                            )}
                            {properties.hBondAcceptorCount !== undefined && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>H-Bond Acceptors</div>
                                    <div className={`text-[10px] ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.hBondAcceptorCount}
                                    </div>
                                </div>
                            )}
                            {properties.rotatableBondCount !== undefined && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>Rotatable Bonds</div>
                                    <div className={`text-[10px] ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.rotatableBondCount}
                                    </div>
                                </div>
                            )}
                            {properties.heavyAtomCount && (
                                <div>
                                    <div className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>Heavy Atoms</div>
                                    <div className={`text-[10px] ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                        {properties.heavyAtomCount} atoms
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={`text-[10px] italic ${subtleText}`}>No properties available</div>
                    )}
                </div>
            )}
        </div>
    );
};

interface ControlsProps {
    pdbId: string;
    setPdbId: (id: string) => void;
    dataSource: DataSource;
    setDataSource: (source: DataSource) => void;
    isChemical?: boolean; // New prop for chemical handling
    onUpload: (file: File, isCif?: boolean) => void;
    representation: RepresentationType;
    setRepresentation: (type: RepresentationType) => void;
    coloring: ColoringType;
    setColoring: (type: ColoringType) => void;
    onResetView: () => void;
    chains: ChainInfo[];
    ligands: string[];

    isMeasurementMode: boolean;
    setIsMeasurementMode: (mode: boolean) => void;
    isPublicationMode: boolean;
    onTogglePublicationMode: () => void;
    onShare: () => void;
    onToggleMeasurement?: () => void;
    measurements: Measurement[]; // Use imported Measurement type
    onDeleteMeasurement: (id: string) => void;
    onClearMeasurements: () => void;
    isSharedSession: boolean; // Added prop
    onOpenSuperposition?: () => void;
    pdbMetadata: PDBMetadata | null;


    isLightMode: boolean;
    setIsLightMode: (mode: boolean) => void;
    highlightedResidue: { chain: string; resNo: number; resName?: string } | null;
    onResidueClick: (chain: string, resNo: number, resName?: string) => void;
    // onToggleAISidebar: () => void;
    // isAISidebarOpen: boolean;
    onToggleLibrary: () => void;
    showSurface: boolean;
    setShowSurface: (show: boolean) => void;
    showLigands: boolean;
    setShowLigands: (show: boolean) => void;
    onFocusLigands: () => void;
    onRecordMovie: (duration: number) => void;
    isRecording: boolean;
    proteinTitle: string | null;
    snapshots: Snapshot[];
    onSnapshot: (resolutionFactor: number, transparent: boolean) => void;
    onDownloadSnapshot: (id: string) => void;
    onDeleteSnapshot: (id: string) => void;
    isSpinning: boolean;
    setIsSpinning: (spinning: boolean) => void;

    isCleanMode: boolean;
    setIsCleanMode: (clean: boolean) => void;
    onSaveSession: () => void;
    onLoadSession: (file: File) => void;
    onToggleContactMap: () => void;
    onTakeSnapshot: () => void; // Opens the unified snapshot modal
    movies: Movie[];
    onDownloadMovie: (id: string) => void;
    onDeleteMovie: (id: string) => void;
    colorPalette: ColorPalette;
    setColorPalette: (palette: ColorPalette) => void;
    isDyslexicFont: boolean;
    setIsDyslexicFont: (isDyslexic: boolean) => void;
    // Mobile
    onToggleShare: () => void;
    customBackgroundColor?: string | null;
    setCustomBackgroundColor?: (color: string | null) => void;
    onHighlightRegion?: (selection: string, label: string) => void;
    onDownloadPDB: () => void;
    onDownloadSequence: () => void;
    showIons?: boolean;
    setShowIons?: (show: boolean) => void;
    onStartTour?: () => void;

    // History
    history?: HistoryItem[];

    // UI State Lifted Info
    openSections?: Record<string, boolean>;
    onToggleSection?: (section: string) => void;
    isMobileSidebarOpen?: boolean;
    onToggleMobileSidebar?: () => void;

    // Favorites
    onToggleFavorite?: () => void;
    isFavorite?: boolean;
    onOpenFavorites?: () => void;
    onOpenHistory?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;

    // Multi-View Mode
    viewMode?: 'single' | 'dual' | 'triple' | 'quad';
    onSetViewMode?: (mode: 'single' | 'dual' | 'triple' | 'quad') => void;

    // Custom Coloring
    customColors?: CustomColorRule[];
    setCustomColors?: (colors: CustomColorRule[] | ((prev: CustomColorRule[]) => CustomColorRule[])) => void;

    recorderContent?: React.ReactNode;
}

export const Controls: React.FC<ControlsProps> = ({
    pdbId,
    setPdbId,
    dataSource,
    setDataSource,
    isChemical = false,
    viewMode = 'single',
    onSetViewMode,
    onUpload,
    representation,
    setRepresentation,
    coloring,
    setColoring,
    onResetView,
    chains,
    ligands,

    isMeasurementMode,
    setIsMeasurementMode,
    onToggleMeasurement,
    onClearMeasurements,
    isSharedSession, // Destructure prop
    onOpenSuperposition,
    measurements,
    onDeleteMeasurement,
    isPublicationMode,
    onTogglePublicationMode,
    pdbMetadata,
    isLightMode,
    setIsLightMode,
    highlightedResidue,
    onResidueClick,
    showSurface,
    setShowSurface,
    showLigands,
    setShowLigands,
    showIons,
    setShowIons,
    onRecordMovie,
    isRecording,
    proteinTitle,
    snapshots,
    onDownloadSnapshot,
    onDeleteSnapshot,
    isSpinning,
    setIsSpinning,
    isCleanMode,
    setIsCleanMode,
    onSaveSession,
    onLoadSession,
    movies,
    onDownloadMovie,
    onDeleteMovie,
    onToggleContactMap,
    onTakeSnapshot,
    colorPalette,
    setColorPalette,
    isDyslexicFont,
    setIsDyslexicFont,
    // onToggleAISidebar,
    // isAISidebarOpen,
    onToggleLibrary,
    onToggleShare,
    customBackgroundColor,
    setCustomBackgroundColor,
    recorderContent, // Destructure prop
    onHighlightRegion,
    onDownloadPDB,
    onDownloadSequence,
    onStartTour,
    openSections: propOpenSections,
    onToggleSection,
    isMobileSidebarOpen = false,
    onToggleMobileSidebar,
    onToggleFavorite,
    isFavorite,
    onOpenFavorites,
    onOpenHistory,
    history = [],
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    // onUpdateResidueColor // Future: allow changing colors of existing residues
    customColors,
    setCustomColors
}) => {
    // Motif Search State
    const [searchPattern, setSearchPattern] = useState('');
    const [searchResults, setSearchResults] = useState<MotifMatch[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // State for Residue-Specific Coloring UI

    // State for Screenshot Modal



    const handleSearch = () => {
        setIsSearching(true);
        setTimeout(() => {
            const results = findMotifs(chains, searchPattern);
            setSearchResults(results);
            setIsSearching(false);
        }, 10);
    };

    const handleResultClick = (match: MotifMatch) => {
        if (onHighlightRegion) {
            let range = `${match.startResNo}`;
            if (match.startResNo !== match.endResNo) {
                range = `${match.startResNo}-${match.endResNo}`;
            }
            const selection = `:${match.chain} and ${range}`;
            onHighlightRegion(selection, `Motif: ${match.sequence}`);
        } else {
            // Fallback
            onResidueClick(match.chain, match.startResNo, match.sequence);
        }
    };


    const fileInputRef = useRef<HTMLInputElement>(null);
    const sessionInputRef = useRef<HTMLInputElement>(null);
    const [localPdbId, setLocalPdbId] = React.useState(pdbId);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false); // New state for Gallery

    // Recording State
    const [recordDuration, setRecordDuration] = useState(4000);

    // Custom Color State
    const [viewSequenceChain, setViewSequenceChain] = useState('');

    // Custom Color State
    const [customSelection, setCustomSelection] = useState('');
    const [customChain, setCustomChain] = useState('');
    const [customColorValue, setCustomColorValue] = useState('#ff0000');

    const handleAddCustomColor = () => {
        let selectionString = '';
        if (customChain) {
            selectionString = `:${customChain}`;
            if (customSelection) selectionString += ` and ${customSelection}`;
        } else {
            selectionString = customSelection;
        }

        if (selectionString && setCustomColors) {
            setCustomColors(prev => [...prev, {
                selection: selectionString,
                color: customColorValue
            }]);
            setCustomSelection('');
            setCustomChain('');
        }
    };

    const handleRemoveCustomColor = (index: number) => {
        if (!setCustomColors) return;
        setCustomColors(prev => prev.filter((_, i) => i !== index));
    };

    // Styles
    const cardBg = isLightMode ? 'bg-white' : 'bg-neutral-900';
    const subtleText = isLightMode ? 'text-neutral-950 font-medium' : 'text-neutral-400';
    const inputBg = isLightMode ? 'bg-white border-neutral-900 text-black focus:ring-black' : 'bg-neutral-800 border-neutral-700 text-white focus:ring-blue-500';



    // Accordion State - Use lifted state from props if available
    const openSections = propOpenSections || {
        'appearance': true,
        'analysis': false,
        'tools': false,
        'motif-search': false
    };

    const toggleSection = (section: string) => {
        if (onToggleSection) {
            onToggleSection(section);
        }
    };

    // Mobile Sidebar State
    // const [isOpen, setIsOpen] = useState(false);

    // Refs for scrolling
    const sequenceContainerRef = useRef<HTMLDivElement>(null);
    const residueRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

    // Update local input when prop changes (external change)
    useEffect(() => {
        setLocalPdbId(pdbId);
    }, [pdbId]);

    // Auto-scroll to highlighted residue
    useEffect(() => {
        if (highlightedResidue && residueRefs.current) {
            if (viewSequenceChain && viewSequenceChain !== highlightedResidue.chain) {
                setViewSequenceChain(highlightedResidue.chain);
            }

            const key = `${highlightedResidue.chain}-${highlightedResidue.resNo}`;
            const element = residueRefs.current.get(key);
            const container = sequenceContainerRef.current;

            if (element && container) {
                // Calculate position relative to container to avoid scrolling the whole page (mobile fix)
                const elementTop = element.offsetTop;
                const elementHeight = element.offsetHeight;
                const containerHeight = container.clientHeight;

                // Center the element
                container.scrollTo({
                    top: elementTop - (containerHeight / 2) + (elementHeight / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [highlightedResidue, viewSequenceChain]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPdbId(localPdbId);
    };




    // Clean Mode: Return only the exit button
    if (isCleanMode) {
        return (
            <button
                onClick={() => setIsCleanMode(false)}
                className={`absolute bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-transform hover:scale-110 ${isLightMode ? 'bg-white text-neutral-800' : 'bg-neutral-800 text-white'}`}
                title="Exit Presentation Mode"
            >
                <Minimize className="w-5 h-5" />
            </button>
        );
    }



    return (
        <>

            <button
                onClick={onToggleMobileSidebar}
                className={`absolute top-4 left-4 z-40 md:hidden p-2 rounded-lg backdrop-blur-md shadow-lg transition-opacity hover:opacity-80 border ${isLightMode ? 'bg-white border-neutral-900 text-black' : 'bg-neutral-900/90 border-white/10 text-white'}`}
            >
                <Menu className="w-6 h-6" />
            </button>

            <div className={`
                absolute top-0 left-0 z-50
                h-[100dvh] w-full sm:w-80 
                backdrop-blur-xl border-r shadow-2xl
                transition-transform duration-300 ease-in-out
                flex flex-col
                ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 md:h-full md:w-80 md:rounded-none md:z-10 md:shrink-0
                ${isLightMode ? 'bg-white border-neutral-900 shadow-none' : 'bg-neutral-900/80 border-white/10 md:bg-neutral-900 md:shadow-none'}
            `}>
                {/* Header - Fixed */}
                <div className="flex-none p-4 pb-2 relative">
                    <button
                        onClick={onToggleMobileSidebar}
                        className={`absolute top-4 right-4 p-1 md:hidden ${subtleText}`}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex flex-col gap-4 pt-8 md:pt-0">
                        <div className="flex flex-col items-center text-center w-full px-4">
                            <img
                                src={isLightMode ? `${import.meta.env.BASE_URL}logo/full-black.png` : `${import.meta.env.BASE_URL}logo/full-white.png`}
                                alt="Quercus Viewer"
                                className="h-20 w-auto mb-2 object-contain"
                            />
                            <p className={`text-xs ${subtleText} tracking-wider`}>Visualize 3D structures</p>
                        </div>

                        <div className="flex items-center justify-between w-full px-2 gap-2">
                            {/* Group 1: Visual History */}
                            {onUndo && onRedo && (
                                <div className={`flex items-center gap-0.5 rounded-lg p-0.5 border ${isLightMode ? 'bg-neutral-100 border-black/5' : 'bg-neutral-800 border-white/5'}`}>
                                    <button
                                        onClick={onUndo}
                                        disabled={!canUndo}
                                        className={`p-1.5 rounded-md transition-all ${!canUndo
                                            ? 'opacity-30 cursor-not-allowed'
                                            : `hover:bg-white hover:shadow-sm ${isLightMode ? 'text-neutral-600' : 'hover:bg-neutral-700 text-neutral-300'}`
                                            }`}
                                        title="Undo (Ctrl+Z)"
                                    >
                                        <Undo2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={onRedo}
                                        disabled={!canRedo}
                                        className={`p-1.5 rounded-md transition-all ${!canRedo
                                            ? 'opacity-30 cursor-not-allowed'
                                            : `hover:bg-white hover:shadow-sm ${isLightMode ? 'text-neutral-600' : 'hover:bg-neutral-700 text-neutral-300'}`
                                            }`}
                                        title="Redo (Ctrl+Y)"
                                    >
                                        <Redo2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-neutral-700" />

                            {/* Group 2: Resources */}
                            <div className="flex items-center gap-1">
                                {onOpenFavorites && (
                                    <button
                                        onClick={onOpenFavorites}
                                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'text-neutral-600 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
                                        title="Favorites"
                                    >
                                        <Star className="w-4 h-4" />
                                    </button>
                                )}
                                {onOpenHistory && (
                                    <button
                                        onClick={onOpenHistory}
                                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'text-neutral-600 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
                                        title="Recent History"
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={onToggleLibrary}
                                    className={`p-2 rounded-lg transition-colors ${isLightMode ? 'text-neutral-600 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
                                    title="Offline Library"
                                >
                                    <BookOpen className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Divider */}
                            <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-neutral-700" />

                            {/* Group 3: System */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={onStartTour}
                                    className={`p-2 rounded-lg transition-colors ${isLightMode ? 'text-neutral-600 hover:bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-800'}`}
                                    title="Interactive Tour"
                                    id="help-button"
                                >
                                    <HelpCircle className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsLightMode(!isLightMode)}
                                    className={`p-2 rounded-lg transition-colors ${isLightMode ? 'text-amber-500 hover:bg-neutral-100' : 'text-blue-400 hover:bg-neutral-800'}`}
                                    title="Toggle Theme"
                                >
                                    {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className={`flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 ${isLightMode ? 'scrollbar-thumb-neutral-300' : 'scrollbar-thumb-neutral-700'}`}>

                    {/* 1. CORE INPUT (Always Visible) */}
                    <div className="space-y-3 mb-2" id="upload-section">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                            {/* Datasource Selector */}
                            <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg border ${isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-black/20 border-white/5'}`}>
                                <button
                                    type="button"
                                    onClick={() => setDataSource('pdb')}
                                    className={`text-xs font-medium py-1.5 rounded-md transition-all ${dataSource === 'pdb'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : `${subtleText} hover:bg-black/5 dark:hover:bg-white/10`
                                        }`}
                                >
                                    RCSB PDB
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDataSource('pubchem')}
                                    className={`text-xs font-medium py-1.5 rounded-md transition-all ${dataSource === 'pubchem'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : `${subtleText} hover:bg-black/5 dark:hover:bg-white/10`
                                        }`}
                                >
                                    PubChem
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className={`absolute left-2.5 top-2.5 w-4 h-4 ${subtleText}`} />
                                    <input
                                        type="text"
                                        value={localPdbId}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocalPdbId(val);

                                            // Smart Database Detection
                                            const clean = val.trim();
                                            if (clean) {
                                                // Heuristic: PDB IDs are 4 chars, start with digit 1-9, and usually contain a letter.
                                                // Everything else (Pure numbers, Names, longer IDs) is likely PubChem.
                                                const isPdbLikely = /^[1-9][a-zA-Z0-9]{3}$/.test(clean) && /[a-zA-Z]/.test(clean);
                                                if (isPdbLikely) {
                                                    setDataSource('pdb');
                                                } else {
                                                    setDataSource('pubchem');
                                                }
                                            }
                                        }}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        placeholder={
                                            dataSource === 'pubchem' ? "Search PubChem CID (e.g. 2244)" :
                                                "Search PDB ID (e.g. 1crn)"
                                        }
                                        className={`w-full rounded-lg pl-9 pr-3 py-2 border outline-none transition-all ${inputBg}`}
                                    />
                                    {isSearchFocused && history && history.length > 0 && !localPdbId && (
                                        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl border z-50 overflow-hidden ${isLightMode ? 'bg-white border-neutral-200' : 'bg-neutral-800 border-neutral-700'}`}>
                                            <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider border-b flex items-center gap-2 ${isLightMode ? 'bg-neutral-50 text-neutral-500 border-neutral-200' : 'bg-neutral-900 text-neutral-500 border-neutral-700'}`}>
                                                <Clock className="w-3 h-3" />
                                                Recent History
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {history.slice(0, 10).map((item) => (
                                                    <button
                                                        key={`${item.id}-${item.dataSource}-${item.timestamp}`}
                                                        type="button"
                                                        onClick={() => {
                                                            setLocalPdbId(item.id);
                                                            setDataSource(item.dataSource);
                                                            setPdbId(item.id);
                                                            setIsSearchFocused(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between group border-b last:border-0 transition-colors ${isLightMode ? 'hover:bg-neutral-100 border-neutral-100 text-neutral-900' : 'hover:bg-neutral-700 border-neutral-800 text-neutral-200'}`}
                                                    >
                                                        <span className="font-mono font-medium">{item.id}</span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${isLightMode ? 'text-neutral-400 group-hover:text-neutral-500 bg-neutral-100 border-neutral-200' : 'text-neutral-400 group-hover:text-neutral-500 bg-neutral-900 border-neutral-700'}`}>
                                                            {item.dataSource === 'pdb' ? 'PDB' : 'CHEM'}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {onToggleFavorite && (
                                    <button
                                        type="button"
                                        onClick={onToggleFavorite}
                                        className={`px-3 py-2 rounded-lg transition-all ${isFavorite
                                            ? 'bg-yellow-500 hover:bg-yellow-400 text-white'
                                            : `${isLightMode ? 'bg-neutral-200 hover:bg-neutral-300' : 'bg-neutral-700 hover:bg-neutral-600'}`
                                            }`}
                                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                    >
                                        <Star className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
                                    </button>
                                )}
                                <button type="submit" className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
                                    Load
                                </button>
                            </div>
                        </form>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full flex items-center justify-center gap-2 border py-2 rounded-lg transition-all group ${cardBg} hover:opacity-80`}
                            >
                                <Upload className="w-3.5 h-3.5 group-hover:text-blue-500 transition-colors" />
                                <span className="text-xs font-medium">Upload File</span>
                            </button>
                            <input
                                id="file-upload-input"
                                type="file"
                                accept=".pdb,.cif,.ent,.mmcif,.mol,.sdf,.mol2,.xyz"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) onUpload(e.target.files[0]);
                                }}
                            />

                            <button
                                onClick={onToggleLibrary}
                                className={`w-full flex items-center justify-center gap-2 border py-2 rounded-lg transition-all group ${cardBg} hover:opacity-80`}
                            >
                                <BookOpen className="w-3.5 h-3.5 group-hover:text-purple-500 transition-colors" />
                                <span className="text-xs font-medium">Library</span>
                            </button>


                        </div>
                    </div>

                    {/* 2. STRUCTURE INFO (Always Visible if loaded) */}
                    {(proteinTitle || chains.length > 0) && (
                        <div id="metadata-box" className={`p-3 rounded-xl border ${cardBg} shadow-sm`}>
                            {proteinTitle && (
                                <div className="mb-2">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <h3 className={`text-[10px] font-bold uppercase tracking-wider ${subtleText}`}>Structure</h3>
                                        <button
                                            onClick={onDownloadPDB}
                                            title="Download PDB Structure"
                                            className={`p-1 rounded-md transition-colors ${isLightMode ? 'hover:bg-neutral-200 text-neutral-500 hover:text-black' : 'hover:bg-white/10 text-neutral-400 hover:text-white'}`}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className={`text-xs font-bold leading-snug break-words ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>{proteinTitle}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-2">
                                {/* Stats */}
                                {/* Stats: Only Show for Proteins */}
                                {!isChemical && (
                                    <>
                                        <div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Residues</span>
                                            <span className={`text-sm font-mono font-bold ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                                {chains.reduce((acc, chain) => {
                                                    if (chain.sequence) return acc + chain.sequence.length;
                                                    if (chain.max !== undefined && chain.min !== undefined) return acc + (chain.max - chain.min + 1);
                                                    return acc;
                                                }, 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="pl-2 border-l border-neutral-200 dark:border-neutral-800">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Chains</span>
                                            <span className={`text-sm font-mono font-bold ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                                {chains.length}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Metadata: Only Show for Proteins */}
                                {pdbMetadata && !isChemical && (
                                    <>
                                        <div>
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Method</span>
                                            <span className={`text-[10px] font-medium leading-tight block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                {pdbMetadata.method.length > 20 ? pdbMetadata.method.substring(0, 18) + '...' : pdbMetadata.method}
                                            </span>
                                        </div>
                                        <div className="pl-2 border-l border-neutral-200 dark:border-neutral-800">
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Resolution</span>
                                            <span className={`text-[10px] font-medium block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                {pdbMetadata.resolution}
                                            </span>
                                        </div>

                                        {pdbMetadata.organism && pdbMetadata.organism !== 'Unknown source' && (
                                            <div className="pt-1 border-t border-neutral-200 dark:border-neutral-800" style={{ borderTopStyle: 'dashed' }}>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Organism</span>
                                                <span className={`text-[10px] font-medium leading-tight block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                    {pdbMetadata.organism}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            className={`pt-1 border-t border-neutral-200 dark:border-neutral-800 ${pdbMetadata.organism && pdbMetadata.organism !== 'Unknown source' ? 'pl-2 border-l' : ''}`}
                                            style={{ borderTopStyle: 'dashed' }}
                                        >
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Deposited</span>
                                            <span className={`text-[10px] font-medium block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                {pdbMetadata.depositionDate}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Chemical Metadata */}
                                {pdbMetadata && isChemical && (
                                    <>
                                        {pdbMetadata.formula && (
                                            <div>
                                                <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Formula</span>
                                                <span className={`text-[10px] font-medium leading-tight block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                    {pdbMetadata.formula}
                                                </span>
                                            </div>
                                        )}
                                        {pdbMetadata.molecularWeight && (
                                            <div className="pl-2 border-l border-neutral-200 dark:border-neutral-800">
                                                <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Mol. Weight</span>
                                                <span className={`text-[10px] font-medium block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                    {pdbMetadata.molecularWeight.toFixed(2)} g/mol
                                                </span>
                                            </div>
                                        )}

                                        {/* Structure Image or Source */}
                                        <div
                                            className={`pt-1 border-t border-neutral-200 dark:border-neutral-800 ${(pdbMetadata.formula || pdbMetadata.molecularWeight) ? 'pl-2 border-l' : ''}`}
                                            style={{ borderTopStyle: 'dashed' }}
                                        >
                                            <span className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>
                                                {pdbMetadata.cid ? 'Structure' : 'Source'}
                                            </span>

                                            {pdbMetadata.cid ? (
                                                <StructureImageModal cid={pdbMetadata.cid} />
                                            ) : (
                                                <span className={`text-[10px] font-medium block ${isLightMode ? 'text-neutral-800' : 'text-neutral-200'}`}>
                                                    {pdbMetadata.title}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ACCORDION X: MOTIF SEARCH */}


                    {/* ACCORDION 1: APPEARANCE */}
                    <SidebarSection
                        title="Appearance"
                        icon={Eye}
                        isOpen={openSections['appearance']}
                        onToggle={() => toggleSection('appearance')}
                        isLightMode={isLightMode}
                        id="visualization-controls"
                    >
                        <div className="space-y-3">
                            {/* Visual Style */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-wider block ${subtleText}`}>Visualization</label>
                                <div className="space-y-3">
                                    {/* Toggles Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {/* 6. Theme Toggle */}
                                        <button
                                            onClick={() => setShowSurface(!showSurface)}
                                            className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg border transition-all ${showSurface ? 'bg-blue-500/10 border-blue-500 text-blue-500' : `${cardBg} opacity-80 hover:opacity-100`}`}
                                        >
                                            <Layers className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-medium">Surface</span>
                                            <div className={`w-1 h-1 rounded-full mt-0.5 ${showSurface ? 'bg-blue-500' : 'bg-neutral-500'}`} />
                                        </button>
                                        <button
                                            onClick={() => setIsSpinning(!isSpinning)}
                                            className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg border transition-all ${isSpinning ? 'bg-blue-500/10 border-blue-500 text-blue-500' : `${cardBg} opacity-80 hover:opacity-100`}`}
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? 'animate-spin' : ''}`} />
                                            <span className="text-[10px] font-medium">Spin</span>
                                            <div className={`w-1 h-1 rounded-full mt-0.5 ${isSpinning ? 'bg-blue-500' : 'bg-neutral-500'}`} />
                                        </button>
                                        <button
                                            onClick={() => setIsDyslexicFont(!isDyslexicFont)}
                                            className={`flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-lg border transition-all ${isDyslexicFont ? 'bg-blue-500/10 border-blue-500 text-blue-500' : `${cardBg} opacity-80 hover:opacity-100`}`}
                                        >
                                            <span className="text-lg leading-none font-serif">Aa</span>
                                            <span className="text-[10px] font-medium">Dyslexic</span>
                                            <div className={`w-1 h-1 rounded-full mt-0.5 ${isDyslexicFont ? 'bg-blue-500' : 'bg-neutral-500'}`} />
                                        </button>


                                        {/* Multi-View Mode Selector */}
                                        {onSetViewMode && (
                                            <div className="space-y-1" id="viewport-controls">
                                                <label className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Layout</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <button
                                                        onClick={() => onSetViewMode('single')}
                                                        className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg border transition-all ${viewMode === 'single' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' : `${cardBg} border-neutral-700 opacity-80 hover:opacity-100`}`}
                                                    >
                                                        <div className="w-3 h-3 border rounded" />
                                                        <span className="text-[9px] font-medium">Single</span>
                                                    </button>
                                                    <button
                                                        onClick={() => onSetViewMode('dual')}
                                                        className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg border transition-all ${viewMode === 'dual' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' : `${cardBg} border-neutral-700 opacity-80 hover:opacity-100`}`}
                                                    >
                                                        <div className="flex gap-0.5">
                                                            <div className="w-1.5 h-3 border rounded" />
                                                            <div className="w-1.5 h-3 border rounded" />
                                                        </div>
                                                        <span className="text-[9px] font-medium">Dual</span>
                                                    </button>
                                                    <button
                                                        onClick={() => onSetViewMode('triple')}
                                                        className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg border transition-all ${viewMode === 'triple' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' : `${cardBg} border-neutral-700 opacity-80 hover:opacity-100`}`}
                                                    >
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="w-3 h-1.5 border rounded" />
                                                            <div className="flex gap-0.5">
                                                                <div className="w-1.5 h-1.5 border rounded" />
                                                                <div className="w-1.5 h-1.5 border rounded" />
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-medium">Triple</span>
                                                    </button>
                                                    <button
                                                        onClick={() => onSetViewMode('quad')}
                                                        className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg border transition-all ${viewMode === 'quad' ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' : `${cardBg} border-neutral-700 opacity-80 hover:opacity-100`}`}
                                                    >
                                                        <div className="grid grid-cols-2 gap-0.5">
                                                            <div className="w-1.5 h-1.5 border rounded" />
                                                            <div className="w-1.5 h-1.5 border rounded" />
                                                            <div className="w-1.5 h-1.5 border rounded" />
                                                            <div className="w-1.5 h-1.5 border rounded" />
                                                        </div>
                                                        <span className="text-[9px] font-medium">Quad</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Palettes Grid */}
                                    <div className="space-y-1">
                                        <label className={`text-[9px] font-bold uppercase tracking-wider block ${subtleText}`}>Color Palette</label>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {[
                                                { id: 'standard', label: 'Standard', gradient: 'linear-gradient(to right, #3b82f6, #ef4444)' },
                                                { id: 'viridis', label: 'Viridis', gradient: 'linear-gradient(to right, #440154, #31688e, #35b779, #fde725)' },
                                                { id: 'magma', label: 'Magma', gradient: 'linear-gradient(to right, #000004, #51127c, #b73779, #fcfdbf)' },
                                                { id: 'cividis', label: 'Cividis', gradient: 'linear-gradient(to right, #00204d, #7c7b78, #fdea45)' },
                                            ].map((p) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => setColorPalette(p.id as ColorPalette)}
                                                    className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-all ${colorPalette === p.id
                                                        ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                                                        : `border-transparent ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/5'} opacity-70 hover:opacity-100`}`}
                                                >
                                                    <div className="h-3 w-12 rounded-sm border border-black/10 shadow-sm" style={{ background: p.gradient }} />
                                                    <span className="text-[10px] font-medium uppercase tracking-wider">{p.label}</span>
                                                    {colorPalette === p.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Background Controls */}
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <label className={`text-[10px] font-bold uppercase tracking-wider block ${subtleText}`}>Background</label>
                                    <div className="grid grid-cols-6 gap-1">
                                        {[
                                            { color: '#000000', label: 'Black' },
                                            { color: '#ffffff', label: 'White' },
                                            { color: '#1a1a1a', label: 'Dark' },
                                            { color: '#f5f5f5', label: 'Light' },
                                            { color: '#000020', label: 'Navy' },
                                            { color: 'transparent', label: 'Transparent' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.color}
                                                onClick={() => setCustomBackgroundColor?.(preset.color)}
                                                className={`h-6 rounded border transition-all ${customBackgroundColor === preset.color ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-black' : 'hover:scale-105'}`}
                                                style={preset.color === 'transparent'
                                                    ? {
                                                        backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                                                        backgroundSize: '8px 8px',
                                                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                                                        borderColor: isLightMode ? '#e5e5e5' : '#333'
                                                    }
                                                    : { backgroundColor: preset.color, borderColor: isLightMode ? '#e5e5e5' : '#333' }
                                                }
                                                title={preset.label}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <div className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded border ${inputBg}`}>
                                            <input
                                                type="color"
                                                value={customBackgroundColor || (isLightMode ? '#ffffff' : '#000000')}
                                                onChange={(e) => setCustomBackgroundColor?.(e.target.value)}
                                                className="w-5 h-5 rounded cursor-pointer bg-transparent border-none p-0"
                                            />
                                            <span className="text-[10px] font-mono opacity-70 uppercase">
                                                {customBackgroundColor || 'Auto'}
                                            </span>
                                        </div>
                                        {customBackgroundColor && (
                                            <button
                                                onClick={() => setCustomBackgroundColor?.(null)}
                                                className={`px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition-colors hover:bg-red-500/10 hover:text-red-500 ${isLightMode ? 'border-neutral-900 text-black bg-white' : 'border-neutral-700 text-neutral-400'}`}
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${subtleText}`}>Style</label>
                                            <select
                                                value={representation}
                                                onChange={(e) => setRepresentation(e.target.value as RepresentationType)}
                                                className={`w-full border rounded-lg px-2 py-2 text-xs outline-none ${inputBg}`}
                                            >
                                                {!isChemical && <option value="cartoon">Cartoon</option>}
                                                <option value="ball+stick">Ball & Stick</option>
                                                <option value="licorice">Licorice</option>
                                                {!isChemical && <option value="backbone">Backbone</option>}
                                                <option value="spacefill">Spacefill</option>
                                                <option value="surface">Surface</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${subtleText}`}>Colors</label>
                                            <select
                                                value={coloring}
                                                onChange={(e) => setColoring(e.target.value as ColoringType)}
                                                className={`w-full border rounded-lg px-2 py-2 text-xs outline-none ${inputBg}`}
                                            >
                                                {!isChemical && <option value="chainid">By Chain</option>}
                                                {!isChemical && <option value="secondary-structure">Structure</option>}
                                                {!isChemical && <option value="hydrophobicity">Hydrophobicity</option>}
                                                <option value="bfactor">B-Factor</option>
                                                <option value="uniform">Uniform</option>
                                                <option value="element">Element (CPK)</option>
                                            </select>
                                        </div>

                                        {/* Residue-Specific Coloring UI */}
                                        {setCustomColors && (
                                            <div className="col-span-2 pt-2 border-t border-white/5 space-y-2">
                                                <div className={`w-full text-[10px] font-bold uppercase tracking-wider ${subtleText} opacity-80 mb-1`}>
                                                    Custom Residue Colors
                                                </div>

                                                <div className={`p-3 rounded-xl border space-y-3 ${isLightMode ? 'bg-neutral-50/50 border-neutral-200' : 'bg-black/20 border-white/5'}`}>
                                                    {/* Row 1: Selection Inputs */}
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 shrink-0">
                                                                <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${subtleText} opacity-70`}>Chain</label>
                                                                <div className={`relative flex items-center rounded-lg border transition-all hover:border-blue-500/50 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 ${inputBg}`}>
                                                                    <select
                                                                        value={customChain}
                                                                        onChange={(e) => setCustomChain(e.target.value)}
                                                                        className="w-full appearance-none bg-transparent py-1.5 pl-2 pr-6 text-xs font-mono outline-none"
                                                                    >
                                                                        <option value="">All</option>
                                                                        {chains.map(c => (
                                                                            <option key={c.name} value={c.name}>:{c.name}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label className={`text-[9px] font-bold uppercase tracking-wider ${subtleText} opacity-70`}>Residues</label>
                                                                    {customChain && chains.find(c => c.name === customChain)?.min !== undefined && (
                                                                        <span className={`text-[9px] font-mono ${subtleText} opacity-50`}>
                                                                            {chains.find(c => c.name === customChain)?.min}-{chains.find(c => c.name === customChain)?.max}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={customSelection}
                                                                    onChange={(e) => setCustomSelection(e.target.value)}
                                                                    placeholder="e.g. 50-60"
                                                                    className={`w-full rounded-lg px-3 py-1.5 text-xs border outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono placeholder:text-neutral-500 ${inputBg}`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Color & Action */}
                                                    <div>
                                                        <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${subtleText} opacity-70`}>Color & Action</label>
                                                        <div className="flex gap-2 h-9">
                                                            {/* Color Picker */}
                                                            <div className={`flex-1 flex items-center gap-2 px-3 rounded-lg border transition-all hover:border-neutral-400 dark:hover:border-neutral-600 ${inputBg}`}>
                                                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10 ring-1 ring-black/5 shrink-0 shadow-sm">
                                                                    <input
                                                                        type="color"
                                                                        value={customColorValue}
                                                                        onChange={(e) => setCustomColorValue(e.target.value)}
                                                                        className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer p-0 m-0"
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] font-mono opacity-80 uppercase tracking-wide">
                                                                    {customColorValue}
                                                                </span>
                                                            </div>



                                                            {/* Add Button */}
                                                            <button
                                                                onClick={handleAddCustomColor}
                                                                disabled={(!customSelection && !customChain)}
                                                                className="px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>Add</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Active Rules List */}
                                                    {customColors && customColors.length > 0 && (
                                                        <div className="space-y-1 pt-2 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${subtleText}`}>Active Rules ({customColors.length})</span>
                                                            </div>
                                                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                                                                {customColors.map((rule, idx) => (
                                                                    <div key={idx} className={`group flex items-center justify-between text-xs p-2 rounded-lg border transition-all ${isLightMode ? 'bg-white border-neutral-200 hover:border-blue-300' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-3.5 h-3.5 rounded-full shadow-sm border border-black/10 ring-1 ring-inset ring-black/5" style={{ background: rule.color }} />
                                                                            <code className={`text-[10px] font-mono ${isLightMode ? 'text-neutral-600' : 'text-neutral-300'}`}>
                                                                                {rule.selection}
                                                                            </code>
                                                                        </div>
                                                                        <button
                                                                            onClick={() => handleRemoveCustomColor(idx)}
                                                                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all p-1 hover:bg-red-500/10 rounded"
                                                                            title="Remove Rule"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        )}

                                    </div>

                                    {/* Tools: Publication & Measure */}
                                    <div className="pt-2 border-t border-white/5 space-y-2">
                                        <button
                                            onClick={onTogglePublicationMode}
                                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${isPublicationMode
                                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                                : (isLightMode ? 'bg-neutral-100 hover:bg-purple-50 text-neutral-600 hover:text-purple-600 border border-neutral-200' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-white/10')
                                                }`}
                                            title="Publication Mode: High Quality, White BG, Soft Shadows"
                                        >
                                            {isPublicationMode ? <X className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                                            {isPublicationMode ? "Exit Pub. Mode" : "Publication & Screenshot Mode"}
                                        </button>
                                    </div>
                                </div>


                            </div>

                            <p className={`text-[9px] mt-1.5 opacity-70 leading-relaxed ${subtleText}`}>
                                {({
                                    chainid: "Distinct colors for each chain.",
                                    resname: "Standard amino acid colors (RasMol).",
                                    residue: "Standard amino acid colors.",
                                    structure: "Helices (Magenta), Sheets (Yellow), Loops (White).",
                                    hydrophobicity: "Blue (Hydrophilic) → Red (Hydrophobic).",
                                    bfactor: "Blue (Stable) → Red (Flexible/Mobile).",
                                    secondary: "Secondary structure delineation.",
                                    residueindex: "Rainbow gradient by residue position."
                                } as Record<string, string>)[coloring]}
                            </p>

                            {/* Custom Rules */}
                        </div>
                    </SidebarSection>


                    {/* ACCORDION X: JOINT MEASUREMENTS - Only in Shared Session */}
                    {isSharedSession && (
                        <SidebarSection
                            title="Joint Measurements"
                            icon={Ruler}
                            isOpen={openSections['measurements']}
                            onToggle={() => toggleSection('measurements')}
                            isLightMode={isLightMode}
                            id="measurements-section"
                        >
                            <MeasurementTable
                                measurements={measurements}
                                onDelete={onDeleteMeasurement}
                                isLightMode={isLightMode}
                            />
                            <div className="mt-2 pt-2 border-t border-white/5 flex justify-end">
                                <button
                                    onClick={onClearMeasurements}
                                    className="text-[10px] text-red-500 hover:underline flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Clear All
                                </button>
                            </div>
                        </SidebarSection>

                    )}
                    {/* ACCORDION 2: ANALYSIS */}
                    <SidebarSection
                        title="Analysis"
                        icon={Activity}
                        isOpen={openSections['analysis']}
                        onToggle={() => toggleSection('analysis')}
                        isLightMode={isLightMode}
                        id="analysis-tools"
                    >

                        {/* Ligands */}
                        {
                            ligands.length > 0 && (
                                <div className={`p-2 rounded-lg border ${cardBg}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Hexagon className="w-3.5 h-3.5 text-blue-500" />
                                            <span className={`text-xs font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>Ligands ({ligands.length})</span>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <button
                                            onClick={() => setShowLigands(!showLigands)}
                                            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border text-[10px] font-medium transition-all
                                                ${showLigands
                                                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400'
                                                    : `${isLightMode ? 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50' : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'}`
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${showLigands ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                            {showLigands ? 'Ligands On' : 'Ligands Off'}
                                        </button>
                                        <button
                                            onClick={() => setShowIons && setShowIons(!showIons)}
                                            className={`flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border text-[10px] font-medium transition-all
                                                ${showIons
                                                    ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
                                                    : `${isLightMode ? 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50' : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10'}`
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${showIons ? 'bg-purple-500' : 'bg-neutral-400'}`} />
                                            {showIons ? 'Ions On' : 'Ions Off'}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {ligands.map(lig => (
                                            <span key={lig} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600">
                                                {formatChemicalId(lig)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )
                        }

                        <div className="grid grid-cols-2 gap-2">

                            <button
                                onClick={() => {
                                    setIsMeasurementMode(!isMeasurementMode);
                                    if (!isMeasurementMode && onToggleMeasurement) onToggleMeasurement();
                                }}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${isMeasurementMode ? 'bg-amber-500/10 border-amber-500 text-amber-500' : `${cardBg} hover:opacity-80`} ${isChemical ? 'col-span-2' : ''}`}
                            >
                                <span className="text-xs font-medium">Measure</span>
                                <Ruler className="w-3.5 h-3.5" />
                            </button>
                            {/* Contact Map - Only for Proteins */}
                            {!isChemical && (
                                <button
                                    onClick={onToggleContactMap}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${cardBg} hover:opacity-80`}
                                >
                                    <span className="text-xs font-medium">Contact Map</span>
                                    <Grid3X3 className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {/* Superposition - Only for Proteins */}
                            {!isChemical && (
                                <button
                                    onClick={onOpenSuperposition}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg border transition-all ${cardBg} hover:opacity-80`}
                                >
                                    <span className="text-xs font-medium">Superpose</span>
                                    <Layers className="w-3.5 h-3.5" />
                                </button>
                            )}

                            {isMeasurementMode && (
                                <button
                                    onClick={onClearMeasurements}
                                    className={`col-span-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${cardBg} hover:text-red-500 hover:border-red-500`}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-xs font-medium">Clear Measurements</span>
                                </button>
                            )}

                            {/* Chemical Properties - Only for Chemicals */}
                            {isChemical && pdbMetadata?.cid && (
                                <ChemicalPropertiesPanel cid={pdbMetadata.cid} isLightMode={isLightMode} cardBg={cardBg} subtleText={subtleText} />
                            )}
                        </div>


                        {/* Sequence Viewer Component - Only for Proteins */}
                        {!isChemical && (
                            <div className={`p-2 rounded-lg border flex flex-col ${cardBg}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold ${subtleText}`}>Sequence</span>
                                        <button
                                            onClick={onDownloadSequence}
                                            title="Download FASTA Sequence"
                                            className={`p-1 rounded-md transition-colors ${isLightMode ? 'hover:bg-neutral-200 text-neutral-500 hover:text-black' : 'hover:bg-white/10 text-neutral-400 hover:text-white'}`}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <select
                                        value={viewSequenceChain}
                                        onChange={(e) => setViewSequenceChain(e.target.value)}
                                        className={`bg-transparent border-none text-[10px] outline-none cursor-pointer text-right ${subtleText}`}
                                    >
                                        <option value="">All Chains</option>
                                        {chains.map(c => <option key={c.name} value={c.name}>Chain {c.name}</option>)}
                                    </select>
                                </div>
                                <div className={`h-24 p-1 overflow-y-auto scrollbar-thin ${isLightMode ? 'bg-neutral-50' : 'bg-neutral-800'} rounded`} ref={sequenceContainerRef}>
                                    {chains.length === 0 ? <p className={`italic text-[10px] ${subtleText}`}>No sequence data</p> : (
                                        chains.filter(c => viewSequenceChain ? c.name === viewSequenceChain : true).map(c => (
                                            <div key={c.name} className="mb-3 relative">
                                                <div className={`sticky top-0 z-10 py-1 px-1 mb-1 text-[10px] font-extrabold uppercase tracking-widest border-b shadow-sm ${isLightMode ? 'bg-neutral-100 border-neutral-200 text-neutral-800' : 'bg-neutral-800 border-neutral-700 text-white'}`}>
                                                    Chain {c.name}
                                                </div>
                                                <div className="flex flex-wrap text-[10px] font-mono leading-none break-all">
                                                    {c.sequence.split('').map((char, idx) => {
                                                        const resNo = c.min + idx;
                                                        const isHighlighted = highlightedResidue?.chain === c.name && highlightedResidue.resNo === resNo;
                                                        return (
                                                            <span
                                                                key={idx}
                                                                ref={(el) => { if (el) residueRefs.current.set(`${c.name}-${resNo}`, el); }}
                                                                onClick={() => onResidueClick(c.name, resNo, char)}
                                                                className={`w-4 h-4 flex items-center justify-center cursor-pointer rounded-sm transition-colors ${isHighlighted ? 'bg-blue-600 text-white font-bold' : 'hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                                                                title={`${char}${resNo}`}
                                                            >
                                                                {char}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </SidebarSection>

                    {/* ACCORDION X: MOTIF SEARCH */}
                    {
                        !isChemical && (
                            <SidebarSection
                                title="Motif Search"
                                icon={ScanSearch}
                                isOpen={openSections['motif-search']}
                                onToggle={() => toggleSection('motif-search')}
                                isLightMode={isLightMode}
                                id="motif-search"
                            >
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase tracking-wider opacity-60 font-bold">Sequence Pattern</label>
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) setSearchPattern(e.target.value);
                                            }}
                                            className={`w-full mb-1 bg-transparent border rounded px-2 py-1 text-xs outline-none focus:border-blue-500
                                            ${isLightMode
                                                    ? 'border-neutral-300 text-black'
                                                    : 'border-white/20 text-white'}`}
                                            defaultValue=""
                                        >
                                            {MOTIF_LIBRARY.map((m) => (
                                                <option key={m.name} value={m.pattern} className="text-black">
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={searchPattern}
                                                onChange={(e) => setSearchPattern(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                                placeholder="e.g. R-G-D or H-x-x-H"
                                                className={`flex-1 bg-transparent border rounded px-2 py-1 text-xs font-mono outline-none focus:border-blue-500
                                            ${isLightMode
                                                        ? 'border-neutral-300 placeholder-neutral-400 text-black'
                                                        : 'border-white/20 placeholder-white/20 text-white'}`}
                                            />
                                            <button
                                                onClick={handleSearch}
                                                disabled={!searchPattern}
                                                className={`p-1 rounded transition-colors ${!searchPattern ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-500/20 text-blue-400'}`}
                                            >
                                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-[9px] opacity-50">Use 'x' as wildcard. Dashes ignored.</p>

                                        {/* Loading Skeletons */}
                                        {isSearching && (
                                            <div className="space-y-2 pt-2">
                                                {[1, 2, 3].map(i => (
                                                    <div key={i} className="flex gap-2">
                                                        <Skeleton variant="rounded" className="w-full h-8 bg-neutral-800/50" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Results List */}
                                    {searchResults.length > 0 && (
                                        <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/10">
                                            <div className="flex justify-between items-center pb-1 border-b border-white/5">
                                                <span className="text-[10px] font-bold opacity-70">{searchResults.length} Matches</span>
                                                <button onClick={() => setSearchResults([])} className="p-1 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                            </div>
                                            {searchResults.map((match, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleResultClick(match)}
                                                    className={`w-full text-left p-2 rounded flex justify-between items-center group transition-colors
                                                ${isLightMode
                                                            ? 'hover:bg-neutral-100 border border-transparent hover:border-neutral-200'
                                                            : 'hover:bg-white/5 border border-transparent hover:border-white/10'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-mono font-bold text-blue-400">{match.sequence}</span>
                                                        <span className="text-[10px] opacity-60">Chain {match.chain} : {match.startResNo}-{match.endResNo}</span>
                                                    </div>
                                                    <ScanSearch className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </SidebarSection>
                        )}

                    {/* ACCORDION 3: TOOLS */}
                    <SidebarSection
                        title="Tools"
                        icon={Wrench}
                        isOpen={openSections['tools']}
                        onToggle={() => toggleSection('tools')}
                        isLightMode={isLightMode}
                        id="export-tools"
                    >
                        <div className="space-y-3">
                            {/* Session Recorder Controls */}
                            {recorderContent && (
                                <div className="mb-4">
                                    {recorderContent}
                                </div>
                            )}

                            {/* Session Controls */}
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${subtleText}`}>Session</label>
                                <div className="flex gap-2">
                                    <button onClick={onSaveSession} className={`flex-1 flex items-center justify-center gap-2 border py-1.5 rounded-lg transition-all text-xs font-medium ${cardBg} hover:bg-neutral-100 dark:hover:bg-neutral-800`}>
                                        <Download className="w-3.5 h-3.5" /> Save
                                    </button>
                                    <button onClick={() => sessionInputRef.current?.click()} className={`flex-1 flex items-center justify-center gap-2 border py-1.5 rounded-lg transition-all text-xs font-medium ${cardBg} hover:bg-neutral-100 dark:hover:bg-neutral-800`}>
                                        <Upload className="w-3.5 h-3.5" /> Load
                                    </button>

                                    <input type="file" accept=".json" className="hidden" ref={sessionInputRef} onChange={(e) => e.target.files?.[0] && onLoadSession(e.target.files[0])} />
                                </div>
                            </div>

                            {/* Actions & Recording */}
                            <div>
                                <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${subtleText}`}>Actions & Recording</label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button onClick={onResetView} className={`flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg transition-all ${cardBg} hover:opacity-80`}>
                                            <RotateCcw className="w-3.5 h-3.5" /> <span className="text-xs">Reset</span>
                                        </button>
                                        <button onClick={onTakeSnapshot} className={`flex-1 flex items-center justify-center gap-1 border py-2 rounded-lg transition-all ${cardBg} hover:text-blue-500 hover:border-blue-500/50`}>
                                            <Camera className="w-3.5 h-3.5" /> <span className="text-xs">Snapshot</span>
                                        </button>
                                        <button onClick={onToggleShare} className={`flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg transition-all ${cardBg} hover:text-green-500 hover:border-green-500/50`}>
                                            <Share2 className="w-3.5 h-3.5" /> <span className="text-xs">Share</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className={`flex items-center gap-2 pl-2 pr-1 py-1.5 border rounded-lg ${cardBg}`}>
                                            <span className={`text-[9px] font-bold ${subtleText}`}>SEC</span>
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                value={recordDuration / 1000}
                                                onChange={(e) => setRecordDuration(Math.max(1, Number(e.target.value)) * 1000)}
                                                disabled={isRecording}
                                                className={`w-8 bg-transparent text-center text-xs outline-none font-mono ${isRecording ? 'opacity-50' : ''}`}
                                            />
                                        </div>
                                        <button
                                            onClick={() => onRecordMovie(recordDuration)}
                                            disabled={isRecording}
                                            className={`flex-1 flex items-center justify-center gap-2 border py-1.5 rounded-lg transition-all text-xs font-medium ${isRecording ? 'bg-red-500 text-white border-red-500' : `${cardBg} hover:text-red-500 hover:border-red-500/50`}`}
                                        >
                                            {isRecording ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
                                            {isRecording ? 'Recording...' : 'Record'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Galleries */}
                            {/* Galleries */}
                            <div className="pt-2 border-t border-white/5">
                                <button
                                    id="media-gallery-btn"
                                    onClick={() => setIsGalleryOpen(true)}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all group ${isLightMode ? 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${isLightMode ? 'bg-white shadow-sm text-blue-600' : 'bg-black/40 text-blue-400'}`}>
                                            <ImageIcon className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <div className={`text-xs font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>Media Gallery</div>
                                            <div className={`text-[9px] ${subtleText}`}>{snapshots.length} images • {movies.length} videos</div>
                                        </div>
                                    </div>
                                    <ChevronDown className="-rotate-90 w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>

                        </div>
                    </SidebarSection>
                </div >
            </div >

            {/* Gallery Modal (Replaces old previews) */}
            <GalleryModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                snapshots={snapshots}
                movies={movies}
                onDeleteSnapshot={onDeleteSnapshot}
                onDeleteMovie={onDeleteMovie}
                onDownloadSnapshot={onDownloadSnapshot}
                onDownloadMovie={onDownloadMovie}
                isLightMode={isLightMode}
            />
        </>
    );
};
