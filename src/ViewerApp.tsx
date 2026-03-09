import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ProteinViewer, type ProteinViewerRef } from './components/ProteinViewer';
import { MolStarProteinViewer } from './components/MolStarProteinViewer'; // ENGINE: New Import


import { LandingOverlay } from './components/LandingOverlay';
import { Controls } from './components/Controls';
import { ContactMap } from './components/ContactMap';
import { AISidebar, type AIAction } from './components/AISidebar';
import { HelpGuide } from './components/HelpGuide';
import { parseURLState, getShareableURL } from './utils/urlManager';

import LibraryModal from './components/LibraryModal';
import { ShareModal } from './components/ShareModal';
import { SequenceTrack } from './components/SequenceTrack';
import { DragDropOverlay } from './components/DragDropOverlay';
import { GalleryModal } from './components/GalleryModal';
import { CommandPalette, type CommandAction } from './components/CommandPalette';
import { HUD } from './components/HUD';
import { ReactionOverlay } from './components/ReactionOverlay';
import { AudioRoom } from './components/AudioRoom';
import { MeasurementPanel } from './components/MeasurementPanel';
import { SuperpositionModal } from './components/SuperpositionModal';
import { IdentityModal } from './components/IdentityModal';
import { Settings } from './components/Settings';
import { SessionChat } from './components/SessionChat';
import { OFFLINE_LIBRARY } from './data/library';
import { fetchPubChemMetadata } from './utils/pdbUtils';
import type {
  PDBMetadata,
  Measurement,
  MeasurementTextColor,
  RepresentationType,
  ColoringType,
  Snapshot,
  Movie,
  ColorPalette,
  ResidueInfo,
  StructureInfo,
  ChatMessage
} from './types';
import {
  Camera, RefreshCw, Upload,
  Settings as SettingsIcon, Zap, Activity, Grid3X3, Palette,
  Share2, Save, FolderOpen, Video, Ruler, Maximize2, Star, Undo2, Redo2, BookOpen,
  ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { startOnboardingTour } from './components/TourGuide';
import { ViewportSelector } from './components/ViewportSelector';
import { SnapshotModal } from './components/SnapshotModal';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { FavoritesPanel } from './components/FavoritesPanel';
import { useFavorites } from './hooks/useFavorites';
import { useHistory } from './hooks/useHistory';
import { useVisualStack, type VisualState } from './hooks/useVisualStack';
import { useStructureController, type StructureController } from './hooks/useStructureController';
import { usePeerSession } from './hooks/usePeerSession';
import { useStructureMetadata } from './hooks/useStructureMetadata';


import { initGA, logPageView, logEvent } from './utils/analytics';
import { useSessionRecorder } from './hooks/useSessionRecorder';
import { RecorderControls } from './components/RecorderControls';
import { StudioLayout } from './components/StudioLayout';
import { useAuth } from './lib/AuthContext';
import { Link } from 'react-router-dom';
import { uploadStructure } from './lib/structuresService';
import { addRecentStructure } from './lib/recentStructures';

const deepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
};

function App() {
  // Initialize Analytics
  useEffect(() => {
    initGA();
    logPageView(window.location.pathname + window.location.search);
  }, []);

  // Refs for Multi-View Viewers (supports 1-4 viewports)
  const viewerRefs = [
    useRef<ProteinViewerRef>(null),
    useRef<ProteinViewerRef>(null),
    useRef<ProteinViewerRef>(null),
    useRef<ProteinViewerRef>(null)
  ];

  const { toasts, addToast, removeToast, success, error } = useToast();
  const { favorites, toggleFavorite, removeFavorite, isFavorite } = useFavorites();
  const { history, addToHistory } = useHistory();
  const peerSession = usePeerSession();
  const { user } = useAuth();

  // Peer Session UX State
  const [isCameraSynced, setIsCameraSynced] = useState(true);
  const [remoteHoveredResidue, setRemoteHoveredResidue] = useState<ResidueInfo | null>(null);

  // Feature: Nametags
  const [userName, setUserName] = useState<string | null>(null);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);

  // ...

  const [isGalleryOpen, setIsGalleryOpen] = useState(false); // Gallery State Lifted

  // ENGINE: Visualizer Engine State
  const [visualizerEngine, setVisualizerEngine] = useState<'ngl' | 'molstar'>('ngl');

  // GRAPHICS SETTINGS
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<{ quality: 'low' | 'medium' | 'high'; ssao: boolean }>({
    quality: 'medium',
    ssao: true
  });

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Prompt for name when connecting (if not set)
  useEffect(() => {
    if (peerSession.isConnected && !userName && !isIdentityModalOpen) {
      setIsIdentityModalOpen(true);
    }
  }, [peerSession.isConnected, userName]);

  useEffect(() => {
    if (userName && peerSession.isConnected) {
      peerSession.broadcastName(userName);
    }
  }, [userName, peerSession.isConnected]);

  // Feature: Pass the Chalk (Control Transfer)
  const [controllerId, setControllerId] = useState<string | null>(null);



  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Clear unread on open
  useEffect(() => {
    if (isChatOpen) setUnreadCount(0);
  }, [isChatOpen]);


  // Handlers
  const handleSendChat = (text: string) => {
    if (!peerSession.peerId) return; // Should be connected

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: peerSession.peerId,
      senderName: userName || (peerSession.isHost ? 'Host' : 'Guest'),
      content: text,
      timestamp: Date.now(),
      type: 'text'
    };
    // Add locally
    setChatMessages(prev => [...prev, msg]);
    // Broadcast
    peerSession.broadcastChat(msg);
  };

  const sendSystemLog = useCallback((content: string) => {
    // Only log if connected to a session
    if (!peerSession.isConnected) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: 'SYSTEM',
      senderName: 'System',
      content,
      timestamp: Date.now(),
      type: 'system'
    };
    setChatMessages(prev => [...prev, msg]);
    peerSession.broadcastChat(msg);
  }, [peerSession]);

  // Sync Incoming Chat
  useEffect(() => {
    if (peerSession.lastReceivedChat) {
      setChatMessages(prev => {
        // Prevent duplicates just in case (though IDs are random)
        if (prev.some(m => m.id === peerSession.lastReceivedChat?.id)) return prev;
        return [...prev, peerSession.lastReceivedChat!];
      });

      if (!isChatOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }
  }, [peerSession.lastReceivedChat, isChatOpen]);


  // Sync Controller ID
  useEffect(() => {
    if (peerSession.lastReceivedState?.controllerId !== undefined) {
      setControllerId(peerSession.lastReceivedState.controllerId);
    }
  }, [peerSession.lastReceivedState]);

  // One-Click Join (Mount Logic)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join') || params.get('live');
    if (joinId) {
      // Small delay to ensure Peer is ready
      setTimeout(() => {
        peerSession.connectToPeer(joinId);
        // Clear param to clean URL (optional) but keeping it lets user know they are in live mode
        const url = new URL(window.location.href);
        url.searchParams.delete('join');
        url.searchParams.delete('live');
        window.history.replaceState({}, '', url);
      }, 1000);
    }
  }, []);

  // Dashboard "Open in Viewer" bridge — single structure
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingStructure');
    if (!raw) return;
    sessionStorage.removeItem('pendingStructure');

    let pending: { url: string; name: string; fileType: string } | null = null;
    try { pending = JSON.parse(raw); } catch { return; }
    if (!pending?.url) return;

    const { url, name, fileType } = pending;
    fetch(url)
      .then(res => { if (!res.ok) throw new Error('Failed to fetch structure'); return res.blob(); })
      .then(blob => {
        const file = new File([blob], `${name}.${fileType}`, { type: 'application/octet-stream' });
        controllers[0].handleUpload(file, fileType === 'cif' || fileType === 'mmcif');
        setShowLanding(false);
      })
      .catch(err => console.error('[pendingStructure] load error:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dashboard "Compare in Multi-view" bridge — array of structures
  useEffect(() => {
    const raw = sessionStorage.getItem('pendingStructures');
    if (!raw) return;
    sessionStorage.removeItem('pendingStructures');

    let items: { url: string; name: string; fileType: string }[] = [];
    try { items = JSON.parse(raw); } catch { return; }
    if (!items.length) return;

    const count = Math.min(items.length, 4);
    const modeMap: Record<number, 'single' | 'dual' | 'triple' | 'quad'> = {
      1: 'single', 2: 'dual', 3: 'triple', 4: 'quad',
    };
    setViewMode(modeMap[count] ?? 'dual');
    setShowLanding(false);

    items.slice(0, 4).forEach((item, idx) => {
      fetch(item.url)
        .then(res => { if (!res.ok) throw new Error('fetch failed'); return res.blob(); })
        .then(blob => {
          const file = new File([blob], `${item.name}.${item.fileType}`, { type: 'application/octet-stream' });
          controllers[idx].handleUpload(file, item.fileType === 'cif' || item.fileType === 'mmcif');
        })
        .catch(err => console.error(`[pendingStructures][${idx}] load error:`, err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Sync Incoming State


  // Parse Global URL State Once
  const initialUrlState = parseURLState();

  // --- State: Multi-View Controllers (array of 4) ---
  const controllers = [
    useStructureController(initialUrlState.viewports[0] || {}), // Viewport 0
    useStructureController(initialUrlState.viewports[1] || {}), // Viewport 1
    useStructureController(initialUrlState.viewports[2] || {}), // Viewport 2
    useStructureController(initialUrlState.viewports[3] || {})  // Viewport 3
  ];

  // --- State: View Mode & Active Management ---
  type ViewMode = 'single' | 'dual' | 'triple' | 'quad';
  const [viewMode, setViewMode] = useState<ViewMode>((initialUrlState.viewMode as ViewMode) || 'single');
  const [activeViewIndex, setActiveViewIndex] = useState(0);

  // --- Multi-View Tool Selector State ---
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [pendingToolAction, setPendingToolAction] = useState<{
    type: 'snapshot' | 'record' | 'reset' | 'save' | 'load' | 'share';
    args?: any;
  } | null>(null);

  // --- Studio Mode State ---
  const [isStudioMode, setIsStudioMode] = useState(false);

  // Auto-collapse sidebar in Mol* mode
  const [isMolStarSidebarExpanded, setIsMolStarSidebarExpanded] = useState(true);

  // Auto-collapse sidebar in Mol* mode to prevent overlap with native controls
  useEffect(() => {
    if (visualizerEngine === 'molstar') {
      setIsSidebarCollapsed(true);
    } else {
      // Optional: Auto-expand when returning to NGL? Maybe user prefers it.
      // setIsSidebarCollapsed(false);
    }
  }, [visualizerEngine]);

  // --- Snapshot Modal State (unified viewport + quality selection) ---
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  // Sync Incoming State
  useEffect(() => {
    if (peerSession.lastReceivedState) {
      const s = peerSession.lastReceivedState;
      // We diligently sync Viewport 0
      const ctrl = controllers[0];

      if (s.pdbId && s.pdbId !== ctrl.pdbId) ctrl.setPdbId(s.pdbId);
      if (s.representation && s.representation !== ctrl.representation) ctrl.setRepresentation(s.representation as RepresentationType);
      if (s.coloring && s.coloring !== ctrl.coloring) ctrl.setColoring(s.coloring as ColoringType);
      if (s.isSpinning !== undefined && s.isSpinning !== ctrl.isSpinning) ctrl.setIsSpinning(s.isSpinning);
      // For more complex objects, we might need deep comparison or just set it
      if (s.highlightedResidue !== undefined) ctrl.setHighlightedResidue(s.highlightedResidue);
      if (s.customColors !== undefined) ctrl.setCustomColors(s.customColors);
      if (s.measurements !== undefined) ctrl.setMeasurements(s.measurements);
      if (s.customBackgroundColor !== undefined) ctrl.setCustomBackgroundColor(s.customBackgroundColor);
      if (s.customTransparency !== undefined) ctrl.setCustomTransparency(s.customTransparency);
      if (s.hoveredResidue !== undefined) setRemoteHoveredResidue(s.hoveredResidue);
      if (s.annotations !== undefined) setAnnotations(s.annotations);
    }
  }, [peerSession.lastReceivedState]);

  // State: Hovered Residue
  const [hoveredResidue, setHoveredResidue] = useState<ResidueInfo | null>(null);

  // Feature: 3D Annotations
  const [annotations, setAnnotations] = useState<any[]>([]);

  const handleAddAnnotation = (ann: any) => {
    // Add author info
    const enrichedAnn = { ...ann, author: userName || (peerSession.isHost ? 'Host' : 'Guest') };
    const newAnnotations = [...annotations, enrichedAnn];
    setAnnotations(newAnnotations);

    // Broadcast immediately if I am the controller or host
    // Note: Regular broadcast loop will catch it, but instant is better for UX
    if (peerSession.isConnected && (peerSession.isHost || controllerId === peerSession.peerId || !controllerId)) {
      peerSession.broadcastState({ annotations: newAnnotations });
    }
  };

  // Connection Feedback (Toasts)
  useEffect(() => {
    if (peerSession.isConnected) {
      success(`Connected to session! (${peerSession.connections.length} peer${peerSession.connections.length > 1 ? 's' : ''})`);
    }
  }, [peerSession.isConnected, peerSession.connections.length]);

  // Sync Incoming Camera
  useEffect(() => {
    // Priority: Playback > Peer > Local
    if (recorder.isPlaying && viewerRefs[0].current) {
      // Handled by hook callback
    } else if (isCameraSynced && peerSession.lastReceivedCamera && viewerRefs[0].current) {
      viewerRefs[0].current.setOrientation(peerSession.lastReceivedCamera);
    }
  }, [peerSession.lastReceivedCamera, isCameraSynced]);

  // --- Session Recorder ---
  // --- Session Recorder ---
  /* eslint-disable react-hooks/exhaustive-deps */
  const handlePlaybackStateChange = useCallback((state: any) => {
    // The recorded state is "multiViewState" { viewMode, viewports: [] }
    if (!state || !state.viewports || !state.viewports[0]) return;

    const vpState = state.viewports[0];
    const ctrl = controllers[0];

    // Core Data (pdbId first as it might trigger re-renders)
    if (vpState.pdbId && vpState.pdbId !== ctrl.pdbId) ctrl.setPdbId(vpState.pdbId);
    if (vpState.dataSource && vpState.dataSource !== ctrl.dataSource) ctrl.setDataSource(vpState.dataSource);

    // Visualization
    if (vpState.representation && vpState.representation !== ctrl.representation) ctrl.setRepresentation(vpState.representation as RepresentationType);
    if (vpState.coloring && vpState.coloring !== ctrl.coloring) ctrl.setColoring(vpState.coloring as ColoringType);
    if (vpState.isSpinning !== undefined && vpState.isSpinning !== ctrl.isSpinning) ctrl.setIsSpinning(vpState.isSpinning);

    // Toggles
    if (vpState.showLigands !== undefined && vpState.showLigands !== ctrl.showLigands) ctrl.setShowLigands(vpState.showLigands);
    if (vpState.showSurface !== undefined && vpState.showSurface !== ctrl.showSurface) ctrl.setShowSurface(vpState.showSurface);
    if (vpState.showIons !== undefined && vpState.showIons !== ctrl.showIons) ctrl.setShowIons(vpState.showIons);

    // Custom Styles & Data
    // JSON stringify comparison for deep objects to avoid loops/unnecessary updates
    // if (vpState.customColors !== undefined && JSON.stringify(vpState.customColors) !== JSON.stringify(ctrl.customColors)) ctrl.setCustomColors(vpState.customColors);
    if (vpState.customColors !== undefined) ctrl.setCustomColors(vpState.customColors);
    if (vpState.customTransparency !== undefined) ctrl.setCustomTransparency(vpState.customTransparency);
    if (vpState.customBackgroundColor !== undefined && vpState.customBackgroundColor !== ctrl.customBackgroundColor) ctrl.setCustomBackgroundColor(vpState.customBackgroundColor);

    // Analysis/Measurements
    if (vpState.measurements !== undefined) ctrl.setMeasurements(vpState.measurements);
    if (vpState.highlightedResidue !== undefined) ctrl.setHighlightedResidue(vpState.highlightedResidue);

    // Metadata (chains/ligands might be derived, but good to ensure sync if manual override happened)
    if (vpState.chains) ctrl.setChains(vpState.chains);
    if (vpState.ligands) ctrl.setLigands(vpState.ligands);
    if (vpState.proteinTitle && vpState.proteinTitle !== ctrl.proteinTitle) ctrl.setProteinTitle(vpState.proteinTitle);

    // Also apply Global props if needed
    if (state.viewMode && state.viewMode !== viewMode) setViewMode(state.viewMode);

    // Camera is handled separately
  }, [controllers, viewMode]);

  const handlePlaybackCameraChange = useCallback((orientation: any) => {
    if (viewerRefs[0].current) viewerRefs[0].current.setOrientation(orientation);
  }, []);

  const recorder = useSessionRecorder({
    onPlaybackStateChange: handlePlaybackStateChange,
    onPlaybackCameraChange: handlePlaybackCameraChange
  });


  // Broadcast Outgoing State
  useEffect(() => {
    if (peerSession.isConnected) {
      const ctrl = controllers[0];

      // Explicit Echo Cancellation (Equality Check)
      // If I am NOT the host (Guest), and the state I am about to broadcast MATCHES
      // the state I last received from the Host, then I should remain silent.
      // This proves that my local change was just a mirror of the Host's update.
      // I only broadcast if I have DEVIATED from the Host (User interaction).
      if (!peerSession.isHost && peerSession.lastReceivedState) {
        const received = peerSession.lastReceivedState;

        // Pass the Chalk: If I am NOT the controller, I should NOT broadcast state changes (unless I am Host)
        const myPeerId = peerSession.peerId;
        const activeControllerId = controllerId; // From state

        // If there is an active controller spread, and it's NOT me, stay silent.
        // Host always allows relay, but Guests only if they are the controller.
        if (activeControllerId && activeControllerId !== myPeerId) {
          return;
        }

        const matchesReceived =
          (received.pdbId === undefined || received.pdbId === ctrl.pdbId) &&
          (received.representation === undefined || received.representation === ctrl.representation) &&
          (received.coloring === undefined || received.coloring === ctrl.coloring) &&
          (received.isSpinning === undefined || received.isSpinning === ctrl.isSpinning) &&
          (received.highlightedResidue === undefined || deepEqual(received.highlightedResidue, ctrl.highlightedResidue)) &&
          (received.customColors === undefined || deepEqual(received.customColors, ctrl.customColors)) &&
          (received.customTransparency === undefined || deepEqual(received.customTransparency, ctrl.customTransparency)) &&
          (received.measurements === undefined || deepEqual(received.measurements, ctrl.measurements)) &&
          (received.customBackgroundColor === undefined || received.customBackgroundColor === ctrl.customBackgroundColor) &&
          (received.hoveredResidue === undefined || deepEqual(received.hoveredResidue, hoveredResidue));

        if (matchesReceived) {
          return;
        }
      }

      peerSession.broadcastState({
        pdbId: ctrl.pdbId,
        representation: ctrl.representation,
        coloring: ctrl.coloring,
        isSpinning: ctrl.isSpinning,
        highlightedResidue: ctrl.highlightedResidue,
        customColors: ctrl.customColors,
        customTransparency: ctrl.customTransparency,
        measurements: ctrl.measurements,
        hoveredResidue: hoveredResidue,
        controllerId: controllerId, // Keep syncing the controller ID
        annotations: annotations
      });
    }
  }, [
    // Dependency array includes everything we want to broadcast
    controllers[0].pdbId,
    controllers[0].representation,
    controllers[0].coloring,
    controllers[0].isSpinning,
    controllers[0].highlightedResidue,
    controllers[0].customColors,
    controllers[0].customTransparency,
    controllers[0].measurements,
    controllers[0].customBackgroundColor,
    hoveredResidue,
    controllerId,
    annotations,
    peerSession.isConnected,
    peerSession.connections // Broadcast when new peers join
  ]);
  const [isSuperpositionModalOpen, setIsSuperpositionModalOpen] = useState(false); // Contact/Feedback Modal

  // --- Residue-Specific Coloring State ---


  // --- Multi-View Tool Actions Implementation ---



  const handleToolAction = (type: 'snapshot' | 'record' | 'reset' | 'save' | 'load' | 'share', args?: any) => {
    if (type === 'share') {
      // Share is global or context-aware but we just open the modal with the global state
      setShowShareModal(true);
      return;
    }

    // Special handling for snapshots: show unified snapshot modal
    if (type === 'snapshot') {
      setIsSnapshotModalOpen(true);
      return;
    }

    // For other actions (record, reset, save, load)
    if (viewMode === 'single') {
      // Direct execution for single view
      executeAction(type, [0], args);
    } else {
      // Open selector for multi-view
      setPendingToolAction({ type, args });
      setIsSelectorOpen(true);
    }
  };

  const executeAction = async (type: string, indices: number[], args?: any) => {
    // 2. Helper to interact with specific controller/viewer
    const runOnIndex = async (idx: number) => {
      const ctrl = controllers[idx];
      const ref = viewerRefs[idx];

      switch (type) {
        case 'reset':
          ctrl.handleResetView();
          ref.current?.resetCamera();
          break;

        case 'snapshot':
          if (ref.current) {
            const factor = args?.factor || 1; // Quality factor from SnapshotModal
            const transparent = args?.transparent !== undefined ? args.transparent : true; // Default transparent
            const blob = await ref.current.getSnapshotBlob(factor, transparent);
            if (blob) {
              const url = URL.createObjectURL(blob);
              const newSnapshot: Snapshot = {
                id: crypto.randomUUID(),
                url,
                timestamp: Date.now()
              };
              setSnapshots(prev => [newSnapshot, ...prev]);
              logEvent('take_snapshot', { factor: factor, transparent: transparent });
            }
          }
          break;

        case 'save':
          // Now handleSaveSession saves the entire viewport state, ignoring index for now as per V2 design
          // But if we want to export specific VIEWPORT state as a session, we could.
          // However, user asked for "Save actions should preserve the exact layout".
          // So "Save Session" is a global action.
          // We will just trigger handleSaveSession once.
          if (idx === indices[0]) { // Only run once if multiple selected
            handleSaveSession();
          }
          break;

        case 'record':
          if (ref.current) {
            handleRecordMovieTargeted(idx, args?.duration || 4000);
          }
          break;
      }
    };

    // 3. Execute for all selected indices
    for (const idx of indices) {
      await runOnIndex(idx);
    }

    if (type === 'snapshot') success(`${indices.length > 1 ? 'Snapshots' : 'Snapshot'} captured ✓`);
    if (type === 'reset') {
      // info is not strictly required if we just show success or nothing
    }
    if (type === 'save') {
      // Handled inside runOnIndex
    }
  };

  const handleSelectorConfirm = (indices: number[]) => {
    setIsSelectorOpen(false);

    if (pendingToolAction && indices.length > 0) {
      executeAction(pendingToolAction.type, indices, pendingToolAction.args);
      setPendingToolAction(null);
    }
  };

  const handleSnapshotConfirm = (viewportIndices: number[], qualityFactor: number, transparent: boolean) => {
    setIsSnapshotModalOpen(false);
    executeAction('snapshot', viewportIndices, { factor: qualityFactor, transparent });
  };




  // Derived Accessors for "Active" Context (Sidebar, Controls, etc operate on this)
  const activeController = controllers[activeViewIndex];
  const viewerRef = viewerRefs[activeViewIndex];

  // Metadata Management for all controllers
  useStructureMetadata(controllers[0]);
  useStructureMetadata(controllers[1]);
  useStructureMetadata(controllers[2]);
  useStructureMetadata(controllers[3]);

  // Destructure Active Controller for UI Consistency
  const {
    pdbId, setPdbId,
    dataSource, setDataSource,
    file, setFile,

    representation, setRepresentation,
    coloring, setColoring,
    customColors, setCustomColors,
    chainStyles, setChainStyle, // Destructure
    customStyles, setCustomStyles,
    customTransparency, setCustomTransparency,
    smoothSheetEnabled, setSmoothSheetEnabled,
    isSpinning, setIsSpinning,
    isRocking, setIsRocking,
    showSurface, setShowSurface,
    showLigands, setShowLigands,
    showIons, setShowIons,
    customBackgroundColor, setCustomBackgroundColor,
    chains,
    ligands,
    pdbMetadata, setPdbMetadata,
    proteinTitle, setProteinTitle,
    highlightedResidue, setHighlightedResidue,
    measurements, setMeasurements,
    isMeasurementPanelOpen, setIsMeasurementPanelOpen,
    handleUpload,
    handleResetView,

  } = activeController;




  // Removed hasRestoredState as it is no longer used
  // const [hasRestoredState, setHasRestoredState] = useState(!!initialUrlState.orientation);
  const [isMeasurementMode, setIsMeasurementMode] = useState(false);

  useEffect(() => {
    // Check for onboarding tour
    const hasSeenTour = localStorage.getItem('hasSeenViewerTour');
    if (!hasSeenTour) {
      // Mark as seen immediately on mobile so they aren't trapped by driver.js crashes
      if (window.innerWidth < 768) {
        localStorage.setItem('hasSeenViewerTour', 'true');
        return;
      }

      // Explicitly load default structure for the tour locally
      fetch(`${import.meta.env.BASE_URL}models/2B3P.pdb`)
        .then(res => res.blob())
        .then(blob => {
          setFile(new File([blob], "2B3P.pdb", { type: "chemical/x-pdb" }));
          setPdbId('');
          setProteinTitle(null);

          // Delay to ensure the structure mounts in NGL viewport
          setTimeout(() => {
            startOnboardingTour(() => {
              localStorage.setItem('hasSeenViewerTour', 'true');
            }, handleTourHighlight, false);
          }, 1500);
        });
    }
  }, []);

  // Handle Default Loading on DataSource Switch
  useEffect(() => {
    // Removed auto-loading of default structures to prevent unwanted overlays
    // Users should explicitly select structures from the library or enter IDs
  }, [dataSource]);

  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);


  // Ref to prevent "echo" loops (receiving state -> updating local -> triggering broadcast -> sending back)
  const isApplyingRemoteUpdate = useRef(false);

  // LOCK: Timestamp of last local measurement update to prevent race conditions
  const lastLocalMeasurementUpdate = useRef(0);

  // Sync Incoming State
  useEffect(() => {
    if (peerSession.lastReceivedState) {
      // Set flag to prevent broadcast loop
      isApplyingRemoteUpdate.current = true;

      const s = peerSession.lastReceivedState;

      // Handle Multi-View State
      if (s.viewMode && s.viewports) {
        if (viewMode !== s.viewMode) setViewMode(s.viewMode);

        s.viewports.forEach((vp: any, index: number) => {
          const ctrl = controllers[index];
          if (!ctrl) return;

          if (vp.pdbId && vp.pdbId !== ctrl.pdbId) ctrl.setPdbId(vp.pdbId);
          if (vp.representation && vp.representation !== ctrl.representation) ctrl.setRepresentation(vp.representation as RepresentationType);
          if (vp.coloring && vp.coloring !== ctrl.coloring) ctrl.setColoring(vp.coloring as ColoringType);
          if (vp.isSpinning !== undefined && vp.isSpinning !== ctrl.isSpinning) ctrl.setIsSpinning(vp.isSpinning);
          if (vp.customColors) ctrl.setCustomColors(vp.customColors);
          if (vp.customColors) ctrl.setCustomColors(vp.customColors);
          if (vp.customTransparency) ctrl.setCustomTransparency(vp.customTransparency);

          // GUARD: Only update measurements if we haven't touched them locally recently (2s lock)
          if (vp.measurements && (Date.now() - lastLocalMeasurementUpdate.current > 2000)) {
            ctrl.setMeasurements(vp.measurements);
          }

          if (vp.customBackgroundColor) ctrl.setCustomBackgroundColor(vp.customBackgroundColor);
        });
      }
      // Fallback: Legacy Single View Sync
      else {
        const ctrl = controllers[0];
        if (s.pdbId && s.pdbId !== ctrl.pdbId) ctrl.setPdbId(s.pdbId);
        if (s.representation && s.representation !== ctrl.representation) ctrl.setRepresentation(s.representation as RepresentationType);
        if (s.coloring && s.coloring !== ctrl.coloring) ctrl.setColoring(s.coloring as ColoringType);
        if (s.isSpinning !== undefined && s.isSpinning !== ctrl.isSpinning) ctrl.setIsSpinning(s.isSpinning);
        if (s.highlightedResidue !== undefined) ctrl.setHighlightedResidue(s.highlightedResidue);

        // GUARD: Only update measurements if we haven't touched them locally recently (2s lock)
        if (s.measurements && (Date.now() - lastLocalMeasurementUpdate.current > 2000)) {
          ctrl.setMeasurements(s.measurements);
        }
      }

      // Reset flag after render
      setTimeout(() => {
        isApplyingRemoteUpdate.current = false;
      }, 300);
    }
  }, [peerSession.lastReceivedState, viewMode, controllers]);

  // Sync Incoming Camera
  useEffect(() => {
    // We need to support Multi-View Camera sync too
    // broadcastCamera likely needs to send index?
    // Current broadcastCamera in usePeerSession sends { orientation, ... }
    // It doesn't seem to support index.
    // Ideally we should update usePeerSession to send { index, orientation } 
    // OR we broadcast orientation inside the main state object (throttled).
    // The previous implementation used a dedicated channel for performance.

    // For now, rely on single view camera sync (index 0).
    // Supporting multi-view camera sync properly requires updating the peer protocol.
    // Given the time, let's keep camera sync on Viewport 0.
    if (peerSession.lastReceivedCamera && viewerRefs[0].current) {
      viewerRefs[0].current.setOrientation(peerSession.lastReceivedCamera);
    }
  }, [peerSession.lastReceivedCamera]);


  // Broadcast Outgoing State
  // REPLACED by the new useEffect above (lines 750+)
  // We should remove this old block to avoid double broadcasts or conflicts.
  /* useEffect(() => {
    if (peerSession.isConnected) {
       // ... OLD broadcast logic ...
    }
  }, [...]); */

  // --- P2P FILE SHARING ---
  // 1. File Upload Wrapper (Triggered by Host)
  const handleFileUploadWithSync = useCallback((file: File) => {
    // Load locally
    handleUpload(file);

    // Auto-save to Supabase if user is logged in (silent — never blocks the viewer)
    if (user?.id) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdb';
      const allowedExts = ['pdb', 'cif', 'mmcif', 'sdf', 'mol', 'mol2'];
      if (allowedExts.includes(ext)) {
        uploadStructure(file, user.id).catch(err =>
          console.warn('[AutoSave] Could not save structure to dashboard:', err)
        );
      }
    }

    // Broadcast if Host
    if (peerSession.isHost) {
      console.log('Broadcasting File:', file.name);
      peerSession.broadcastFile(file);
      sendSystemLog(`Shared file: ${file.name}`);
    }
  }, [handleUpload, peerSession, sendSystemLog, user]);

  // 2. File Receiver (Guests)
  useEffect(() => {
    if (peerSession.lastReceivedFile && !peerSession.isHost) {
      const { name, data } = peerSession.lastReceivedFile;
      console.log('Auto-loading shared file:', name);

      // Create File object from ArrayBuffer
      const receivedFile = new File([data], name);
      console.log(`[App] P2P Received File: ${name} | Size: ${receivedFile.size} | Type: ${receivedFile.type}`);

      // Load it!
      handleUpload(receivedFile);
    }
  }, [peerSession.lastReceivedFile, peerSession.isHost, handleUpload]);





  useEffect(() => {
    localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
  }, [isLightMode]);

  // Embed Mode State
  const [isEmbedMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('embed') === 'true';
  });

  // Presentation State
  // isSpinning extracted to hook
  // Presentation State
  // isSpinning extracted to hook
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [showContactMap, setShowContactMap] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [embedOrientation, setEmbedOrientation] = useState<any>(null);

  // Landing Overlay State
  // Handle Embed Options (Custom Controls)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isEmbed = params.get('embed') === 'true';

    if (isEmbed) {
      // Auto-Spin
      if (params.get('spin') === 'true') {
        setIsSpinning(true);
      }
      // Hide UI (Clean Mode)
      if (params.get('ui') === 'false') {
        setIsCleanMode(true);
      }
      // Transparent Background
      if (params.get('bg') === 'transparent') {
        setCustomBackgroundColor('transparent');
        document.documentElement.style.setProperty('--body-bg', 'transparent');
      }
      // Force Theme
      const themeParam = params.get('theme');
      if (themeParam === 'light') setIsLightMode(true);
      if (themeParam === 'dark') setIsLightMode(false);

      // Orientation
      const orientationParam = params.get('orientation');
      if (orientationParam) {
        try {
          const orientation = JSON.parse(orientationParam);
          // We'll add a new state for it.
          setEmbedOrientation(orientation);
        } catch (e) {
          console.warn("Invalid orientation param", e);
        }
        // Accent Color



      }
    }

    // Listen for cross-origin messages (from ShareModal parent)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_ORIENTATION') {
        console.log("App: Received REQUEST_ORIENTATION");
        // Get orientation from view 0 (main viewer)
        const viewerRef = viewerRefs[0]?.current;
        const orientation = viewerRef?.getOrientation();
        console.log("App: Orientation retrieved:", orientation, "Ref present:", !!viewerRef);

        if (orientation) {
          // For same-window communication, post back to window
          console.log("App: Posting ORIENTATION_RESPONSE");
          window.postMessage({
            type: 'ORIENTATION_RESPONSE',
            orientation: orientation
          }, '*');
        } else {
          console.warn("App: Orientation is null or ref missing");
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Interaction State (for Static Embeds)
  const isInteractionEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('interaction') !== 'false';
  }, []);

  // Scroll Protection State (Default: Scroll Enabled)
  const isScrollEnabled = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('scroll') !== 'false';
  }, []);

  const [showLanding, setShowLanding] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPdb = params.has('pdb') || params.has('url') || params.has('file');
    const isEmbed = params.get('embed') === 'true';
    // Show only if no deep link and not embedded
    return !hasPdb && !isEmbed;
  });

  // Lazy Load State REMOVED
  // const [isLazyLoaded, setIsLazyLoaded] = useState(() => {
  //   const params = new URLSearchParams(window.location.search);
  //   return params.get('lazy') === 'true';
  // });

  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [favoritesTab, setFavoritesTab] = useState<'favorites' | 'history'>('favorites');

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [colorPalette, setColorPalette] = useState<ColorPalette>('standard');

  // Multi-View Sharing Selection State
  // Default to all indices [0, 1, 2, 3] until user changes it
  const [sharedViewportIndices, setSharedViewportIndices] = useState<number[]>([0, 1, 2, 3]);

  // Effect to initialize shared indices based on content when loading?
  // Actually, better to just default to ALL, and let user deselect active ones.
  // But we want to filter OUT empty ones by default maybe?
  // Let's stick to simple default: Select All.

  // BROADCAST STATE EFFECT
  // This broadcasts visual state changes to peers AND records them if recording
  useEffect(() => {
    // 1. Gather State for all viewports
    const viewportsState = controllers.map((ctrl, index) => {
      if (!sharedViewportIndices.includes(index)) return {};

      return {
        pdbId: ctrl.pdbId,
        representation: ctrl.representation,
        coloring: ctrl.coloring,
        isSpinning: ctrl.isSpinning,
        showLigands: ctrl.showLigands,
        showSurface: ctrl.showSurface,
        showIons: ctrl.showIons,
        customColors: ctrl.customColors,
        dataSource: ctrl.dataSource,
        measurements: ctrl.measurements,
        customBackgroundColor: ctrl.customBackgroundColor,
        highlightedResidue: ctrl.highlightedResidue,
        ligands: ctrl.ligands,
        chains: ctrl.chains,
        proteinTitle: ctrl.proteinTitle,
      };
    });

    const multiViewState = {
      viewMode: viewMode,
      viewports: viewportsState
    };

    // 2. Broadcast if connected
    if (peerSession.isConnected && !isApplyingRemoteUpdate.current) {
      peerSession.broadcastState(multiViewState);
    }

    // 3. Record if recording
    if (recorder.isRecording) {
      recorder.recordEvent('state', multiViewState);
      // Camera recorded separately in loop
    }

  }, [
    peerSession.isConnected,
    recorder.isRecording,
    viewMode,
    sharedViewportIndices,
    // Deep dependencies for change detection
    controllers.map(c => c.pdbId).join(','),
    controllers.map(c => c.representation).join(','),
    controllers.map(c => c.coloring).join(','),
    controllers.map(c => c.isSpinning).join(','),
    controllers.map(c => c.highlightedResidue).join(','),
    hoveredResidue
  ]);

  // Dedicated Camera Recording Loop (30fps)
  useEffect(() => {
    if (!recorder.isRecording) return;

    const interval = setInterval(() => {
      if (viewerRefs[0].current) {
        const orientation = viewerRefs[0].current.getOrientation();
        // The recorder handles dedup logic (or we trust it to be lightweight)
        // But we should probably check if it changed to avoid spamming 1000s of identical frames
        // Actually recordEvent blindly pushes. We should filter here or in hook.
        // Let's rely on JSON stringify in hook or here.
        // For now, let's just record. App is small.
        recorder.recordEvent('camera', orientation);
      }
    }, 8); // ~120fps

    return () => clearInterval(interval);
  }, [recorder.isRecording]);
  // Accessibility: Dyslexic Font
  const [isDyslexicFont, setIsDyslexicFont] = useState(false);

  useEffect(() => {
    if (isDyslexicFont) {
      document.body.style.fontFamily = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif';
      document.body.style.letterSpacing = '0.05em';
      document.body.style.lineHeight = '1.6';
    } else {
      document.body.style.fontFamily = '';
      document.body.style.letterSpacing = '';
      document.body.style.lineHeight = '';
    }
  }, [isDyslexicFont]);

  // Interaction Wrapper State
  const [hasInteracted, setHasInteracted] = useState(false);
  const params = new URLSearchParams(window.location.search);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'appearance': true,
    'analysis': false,
    'tools': false,
    'motif-search': false
  });

  const handleToggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleTourHighlight = (elementId: string) => {
    console.log('Tour highlight:', elementId); // Debug log

    // If on mobile, expand/collapse the mobile sidebar so tooltips anchor correctly
    if (window.innerWidth < 768) {
      if (elementId === '#protein-viewer-canvas') {
        setIsMobileMenuOpen(false);
      } else {
        setIsMobileMenuOpen(true);
      }
    }

    // Close all and open only the target section
    const newSections = {
      'appearance': false,
      'analysis': false,
      'tools': false,
      'motif-search': false
    };

    if (elementId === '#visualization-controls' || elementId === '#viewport-controls') {
      newSections['appearance'] = true;
    } else if (elementId === '#analysis-tools') {
      newSections['analysis'] = true;
    } else if (elementId === '#export-tools' || elementId === '#media-gallery-btn') {
      newSections['tools'] = true;
    } else if (elementId === '#sequence-track') {
      newSections['analysis'] = true;
    } else if (elementId === '#motif-search') {
      newSections['motif-search'] = true;
    }

    setOpenSections(newSections);
  };

  const handleStartRecording = useCallback(() => {
    const viewportsState = controllers.map((ctrl, _index) => ({
      pdbId: ctrl.pdbId,
      representation: ctrl.representation,
      coloring: ctrl.coloring,
      isSpinning: ctrl.isSpinning,
      showLigands: ctrl.showLigands,
      showSurface: ctrl.showSurface,
      showIons: ctrl.showIons,
      customColors: ctrl.customColors,
      dataSource: ctrl.dataSource,
      measurements: ctrl.measurements,
      customBackgroundColor: ctrl.customBackgroundColor,
      highlightedResidue: ctrl.highlightedResidue,
      ligands: ctrl.ligands,
      chains: ctrl.chains,
      proteinTitle: ctrl.proteinTitle,
    }));

    const fullState = {
      viewMode,
      viewports: viewportsState
    };
    recorder.startRecording(fullState);
  }, [controllers, viewMode, recorder]);

  // Video Export Logic
  // Video Export Logic
  // (Instant export removed in favor of composited high-quality export)

  // Effect: Clear live blob when session is edited (trim/delete) - REMOVED

  // Monitor Video Export Completion - REMOVED


  const handleStartTour = () => {
    // Determine context (simple check based on dataSource or explicit logic)
    const isChemicalContext = dataSource === 'pubchem';
    const hasStructure = !!pdbId || !!file;

    if (hasStructure) {
      startOnboardingTour(() => {
        localStorage.setItem('hasSeenViewerTour', 'true');
      }, handleTourHighlight, isChemicalContext);
    } else {
      // Load default structure explicitly if none loaded
      if (isChemicalContext) {
        setPdbId('2244');
        setFile(null); // Ensure no file conflict
        setProteinTitle(null);

        // Wait for load to propagate before starting tour
        setTimeout(() => {
          startOnboardingTour(() => {
            localStorage.setItem('hasSeenViewerTour', 'true');
          }, handleTourHighlight, true);
        }, 2000); // 2s delay to allow fetching and rendering
      } else {
        // Fetch local 2B3P robustly for the tour
        fetch(`${import.meta.env.BASE_URL}models/2B3P.pdb`)
          .then(res => res.blob())
          .then(blob => {
            setFile(new File([blob], "2B3P.pdb", { type: "chemical/x-pdb" }));
            setPdbId('');
            setProteinTitle(null);

            // Wait for parse to propagate
            setTimeout(() => {
              startOnboardingTour(() => {
                localStorage.setItem('hasSeenViewerTour', 'true');
              }, handleTourHighlight, false);
            }, 1000);
          });
      }
    }
  };

  // Custom Colors need to be initialized too




  // ... (lines 53-343) ...

  // Actually, we should only clear if not restoring? 
  // So here we should NOT clear them.

  // Removed legacy orientation restore effect




  // Snapshot Gallery State
  // Snapshot & Movie Gallery State
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);

  // Visualization Toggles

  // Visualization Toggles
  // Tools

  // Visualization Toggles
  // Tools

  // highlightedResidue, chains, ligands, fileType extracted to hook.



  // handleResetView and handleUpload extracted to hook

  const [isPublicationMode, setIsPublicationMode] = useState(false);

  // Store previous theme to restore after exiting Publication Mode
  const previousThemeRef = useRef(isLightMode);

  const togglePublicationMode = useCallback((shouldBeEnabled?: boolean) => {
    const nextState = shouldBeEnabled !== undefined ? shouldBeEnabled : !isPublicationMode;

    if (nextState === isPublicationMode) return;

    setIsPublicationMode(nextState);

    if (nextState) {
      // Enable
      previousThemeRef.current = isLightMode;
      setRepresentation('cartoon');
      setIsCleanMode(true);
      setColoring('chainid');
      setCustomBackgroundColor('#ffffff'); // White background
      setIsLightMode(true); // Ensure light mode for paper look
    } else {
      // Disable
      setIsCleanMode(false);
      setCustomBackgroundColor(null); // Revert to theme
      setIsLightMode(previousThemeRef.current); // Restore original theme
    }
  }, [isPublicationMode, isLightMode]);




  // ... (fetchTitle logic) ... 

  // Undo/Redo Stack (Moved here to access all state variables)
  const visualState: VisualState = useMemo(() => ({
    representation,
    coloring,
    colorPalette,
    showLigands,
    showIons,
    showSurface,
    customBackgroundColor: customBackgroundColor || '',
    isSpinning,
    isCleanMode,
    showContactMap,
    isPublicationMode,
    highlightedResidue,
    measurements
  }), [representation, coloring, colorPalette, showLigands, showIons, showSurface, customBackgroundColor, isSpinning, isCleanMode, showContactMap, isPublicationMode, highlightedResidue, measurements]);

  const handleVisualStateChange = useCallback((newState: VisualState) => {
    setRepresentation(newState.representation);
    setColoring(newState.coloring);
    setColorPalette(newState.colorPalette);
    setShowLigands(newState.showLigands);
    setShowIons(newState.showIons);
    setShowSurface(newState.showSurface);
    setCustomBackgroundColor(newState.customBackgroundColor || null);
    setIsSpinning(newState.isSpinning);
    setIsCleanMode(newState.isCleanMode);
    setShowContactMap(newState.showContactMap);
    setIsPublicationMode(newState.isPublicationMode);
    setHighlightedResidue(newState.highlightedResidue);
    setMeasurements(newState.measurements);
  }, []);

  const { undo, redo, canUndo, canRedo } = useVisualStack({
    state: visualState,
    onChange: handleVisualStateChange,
    resetTrigger: pdbId
  });

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      }
      if ((e.key === 'Escape' || e.code === 'Escape') && isPublicationMode) {
        e.preventDefault();
        e.stopPropagation(); // Ensure we consume it
        togglePublicationMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [undo, redo, canUndo, canRedo, isPublicationMode, togglePublicationMode]);

  // --- DERIVED STATE (Dr. AI V4) ---
  const structureStats = useMemo(() => {
    const chainCount = chains.length;
    const ligandCount = ligands.length;
    let residueCount = 0;

    chains.forEach(chain => {
      if (chain.sequence) {
        residueCount += chain.sequence.length;
      } else if (chain.max && chain.min) {
        residueCount += (chain.max - chain.min + 1);
      }
    });

    return { chainCount, residueCount, ligandCount };
  }, [chains, ligands]);

  const handleAtomClick = (
    info: { chain: string; resNo: number; resName: string; atomIndex?: number; position?: { x: number; y: number; z: number } } | null,
    controllerIndex = activeViewIndex
  ) => {
    const ctrl = controllers[controllerIndex];
    const ref = viewerRefs[controllerIndex];

    if (!info) {
      ctrl.setHighlightedResidue(null);
      ref.current?.clearHighlight?.();
    } else {
      if (isMeasurementMode || (highlightedResidue?.chain === info.chain && highlightedResidue?.resNo === info.resNo)) {
        // Ignore if measurement mode or same residue
      } else {
        console.log("App: Atom Clicked", info);
        ctrl.setHighlightedResidue({ chain: info.chain, resNo: info.resNo, resName: info.resName });
        ref.current?.highlightResidue(info.chain, info.resNo);

        // Auto-switch active view if clicking inactive
        if (controllerIndex !== activeViewIndex) {
          setActiveViewIndex(controllerIndex);
        }
      }
    }
  };

  const handleHighlightResidue = (chain: string, resNo: number) => {
    setHighlightedResidue({ chain, resNo, resName: '' });
    viewerRef.current?.highlightResidue(chain, resNo);
  };

  const handleLoad = useCallback((info: StructureInfo, ctrl: StructureController) => {
    ctrl.setChains(info.chains);
    ctrl.setLigands(info.ligands);

    const hasPolymer = info.chains.some(c => c.type === 'protein' || c.type === 'nucleic');
    const totalResidues = info.chains.reduce((acc, c) => acc + c.sequence.length, 0);

    // Smart Representation Switching
    if (info.isSmallMolecule || !hasPolymer || totalResidues < 5) {
      // Small Molecule Logic
      if (totalResidues > 500) { // Increased threshold
        // "Large" Chemical (e.g. complex natural product or supramolecular assembly)
        console.log("App: Detected large non-polymer. Switching to Licorice for performance.");
        ctrl.setRepresentation('line');
        ctrl.setColoring('element');
      } else {
        console.log("App: Detected small molecule. Switching to Ball+Stick.");
        ctrl.setRepresentation('ball+stick');
        ctrl.setColoring('element');
      }

      ctrl.setShowLigands(true);
      if (info.chains.length > 0) ctrl.setShowIons(true);
    }
    // For proteins: Don't auto-switch, let user's selection persist

    // Add to History (using global helper)
    if (ctrl.dataSource === 'pdb' && ctrl.pdbId) {
      addToHistory(ctrl.pdbId, 'pdb');
    } else if (ctrl.dataSource === 'pubchem' && ctrl.pdbId) {
      addToHistory(ctrl.pdbId, 'pubchem');
    }

    // Multi-View Orientation Restore
    // Find index of this controller
    const index = controllers.indexOf(ctrl);
    if (index !== -1 && initialUrlState.viewports?.[index]?.orientation) {
      // Restore orientation for Viewport 0 if present (now handled by initialOrientation prop for V0, but explicit logic here for others/restore)
      setTimeout(() => {
        viewerRefs[index].current?.setOrientation(initialUrlState.viewports[index].orientation);
      }, 500);
    }
  }, [addToHistory, controllers, initialUrlState]);

  const handlePdbIdChange = (id: string) => {

    activeController.setPdbId(id);
    activeController.setFile(null);
    activeController.setProteinTitle(null);
    activeController.setChains([]);
    activeController.setHighlightedResidue(null);
    activeController.setMeasurements([]);

    // Reset representation to cartoon (default) when changing structures
    // This prevents ball+stick from persisting from chemical loads
    if (activeController.representation === 'ball+stick') {
      activeController.setRepresentation('cartoon');
    }
  };




  const [isRecording, setIsRecording] = useState(false);

  // targeted record
  const handleRecordMovieTargeted = async (index: number, duration: number) => {
    const ref = viewerRefs[index];
    if (ref.current) {
      setIsRecording(true);
      try {
        const blob = await ref.current.recordTurntable(duration);
        const mimeType = blob.type;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const newMovie: Movie = {
          id: crypto.randomUUID(),
          url: URL.createObjectURL(blob),
          blob: blob,
          timestamp: Date.now(),
          duration: duration / 1000,
          format: ext,
          pdbId: pdbId || undefined,
          description: `Movie of ${pdbId || 'structure'}`
        };
        setMovies(prev => [newMovie, ...prev]);
      } catch (e) { console.error(e); }
      finally { setIsRecording(false); }
    }
  };


  const handleRecordMovie = async (duration: number = 4000) => {
    handleToolAction('record', { duration });
  };

  const handleDownloadMovie = (id: string) => {
    const movie = movies.find(m => m.id === id);
    if (movie) {
      const a = document.createElement('a');
      a.href = movie.url;
      a.download = `protein-turntable-${pdbId || 'structure'}-${movie.id.slice(0, 4)}.${movie.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDeleteMovie = (id: string) => {
    const movie = movies.find(m => m.id === id);
    if (movie) {
      URL.revokeObjectURL(movie.url);
      setMovies(prev => prev.filter(m => m.id !== id));
    }
  };



  const handleFocusLigands = () => {
    viewerRef.current?.focusLigands();
  };

  const getAtomDataWrapper = async () => {
    if (viewerRef.current) {
      return await viewerRef.current.getAtomCoordinates();
    }
    return [];
  };



  const handlePixelClick = (chainA: string, resA: number, chainB: string, resB: number) => {
    // 1. Visualize the Contact Line
    viewerRef.current?.visualizeContact(chainA, resA, chainB, resB);

    // 2. Log selection
    console.log(`Contact Map Interaction: ${chainA}:${resA} <-> ${chainB}:${resB}`);
  };

  // Session Management
  // Session Management
  // Session Management
  const handleSaveSession = async () => {
    try {
      console.log("Saving session (V2)...");

      // 1. Gather Data (Async)
      const viewportsPromises = controllers.map(async (ctrl, index) => {
        const ref = viewerRefs[index];
        let fileContent: string | undefined = undefined;

        // Capture Content if possible (especially for local files)
        // We check if PDB ID looks like a local filename or "Unknown", or explicit logic
        // DataSource 'file' doesn't exist in type, usually it's 'url' or 'pdb' with non-standard ID
        const isLocal = !ctrl.pdbId || ctrl.pdbId === 'Unknown' || ctrl.pdbId.includes('.') || (ctrl.dataSource as any) === 'file' || (ctrl.dataSource as any) === 'url' || ctrl.pdbId.length > 5;

        if (isLocal && ref.current && ref.current.getPdbBlob) {
          const blob = ref.current.getPdbBlob();
          if (blob) {
            fileContent = await blob.text();
          }
        }

        return {
          id: ctrl.pdbId,
          pdbId: ctrl.pdbId,
          dataSource: ctrl.dataSource,
          fileContent: fileContent, // New Field
          representation: ctrl.representation,
          coloring: ctrl.coloring,
          showSurface: ctrl.showSurface,
          showLigands: ctrl.showLigands,
          showIons: ctrl.showIons,
          isSpinning: ctrl.isSpinning,
          customBackgroundColor: ctrl.customBackgroundColor,
          isMeasurementMode: isMeasurementMode,
          measurements: ctrl.measurements,
          customColors: ctrl.customColors,
          overlays: ctrl.overlays,
          orientation: ref.current?.getOrientation()
        };
      });

      const viewportsData = await Promise.all(viewportsPromises);

      // Construct Data safely (V2 Format)
      const sessionData = {
        version: 2,
        viewMode: viewMode,
        timestamp: Date.now(),
        // Global boolean flags or specific viewport data
        isLightMode,
        isCleanMode,
        palette: colorPalette,
        snapshots, // Global snapshots
        // The core data
        viewports: viewportsData
      };

      console.log("Session data prepared (V2), converting to JSON...");

      // 4. Safe Stringify
      const jsonString = JSON.stringify(sessionData, (key, value) => {
        if (key === 'viewerRef' || key === 'stageRef' || key === 'structure') return undefined;
        return value;
      }, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `session-multiview-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      success("Session saved successfully ✓");
    } catch (e) {
      console.error("CRITICAL SAVE ERROR:", e);
      alert(`Failed to save session: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ── Quick Save to My Structures ────────────────────────────────
  const [quickSaving, setQuickSaving] = useState(false);
  const handleQuickSave = async () => {
    if (!user?.id) { error("Sign in to save structures to your library."); return; }
    const ctrl = controllers[0];
    setQuickSaving(true);
    try {
      if (ctrl.file) {
        await uploadStructure(ctrl.file, user.id);
        success(`"${ctrl.file.name.replace(/\.[^/.]+$/, '')}" saved to My Structures ✓`);
      } else if (ctrl.pdbId) {
        const res = await fetch(`https://files.rcsb.org/download/${ctrl.pdbId.toUpperCase()}.pdb`);
        if (!res.ok) throw new Error('Could not fetch from RCSB');
        const blob = await res.blob();
        const file = new File([blob], `${ctrl.pdbId.toUpperCase()}.pdb`, { type: 'chemical/x-pdb' });
        await uploadStructure(file, user.id);
        success(`"${ctrl.pdbId}" saved to My Structures ✓`);
      } else {
        error("No structure loaded to save.");
      }
    } catch (e: any) {
      error(e?.message ?? "Quick save failed");
    } finally {
      setQuickSaving(false);
    }
  };

  // ── Track recent structures in localStorage ────────────────────
  useEffect(() => {
    const ctrl = controllers[0];
    if (ctrl.pdbId && ctrl.pdbId.length >= 4) {
      addRecentStructure({
        id: ctrl.pdbId.toUpperCase(),
        name: proteinTitle || ctrl.pdbId.toUpperCase(),
        pdbId: ctrl.pdbId.toUpperCase(),
        fileType: ctrl.dataSource === 'pubchem' ? 'sdf' : 'pdb',
      });
    } else if (ctrl.file) {
      addRecentStructure({
        id: ctrl.file.name,
        name: ctrl.file.name.replace(/\.[^/.]+$/, ''),
        fileType: ctrl.file.name.split('.').pop()?.toLowerCase(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controllers[0].pdbId, controllers[0].file]);

  const handleExportVideo = async () => {
    const viewer = viewerRef.current || viewerRefs[0].current;
    if (!viewer || !recorder.session) return;

    if (recorder.isRecording) {
      error("Please stop recording before exporting.");
      return;
    }

    // Manual Loading Toast
    const toastId = addToast("Rendering video...", 'info', 60000); // 1 min timeout
    try {
      const duration = recorder.session.metadata.duration || 5000;

      // Extract new options
      const watermark = recorder.session.metadata.settings?.showWatermark ? {
        text: recorder.session.metadata.watermarkText || 'Powered by QuercusViewer',
        show: true,
        logo: recorder.session.metadata.watermarkLogo,
        position: recorder.session.metadata.settings.watermarkPosition || 'bottom-right'
      } : undefined;

      const overlays = recorder.session.metadata.textOverlays; // Already matches expected format

      // Map transitions from segments
      // Map transitions from segments
      const transitions = recorder.segments
        .filter(s => s.transition)
        .map(s => {
          return {
            start: s.startTime,
            end: s.startTime + (s.transition!.duration || 1000),
            type: 'fade' as const,
            duration: s.transition!.duration || 1000
          };
        });

      const settings = recorder.session.metadata.settings;
      const fps = settings?.fps || 30;

      // 1. Reset timeline to start
      recorder.seek(0);
      await new Promise(r => setTimeout(r, 100)); // Wait for seek to apply

      // Helper function to convert AudioBuffer to WAV (defined first)
      const audioBufferToWav = (buffer: AudioBuffer): Blob => {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const data = new Float32Array(buffer.length * numChannels);
        for (let i = 0; i < numChannels; i++) {
          const channelData = buffer.getChannelData(i);
          for (let j = 0; j < buffer.length; j++) {
            data[j * numChannels + i] = channelData[j];
          }
        }

        const dataLength = data.length * bytesPerSample;
        const bufferLength = 44 + dataLength;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferLength - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
          const sample = Math.max(-1, Math.min(1, data[i]));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
      };

      // 2. Prepare Audio Mix (music + sfx)
      let finalAudioData: string | Blob | undefined = undefined;
      const hasMusic = recorder.session.metadata.audioTrack?.data;
      const hasSfx = recorder.session.metadata.sfxTrack?.data;

      if (hasMusic || hasSfx) {
        try {
          // If we have both, we need to mix them
          if (hasMusic && hasSfx) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Decode both audio sources
            const musicArrayBuffer = await (await fetch(hasMusic)).arrayBuffer();
            const sfxArrayBuffer = await (await fetch(hasSfx)).arrayBuffer();

            const musicBuffer = await audioContext.decodeAudioData(musicArrayBuffer);
            const sfxBuffer = await audioContext.decodeAudioData(sfxArrayBuffer);

            // Create a mixed buffer (use the longer duration)
            const maxDuration = Math.max(musicBuffer.duration, sfxBuffer.duration);
            const sampleRate = audioContext.sampleRate;
            const mixedBuffer = audioContext.createBuffer(
              2, // stereo
              maxDuration * sampleRate,
              sampleRate
            );

            // Mix the channels
            for (let channel = 0; channel < mixedBuffer.numberOfChannels; channel++) {
              const mixedData = mixedBuffer.getChannelData(channel);
              const musicData = musicBuffer.getChannelData(Math.min(channel, musicBuffer.numberOfChannels - 1));
              const sfxData = sfxBuffer.getChannelData(Math.min(channel, sfxBuffer.numberOfChannels - 1));

              for (let i = 0; i < mixedData.length; i++) {
                let sample = 0;
                if (i < musicData.length) sample += musicData[i] * 0.7; // 70% music volume
                if (i < sfxData.length) sample += sfxData[i] * 0.3; // 30% sfx volume
                mixedData[i] = Math.max(-1, Math.min(1, sample)); // Clamp
              }
            }

            // Convert mixed buffer to WAV blob
            finalAudioData = audioBufferToWav(mixedBuffer);
            audioContext.close();
          } else {
            // Only one audio source
            finalAudioData = hasMusic || hasSfx;
          }
        } catch (err) {
          console.error('Failed to mix audio:', err);
          // Fallback to just music if mixing fails
          finalAudioData = hasMusic;
        }
      }

      // 3. Start Recording (Async) - wraps the recording duration
      const recordingPromise = viewer.recordMovie(duration, {
        watermark,
        overlays,
        transitions,
        fps, // Pass FPS
        audioData: finalAudioData // Pass mixed audio
      } as any);

      // 3. Start Playback (Concurrent)
      // Delay slightly to ensure MediaRecorder is active
      setTimeout(() => {
        recorder.play();
      }, 10);

      // 4. Wait for recording to finish
      const blob = await recordingPromise;

      // 5. Stop playback
      recorder.pause();


      // Prompt download
      const ext = settings?.exportFormat === 'gif' ? 'gif' : 'webm';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      removeToast(toastId);
      success("Video exported successfully!");
    } catch (e) {
      console.error(e);
      removeToast(toastId);
      error("Export failed.");
    }
  };

  const handleLoadSession = async (file: File) => {
    try {
      const text = await file.text();
      const session = JSON.parse(text);

      // Set Title to Filename (minus extension)
      const sessionTitle = file.name.replace(/\.json$/i, '');
      setProteinTitle(sessionTitle);

      if (!session.timestamp) console.warn("Session file missing timestamp");

      if (session.version === 2) {
        // Load Version 2 (Multi-View)
        if (session.viewMode) setViewMode(session.viewMode as ViewMode);
        if (session.isLightMode !== undefined) setIsLightMode(session.isLightMode);
        if (session.isCleanMode !== undefined) setIsCleanMode(session.isCleanMode);
        if (session.palette) setColorPalette(session.palette);
        if (session.snapshots) setSnapshots(session.snapshots);

        if (Array.isArray(session.viewports)) {
          session.viewports.forEach((vp: any, index: number) => {
            if (index < controllers.length) {
              const ctrl = controllers[index];
              // Restore Content if present
              if (vp.fileContent) {
                const file = new File([vp.fileContent], `${vp.pdbId || 'structure'}.pdb`, { type: 'text/plain' });
                ctrl.setFile(file);
                // We also need to set PDB ID to trigger load, or handleUpload?
                // Best to use handleUpload to trigger the flow
                // But handleUpload expects user interaction usually.
                // Let's manually set file and ID.
                // If we set ID, ProteinViewer might try to fetch. 
                // If we set file, we need to ensure ProteinViewer uses it.
                // ProteinViewer uses `file` prop if provided.
              } else if (vp.pdbId) {
                ctrl.setPdbId(vp.pdbId);
              }

              if (vp.representation) ctrl.setRepresentation(vp.representation);
              if (vp.coloring) ctrl.setColoring(vp.coloring);
              if (vp.showSurface !== undefined) ctrl.setShowSurface(vp.showSurface);
              if (vp.showLigands !== undefined) ctrl.setShowLigands(vp.showLigands);
              if (vp.showIons !== undefined) ctrl.setShowIons(vp.showIons);
              if (vp.isSpinning !== undefined) ctrl.setIsSpinning(vp.isSpinning);
              if (vp.customBackgroundColor) ctrl.setCustomBackgroundColor(vp.customBackgroundColor);
              if (vp.measurements) ctrl.setMeasurements(vp.measurements);

              // Orientation
              console.log(`[SessionLoad] Viewport ${index} Custom Colors:`, vp.customColors);
              if (vp.customColors) ctrl.setCustomColors(vp.customColors);

              if (vp.orientation) {
                setTimeout(() => {
                  viewerRefs[index].current?.setOrientation(vp.orientation);
                }, 1500); // Delay to allow loading
              }
            }
          });
        }
        success("Multi-view session loaded ✓");

      } else {
        // Load Legacy Format (Version 1 or implicit)
        // Assume it applies to Viewport 0
        const ctrl = controllers[0];

        if (session.pdbId) ctrl.setPdbId(session.pdbId);
        if (session.representation) ctrl.setRepresentation(session.representation);
        if (session.coloring) ctrl.setColoring(session.coloring);

        // Handle boolean flags safely
        if (session.isLightMode !== undefined) setIsLightMode(session.isLightMode);
        if (session.showSurface !== undefined) ctrl.setShowSurface(session.showSurface);
        if (session.showLigands !== undefined) ctrl.setShowLigands(session.showLigands);
        if (session.isSpinning !== undefined) ctrl.setIsSpinning(session.isSpinning);
        if (session.isCleanMode !== undefined) setIsCleanMode(session.isCleanMode);

        if (session.snapshots) setSnapshots(session.snapshots);

        // Restore custom/overlay if present in legacy object
        if (session.customColors) ctrl.setCustomColors(session.customColors);
        if (session.overlays) ctrl.setOverlays(session.overlays);
        if (session.measurements) ctrl.setMeasurements(session.measurements); // Sync received measurements
        if (session.highlightedResidue) ctrl.setHighlightedResidue(session.highlightedResidue);

        // Restore orientation
        if (session.orientation) {
          setTimeout(() => {
            viewerRefs[0].current?.setOrientation(session.orientation);
          }, 1500);
        }
        success("Session loaded ✓");
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      alert("Failed to load session file");
    }
  };




  const handleSequenceResidueClick = (chain: string, resNo: number, resName?: string) => {
    console.log("App: Sequence Clicked", chain, resNo, resName);
    console.log("App: Current Highlight", highlightedResidue);

    if (highlightedResidue &&
      String(highlightedResidue.chain) === String(chain) &&
      Number(highlightedResidue.resNo) === Number(resNo)) {
      console.log("App: Toggling OFF");
      setHighlightedResidue(null);
      viewerRef.current?.clearHighlight();
    } else {
      console.log("App: Selecting NEW");
      setHighlightedResidue({ chain, resNo, resName: resName || 'UNK' });
      viewerRef.current?.highlightResidue(chain, resNo);
    }
  };

  // Snapshot Handlers
  const handleSnapshot = () => {
    // Use the new two-step workflow (viewport selection → quality selection)
    handleToolAction('snapshot');
  };

  const handleDownloadSnapshot = (id: string) => {
    const snapshot = snapshots.find(s => s.id === id);
    if (snapshot) {
      const link = document.createElement('a');
      link.href = snapshot.url;
      link.download = `snapshot-${pdbId || 'structure'}-${snapshot.id.slice(0, 4)}.png`;
      link.click();
      success('Snapshot downloaded ✓');
    }
  };

  const handleDownloadPDB = () => {
    if (file) {
      // Download local/library file
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } else if (pdbId) {
      // Download from RCSB
      const url = `https://files.rcsb.org/download/${pdbId}.pdb`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pdbId}.pdb`;
      a.click();
    }
  };

  const handleDownloadSequence = () => {
    if (chains.length === 0) return;

    let fastaContent = '';
    chains.forEach(chain => {
      // Header: >PDBID|Chain|Name
      const header = `>${pdbId || 'Structure'}|${chain.name}\n`;
      // Split sequence into 80-char lines
      const sequence = chain.sequence.match(/.{1,80}/g)?.join('\n') || '';
      fastaContent += header + sequence + '\n';
    });

    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pdbId || 'structure'}.fasta`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteSnapshot = (id: string) => {
    const snapshot = snapshots.find(s => s.id === id);
    if (snapshot) {
      URL.revokeObjectURL(snapshot.url);
      setSnapshots(prev => prev.filter(s => s.id !== id));
    }
  };



  // --- AI ACTION HANDLER (Dr. AI V3) ---
  const handleAIAction = (action: AIAction) => {
    switch (action.type) {
      case 'SET_COLORING':
        setColoring(action.value);
        break;
      case 'SET_REPRESENTATION':
        setRepresentation(action.value);
        break;
      case 'TOGGLE_SURFACE':
        setShowSurface(action.value);
        break;
      case 'RESET_VIEW':
        handleResetView();
        if (viewerRef.current) viewerRef.current.resetCamera();
        break;
      case 'HIGHLIGHT_REGION':
        if (viewerRef.current) {
          viewerRef.current.highlightRegion(action.selection, action.label);
        }
        break;
      case 'SET_CUSTOM_COLOR':
        // Add to the list of custom colors
        setCustomColors((prev: any) => [
          ...prev,
          { selection: action.selection, color: action.color }
        ]);
        break;
    }
  };

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.relatedTarget === null) {
      setIsDragging(false);
    }
  };



  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      const validExtensions = ['.pdb', '.cif', '.ent', '.mol', '.sdf', '.mol2', '.xyz'];
      const fileExt = droppedFile.name.substring(droppedFile.name.lastIndexOf('.')).toLowerCase();

      if (validExtensions.includes(fileExt)) {
        handleFileUploadWithSync(droppedFile); // Use wrapper for sync
      } else {
        alert("Invalid file type. Please drop a valid structure file (.pdb, .cif, .mol, .sdf, etc.)");
      }
    }
  };

  // --- COMMAND PALETTE LOGIC ---
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // --- HUD STATE ---




  const [measurementTextColorMode, setMeasurementTextColorMode] = useState<MeasurementTextColor>('auto');



  const handleUpdateMeasurement = (id: string, updates: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const handleDeleteMeasurement = (id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  };

  // --- GLOBAL SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // Toggle Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Exit modes on Escape
      if (e.key === 'Escape') {
        setIsPublicationMode(false);
        setIsMeasurementMode(false);
        setIsCommandPaletteOpen(false);
        setIsLibraryOpen(false);
        setShowContactMap(false);
        setShowLanding(false); // Close landing if open
        return;
      }

      // Only process below shortcuts if no modals are open
      if (isLibraryOpen || isCommandPaletteOpen || showContactMap) return;

      switch (e.key.toLowerCase()) {
        // General
        case 'f':
          e.preventDefault();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => console.error(err));
          } else {
            try { document.exitFullscreen(); } catch (e) { console.error(e) }
          }
          break;
        case 't':
          setIsLightMode(prev => !prev);
          break;

        // View Controls
        case 'r':
          viewerRef.current?.resetCamera();
          break;
        case ' ':
          e.preventDefault(); // Prevent scroll
          setIsSpinning(prev => !prev);
          break;
        case 's':
          // Screenshot
          viewerRef.current?.captureImage();
          break;

        // Tools
        case 'm':
          setIsMeasurementMode(prev => !prev);
          break;
        case 'c':
          setShowContactMap(prev => !prev);
          break;

        // Representations (1-8)
        case '1': setRepresentation('cartoon'); break;
        case '2': setRepresentation('spacefill'); break;
        case '3': setRepresentation('surface'); break;
        case '4': setRepresentation('licorice'); break;
        case '5': setRepresentation('backbone'); break;
        case '6': setRepresentation('ribbon'); break;
        case '7': setRepresentation('ball+stick'); break;
        case '8': setRepresentation('line'); break;

        // Coloring
        case 'q': setColoring('chainid'); break;
        case 'w': setColoring('element' as ColoringType); break;
        case 'e': setColoring('hydrophobicity'); break;
        case 'a': setColoring('bfactor'); break; // pLDDT
        case 'd': setColoring('secondary'); break;
        case 'x': setColoring('residueindex'); break; // Rainbow
        case 'v': setColoring('residue'); break; // Residue Name
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLibraryOpen, isCommandPaletteOpen, showContactMap]);

  const commandActions: CommandAction[] = useMemo(() => [
    // --- FILES & LOADING ---
    {
      id: 'load-upload',
      label: 'Upload File',
      icon: Upload,
      category: 'File',
      perform: () => document.getElementById('file-upload-input')?.click() // Indirect trigger if possible, or we need a ref
    },
    {
      id: 'load-library',
      label: 'Open Structure Library',
      icon: FolderOpen,
      category: 'File',
      perform: () => setIsLibraryOpen(true)
    },
    {
      id: 'view-favorites',
      label: 'View Favorites',
      icon: Star,
      category: 'File',
      perform: () => setIsFavoritesOpen(true)
    },
    {
      id: 'save-session',
      label: 'Save Session',
      icon: Save,
      category: 'File',
      perform: handleSaveSession
    },

    // --- VIEW & EXPORT ---
    {
      id: 'reset-view',
      label: 'Reset Camera View',
      icon: RefreshCw,
      shortcut: 'R',
      category: 'View',
      perform: handleResetView
    },
    {
      id: 'undo',
      label: 'Undo',
      icon: Undo2,
      shortcut: 'Cmd/Ctrl+Z',
      category: 'Edit',
      perform: () => { if (canUndo) undo(); }
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: Redo2,
      shortcut: 'Shift+Cmd/Ctrl+Z',
      category: 'Edit',
      perform: () => { if (canRedo) redo(); }
    },
    {
      id: 'toggle-pub-mode',
      label: isPublicationMode ? 'Exit Publication Mode' : 'Enter Publication Mode',
      icon: Camera,
      category: 'View',
      perform: () => togglePublicationMode()
    },
    {
      id: 'take-snapshot',
      label: 'Take Snapshot',
      icon: Camera,
      shortcut: 'S',
      category: 'Export',
      perform: handleSnapshot
    },
    {
      id: 'record-movie',
      label: 'Record Turntable Movie',
      icon: Video,
      category: 'Export',
      perform: () => handleRecordMovie()
    },
    {
      id: 'share-link',
      label: 'Share via QR / Link',
      icon: Share2,
      category: 'Export',
      perform: () => setShowShareModal(true)
    },

    // --- APPEARANCE ---
    {
      id: 'style-cartoon',
      label: 'Style: Cartoon',
      icon: Activity,
      shortcut: '1',
      category: 'Appearance',
      perform: () => setRepresentation('cartoon')
    },
    {
      id: 'style-surface',
      label: 'Style: Molecular Surface',
      icon: Grid3X3,
      shortcut: '3',
      category: 'Appearance',
      perform: () => {
        setRepresentation('cartoon'); // Surface usually adds to cartoon
        setShowSurface(true);
      }
    },
    {
      id: 'style-sphere',
      label: 'Style: Spacefill (Sphere)',
      icon: Zap,
      shortcut: '2',
      category: 'Appearance',
      perform: () => setRepresentation('spacefill')
    },
    {
      id: 'color-chain',
      label: 'Color by Chain',
      icon: Palette,
      shortcut: 'Q',
      category: 'Appearance',
      perform: () => setColoring('chainid')
    },
    {
      id: 'color-hydro',
      label: 'Color by Hydrophobicity',
      icon: Palette,
      shortcut: 'E',
      category: 'Appearance',
      perform: () => setColoring('hydrophobicity')
    },
    {
      id: 'color-bfactor',
      label: 'Color by B-Factor (Mobility)',
      icon: Palette,
      shortcut: 'A',
      category: 'Appearance',
      perform: () => setColoring('bfactor')
    },
    {
      id: 'toggle-spin',
      label: isSpinning ? 'Stop Spinning' : 'Start Spinning',
      icon: RefreshCw,
      shortcut: 'Space',
      category: 'View',
      perform: () => setIsSpinning(prev => !prev)
    },
    {
      id: 'toggle-theme',
      label: isLightMode ? 'Switch to Dark Mode' : 'Switch to Light Mode',
      icon: Palette,
      shortcut: 'T',
      category: 'View',
      perform: () => setIsLightMode(prev => !prev)
    },
    {
      id: 'open-settings',
      label: 'Open Settings',
      icon: SettingsIcon,
      shortcut: ',',
      category: 'View',
      perform: () => setIsSettingsOpen(true)
    },

    // --- Additional Representations ---
    {
      id: 'style-licorice',
      label: 'Style: Licorice',
      icon: Activity,
      shortcut: '4',
      category: 'Appearance',
      perform: () => setRepresentation('licorice')
    },
    {
      id: 'style-backbone',
      label: 'Style: Backbone',
      icon: Activity,
      shortcut: '5',
      category: 'Appearance',
      perform: () => setRepresentation('backbone')
    },
    {
      id: 'style-ribbon',
      label: 'Style: Ribbon',
      icon: Activity,
      shortcut: '6',
      category: 'Appearance',
      perform: () => setRepresentation('ribbon')
    },
    {
      id: 'style-ball-stick',
      label: 'Style: Ball + Stick',
      icon: Activity,
      shortcut: '7',
      category: 'Appearance',
      perform: () => setRepresentation('ball+stick')
    },
    {
      id: 'style-line',
      label: 'Style: Line',
      icon: Activity,
      shortcut: '8',
      category: 'Appearance',
      perform: () => setRepresentation('line')
    },

    // --- Additional Coloring ---
    {
      id: 'color-element',
      label: 'Color by Element (CPK)',
      icon: Palette,
      shortcut: 'W',
      category: 'Appearance',
      perform: () => setColoring('element' as ColoringType)
    },
    {
      id: 'color-secondary',
      label: 'Color by Secondary Structure',
      icon: Palette,
      shortcut: 'D',
      category: 'Appearance',
      perform: () => setColoring('secondary')
    },
    {
      id: 'color-rainbow',
      label: 'Color by Rainbow (Residue Index)',
      icon: Palette,
      shortcut: 'X',
      category: 'Appearance',
      perform: () => setColoring('residueindex')
    },
    {
      id: 'color-residue',
      label: 'Color by Residue Name',
      icon: Palette,
      shortcut: 'V',
      category: 'Appearance',
      perform: () => setColoring('residue')
    },

    // --- Tools ---
    {
      id: 'toggle-measurement',
      label: isMeasurementMode ? 'Exit Measurement Mode' : 'Enter Measurement Mode',
      icon: Ruler,
      shortcut: 'M',
      category: 'Tools',
      perform: () => setIsMeasurementMode(prev => !prev)
    },
    {
      id: 'toggle-contact-map',
      label: showContactMap ? 'Hide Contact Map' : 'Show Contact Map',
      icon: Grid3X3,
      shortcut: 'C',
      category: 'Tools',
      perform: () => setShowContactMap(prev => !prev)
    },
    {
      id: 'fullscreen',
      label: 'Toggle Fullscreen',
      icon: Maximize2,
      shortcut: 'F',
      category: 'View',
      perform: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          try { document.exitFullscreen(); } catch (e) { console.error(e) }
        }
      }
    },
  ], [isPublicationMode, isSpinning, isLightMode, isMeasurementMode, showContactMap, handleSaveSession, handleSnapshot, handleResetView]);

  return (
    <main
      className={`w-full h-full relative overflow-hidden transition-colors duration-300 ${customBackgroundColor === 'transparent'
        ? 'text-white bg-[#111]' // Dark base for checkerboard
        : isLightMode
          ? 'bg-slate-50 text-slate-900'
          : 'bg-neutral-950 text-white'
        }`}
      style={customBackgroundColor === 'transparent' ? {
        backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
      } : {}}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Interaction Blocker for Static Embeds */}
      {!isInteractionEnabled && <div className="absolute inset-0 z-50 bg-transparent cursor-default" />}

      <DragDropOverlay isDragging={isDragging} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
        isLightMode={isLightMode}
      />

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={(url) => {
          setIsLibraryOpen(false);
          setShowLanding(false); // Close landing if open

          // Handle Chemical Library Selection
          if (url.startsWith('pubchem://')) {
            const cid = url.replace('pubchem://', '');
            if (!cid) return;

            setFile(null); // Clear any local file to force fetch
            setPdbId(cid);
            setDataSource('pubchem');
            setProteinTitle(`Loading Chemical (CID: ${cid})...`);
            setRepresentation('ball+stick'); // Better default for small molecules
            setPdbMetadata(null);

            // Fetch Metadata for Chemical
            fetchPubChemMetadata(cid).then(meta => {
              if (meta) {
                setPdbMetadata(meta);
                setProteinTitle(meta.title || `CID: ${cid}`);
              } else {
                setProteinTitle(`CID: ${cid}`);
              }
            });
            return;
          }

          // Handle AlphaFold Selection
          if (url.startsWith('alphafold://')) {
            const id = url.replace('alphafold://', '');
            if (!id) return;
            setFile(null);
            setPdbId(id);
            setDataSource('alphafold');
            setProteinTitle(`AlphaFold Prediction: ${id}`);
            setRepresentation('cartoon');
            setColoring('bfactor'); // Automatically show Confidence (pLDDT)
            setPdbMetadata(null);
            return;
          }

          // Handle RCSB Direct Selection
          if (url.startsWith('rcsb://')) {
            const id = url.replace('rcsb://', '');
            if (!id) return;
            setFile(null);
            setPdbId(id);
            setDataSource('pdb');
            setProteinTitle(`RCSB Entry: ${id}`);
            setPdbMetadata(null);
            return;
          }

          // Handle Protein Library Selection (Standard PDB)
          // Extract ID from local path models/ID.pdb
          const idMatch = url.match(/models\/([a-zA-Z0-9]+)\.pdb/);
          const id = idMatch ? idMatch[1] : 'Unknown';

          setPdbId(id);
          setDataSource('pdb'); // Ensure we are in PDB mode
          setProteinTitle(`Loading ${id}...`);

          // Reset representation to cartoon for proteins
          // This prevents ball+stick from persisting from chemical loads
          if (representation === 'ball+stick') {
            setRepresentation('cartoon');
          }

          // Find metadata
          const libMeta = OFFLINE_LIBRARY.find(i => i.id === id);
          if (libMeta) {
            setPdbMetadata(libMeta as unknown as PDBMetadata);
          } else {
            setPdbMetadata(null);
          }

          // Fetch local file
          fetch(url)
            .then(res => {
              if (!res.ok) throw new Error("File not found");
              return res.blob();
            })
            .then(blob => {
              const file = new File([blob], `${id}.pdb`, { type: 'chemical/x-pdb' });
              setFile(file);
              // Update title from library metadata if available
              if (libMeta) {
                setProteinTitle(libMeta.title);
              } else {
                setProteinTitle(`Offline: ${id}`);
              }
            })
            .catch(err => {
              console.warn(`Local library load failed for ${id}. Falling back to RCSB PDB.`, err);
              // Fallback to online fetch (ProteinViewer handles this via pdbId)
              if (libMeta) {
                setProteinTitle(libMeta.title);
              } else {
                setProteinTitle(id);
              }
            });
        }}

      />

      <FavoritesPanel
        favorites={favorites}
        history={history}
        isOpen={isFavoritesOpen}
        initialTab={favoritesTab}
        showTabs={false}
        onClose={() => setIsFavoritesOpen(false)}
        onSelect={(id, dataSource) => {
          setIsFavoritesOpen(false);
          setPdbId(id);
          setDataSource(dataSource);
          setFile(null);
          if (dataSource === 'pubchem') {
            setRepresentation('ball+stick');
          }
        }}
        onRemove={removeFavorite}
        isLightMode={isLightMode}
      />


      {!isEmbedMode && (
        <AISidebar
          isOpen={isAISidebarOpen}
          onClose={() => setIsAISidebarOpen(false)}
          pdbId={pdbId}
          proteinTitle={proteinTitle}
          highlightedResidue={highlightedResidue}
          stats={structureStats}
          chains={chains}
          onAction={handleAIAction}
        />
      )}
      {/* HUD - Positioned at bottom to avoid viewport interference */}
      {/* Proteinvier and UI */}
      {/* Click-to-Interact Overlay */}
      {(!hasInteracted && params.get('interactionWrapper') === 'true') && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors cursor-pointer group backdrop-blur-[1px]"
          onClick={() => setHasInteracted(true)}
        >
          <button className="bg-white/90 text-black px-6 py-3 rounded-full font-bold shadow-lg transform group-hover:scale-105 transition-all flex items-center gap-2">
            {/* Mouse Pointer Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" /></svg>
            Click to Interact
          </button>
        </div>
      )}
      {/* HUD & Overlay */}
      <ReactionOverlay
        lastReaction={peerSession.lastReaction}
        peerNames={peerSession.peerNames}
        myPeerId={peerSession.peerId || undefined}
      />
      {/* Audio Room (Invisible) */}
      <AudioRoom remoteStreams={peerSession.remoteStreams} />

      {/* STUDIO MODE OVERLAY */}
      {isStudioMode && recorder.session && (
        <StudioLayout
          recorder={recorder}
          onExit={() => setIsStudioMode(false)}
          exportVideo={handleExportVideo}
          captureThumbnail={async () => {
            const viewer = viewerRef.current || viewerRefs[0].current;
            if (!viewer) return null;
            const blob = await viewer.getSnapshotBlob();
            if (!blob) return null;
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }}
        />
      )}

      {!showLanding && !isStudioMode && (
        <>
          <HUD
            hoveredResidue={hoveredResidue}
            pdbMetadata={pdbMetadata}
            pdbId={pdbId}
            isLightMode={isLightMode}
            isEmbedMode={isEmbedMode}
            peerSession={peerSession}
            remoteHoveredResidue={remoteHoveredResidue}
            isCameraSynced={isCameraSynced}
            onToggleCameraSync={() => setIsCameraSynced(!isCameraSynced)}
            isHost={peerSession.isHost}
            // Nametags
            remoteUserName={peerSession.lastReceivedName}
            peerNames={peerSession.peerNames}
            userName={userName}
            controllerId={controllerId}
            // Chat Integration
            unreadCount={unreadCount}
            isChatOpen={isChatOpen}
            onToggleChat={() => setIsChatOpen(!isChatOpen)}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <IdentityModal
            isOpen={isIdentityModalOpen}
            onConfirm={(name) => {
              setUserName(name);
              setIsIdentityModalOpen(false);
              success(`Welcome, ${name}!`);
            }}
            currentName={userName || ''}
            isLightMode={isLightMode}
          />

          {isMeasurementPanelOpen && !peerSession.isConnected && (
            <MeasurementPanel
              isOpen={isMeasurementPanelOpen}
              measurements={measurements}
              onUpdate={(id, updates) => {
                lastLocalMeasurementUpdate.current = Date.now();
                handleUpdateMeasurement(id, updates);
              }}
              onDelete={(id) => {
                lastLocalMeasurementUpdate.current = Date.now();
                handleDeleteMeasurement(id);
              }}
              onClearAll={() => {
                lastLocalMeasurementUpdate.current = Date.now();
                setMeasurements([]);
                viewerRef.current?.clearMeasurements();
              }}
              textColorMode={measurementTextColorMode}
              onSetTextColor={(color) => {
                setMeasurementTextColorMode(color);
              }}
              onClose={() => {
                setIsMeasurementMode(false);
                setIsMeasurementPanelOpen(false);
              }}
              isLightMode={isLightMode}
            />
          )}

          {/* Superposition Modal - Linked to Active Controller */}
          <SuperpositionModal
            isOpen={isSuperpositionModalOpen}
            onClose={() => setIsSuperpositionModalOpen(false)}
            overlays={controllers[activeViewIndex].overlays}
            onAddOverlay={controllers[activeViewIndex].addOverlay}
            onRemoveOverlay={controllers[activeViewIndex].removeOverlay}
            onToggleOverlay={controllers[activeViewIndex].toggleOverlay}
            getSnapshot={async () => {
              if (!viewerRefs[activeViewIndex].current) return null;
              const blob = await viewerRefs[activeViewIndex].current.getSnapshotBlob();
              if (!blob) return null;
              return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });
            }}
            onOpenAlignment={() => {
              setIsSuperpositionModalOpen(false);
              viewerRefs[activeViewIndex].current?.openAlignmentView();
            }}
          />

          <Settings
            isLightMode={isLightMode}
            setIsLightMode={setIsLightMode}
            quality={settings.quality}
            setQuality={(q) => updateSetting('quality', q)}
            ssao={settings.ssao}
            setSsao={(s) => updateSetting('ssao', s)}
            visualizerEngine={visualizerEngine}
            setVisualizerEngine={setVisualizerEngine}
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </>
      )}

      {!showLanding && (
        <>
          {/* BACKGROUND (Dark Mode) */}
          {!isLightMode && !customBackgroundColor && activeViewIndex === 0 && viewMode === 'single' && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-950 -z-10" />
          )}

          {/* Top Right Navigation (Dashboard / Auth) */}
          {!isEmbedMode && !isStudioMode && (
            <div className="absolute top-4 right-4 md:right-8 z-50 flex items-center gap-3">
              {user ? (
                <Link to="/dashboard" className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${isLightMode ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'}`}>
                  <img src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user?.email || 'User'}&background=random`} alt="Profile" className="w-5 h-5 rounded-full" />
                  <span>Dashboard</span>
                </Link>
              ) : (
                <Link to="/auth" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border shadow-sm ${isLightMode ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' : 'bg-neutral-800 border-neutral-700 text-white hover:bg-neutral-700'}`}>
                  Log In
                </Link>
              )}
            </div>
          )}

          {/* --- PLAYLIST BAR (Overlay) --- */}

          {/* Main Content: Flex Container for Sidebars and Viewports */}
          <div className="flex flex-1 w-full h-full overflow-hidden">

            {/* Logic to determine if we are looking at a Chemical */}
            {(() => {
              if (isEmbedMode || isStudioMode) return null; // Hide Sidebar in Embed OR Studio Mode

              const isChemical = dataSource === 'pubchem' ||
                (file && /\.(sdf|mol|cif)$/i.test(file.name));

              return (
                // Mobile: Absolute Overlay | Desktop: Relative Flow
                <div className={`
                    fixed inset-y-0 left-0 z-50 bg-neutral-900/95 backdrop-blur-md transition-transform duration-300 ease-in-out border-r border-white/10 w-80 
                    md:relative md:bg-transparent md:backdrop-blur-none md:translate-x-0
                    ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-100 md:translate-x-0'}
                    ${isSidebarCollapsed ? 'md:w-0 md:overflow-hidden md:opacity-0' : 'md:w-80 md:opacity-100'}
                `}>
                  {/* Mobile Close Button */}
                  <div className="md:hidden absolute top-4 right-4 z-50">
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/50 hover:text-white">
                      <X size={24} />
                    </button>
                  </div>
                  <Controls
                    pdbId={pdbId}
                    setPdbId={handlePdbIdChange}
                    dataSource={dataSource}
                    setDataSource={setDataSource}
                    isChemical={!!isChemical}
                    onUpload={handleFileUploadWithSync}
                    representation={representation}
                    setRepresentation={setRepresentation}
                    visualizerEngine={visualizerEngine}
                    setVisualizerEngine={setVisualizerEngine}
                    coloring={coloring}
                    setColoring={setColoring}
                    customColors={customColors}
                    setCustomColors={setCustomColors}
                    chainStyles={chainStyles}
                    setChainStyle={setChainStyle}
                    customStyles={customStyles}
                    setCustomStyles={setCustomStyles}
                    customTransparency={customTransparency}
                    setCustomTransparency={setCustomTransparency}
                    smoothSheetEnabled={smoothSheetEnabled}
                    setSmoothSheetEnabled={setSmoothSheetEnabled}
                    onResetCamera={() => handleToolAction('reset')}
                    chains={chains}
                    ligands={ligands}
                    isMeasurementMode={isMeasurementMode}
                    setIsMeasurementMode={setIsMeasurementMode}
                    isPublicationMode={isPublicationMode}
                    onTogglePublicationMode={togglePublicationMode}
                    onClearMeasurements={() => {
                      lastLocalMeasurementUpdate.current = Date.now();
                      setMeasurements([]);
                      viewerRef.current?.clearMeasurements();
                    }}
                    onDeleteMeasurement={(id) => {
                      lastLocalMeasurementUpdate.current = Date.now();
                      handleDeleteMeasurement(id);
                    }}
                    measurements={measurements}
                    recorderContent={
                      <RecorderControls
                        {...recorder}
                        onEnterStudio={() => {
                          if (recorder.isRecording) {
                            recorder.stopRecording();
                          }
                          setIsStudioMode(true);
                        }}
                        startRecording={handleStartRecording} // Explicitly pass the no-arg handler
                        exportSession={recorder.exportSession}
                        importSession={recorder.importSession}
                        exportVideo={handleExportVideo}
                        updateMetadata={recorder.updateMetadata}
                        isLightMode={isLightMode}
                        cardBg={isLightMode ? 'bg-white' : 'bg-neutral-900'}
                      />
                    }
                    isSharedSession={peerSession.isConnected}
                    isLightMode={isLightMode}
                    setIsLightMode={setIsLightMode}
                    highlightedResidue={highlightedResidue}
                    onResidueClick={handleSequenceResidueClick}
                    showSurface={showSurface}
                    setShowSurface={setShowSurface}
                    showLigands={showLigands}
                    setShowLigands={setShowLigands}
                    showIons={showIons}
                    setShowIons={setShowIons}
                    onFocusLigands={handleFocusLigands}
                    onRecordMovie={handleRecordMovie}
                    isRecording={isRecording}
                    proteinTitle={proteinTitle}
                    snapshots={snapshots}
                    onSnapshot={handleSnapshot}
                    isSpinning={isSpinning}
                    setIsSpinning={setIsSpinning}
                    isRocking={isRocking}
                    setIsRocking={setIsRocking}

                    onSaveSession={() => handleToolAction('save')}
                    onQuickSave={handleQuickSave}
                    quickSaving={quickSaving}
                    onLoadSession={handleLoadSession}
                    onDownloadPDB={handleDownloadPDB}
                    onDownloadSequence={handleDownloadSequence}
                    onToggleContactMap={() => setShowContactMap(!showContactMap)}
                    onTakeSnapshot={handleSnapshot}
                    movies={movies}
                    isCleanMode={isCleanMode}
                    setIsCleanMode={setIsCleanMode}
                    onShare={() => handleToolAction('share')}
                    onToggleShare={() => handleToolAction('share')}
                    onToggleLibrary={() => setIsLibraryOpen(!isLibraryOpen)}
                    onToggleMeasurement={() => setIsMeasurementMode(!isMeasurementMode)}
                    onOpenSuperposition={() => setIsSuperpositionModalOpen(true)} // Added prop
                    colorPalette={colorPalette}
                    setColorPalette={setColorPalette}
                    isDyslexicFont={isDyslexicFont}
                    setIsDyslexicFont={setIsDyslexicFont}
                    customBackgroundColor={customBackgroundColor}
                    setCustomBackgroundColor={setCustomBackgroundColor}
                    pdbMetadata={pdbMetadata}
                    onHighlightRegion={(selection, label) => {
                      viewerRef.current?.highlightRegion(selection, label);
                    }}
                    onStartTour={handleStartTour}
                    openSections={openSections}
                    onToggleSection={handleToggleSection}
                    isMobileSidebarOpen={isMobileMenuOpen}
                    onToggleMobileSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    onToggleFavorite={() => toggleFavorite(pdbId, dataSource, proteinTitle || undefined)}
                    isFavorite={isFavorite(pdbId, dataSource)}
                    onOpenFavorites={() => {
                      setFavoritesTab('favorites');
                      setIsFavoritesOpen(true);
                    }}
                    onOpenHistory={() => {
                      setFavoritesTab('history');
                      setIsFavoritesOpen(true);
                    }}
                    history={history}



                    // Undo/Redo
                    onUndo={undo}
                    onRedo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}



                    // Gallery
                    onToggleGallery={() => setIsGalleryOpen(!isGalleryOpen)}

                    // Multi-View Mode
                    viewMode={viewMode}
                    onSetViewMode={setViewMode}


                  />
                </div>
              );
            })()}

            {/* Multi-View Layout */}
            <div className="relative flex-1 flex w-full h-full overflow-hidden bg-black">

              {/* Collapse Button - Positioned on top of viewport */}
              {/* Collapse Button - Positioned on top of viewport - hidden on mobile */}
              {!isEmbedMode && (
                <>
                  {/* Desktop Toggle */}
                  <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className={`absolute top-1/2 left-0 -translate-y-1/2 z-50 hidden md:flex
                            pl-1 pr-2 h-16 bg-[#1a1a1a] border-y border-r border-white/10 rounded-r-xl text-white/50 hover:text-white 
                            shadow-2xl transition-all w-6 hover:w-8 overflow-hidden group items-center justify-start
                            ${isSidebarCollapsed ? 'translate-x-0' : 'translate-x-0'}
                        `}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                  >
                    {isSidebarCollapsed ? <ChevronRight size={20} className="min-w-[20px]" /> : <ChevronLeft size={20} className="min-w-[20px]" />}
                  </button>

                  {/* Mobile Hamburger - Top Left */}
                  <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="absolute top-4 left-4 z-40 md:hidden p-2 bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 text-white shadow-lg"
                  >
                    <Menu size={24} />
                  </button>
                </>
              )}
              {(() => {
                // Helper: Render single viewport
                const renderViewport = (index: number, extraClasses = '') => {
                  const ctrl = controllers[index];
                  const ref = viewerRefs[index];
                  const isActive = activeViewIndex === index;
                  const showHeader = viewMode !== 'single';
                  const viewportLabels = ['Viewport 1', 'Viewport 2', 'Viewport 3', 'Viewport 4'];

                  // ENGINE: Choose Component based on state
                  const ViewerComponent = visualizerEngine === 'molstar' ? MolStarProteinViewer : ProteinViewer;

                  return (
                    <div key={index} className={`flex flex-col h-full ${extraClasses}`}>
                      {/* Viewport Header */}
                      {showHeader && (
                        <div
                          onClick={() => setActiveViewIndex(index)}
                          className={`shrink-0 h-9 flex items-center justify-between px-3 border-b transition-colors cursor-pointer select-none relative
                        ${isActive ? 'bg-[#1a1a1a] border-indigo-500/50' : 'bg-black border-[#222] opacity-60 hover:opacity-100'}
                      `}
                        >
                          <div className="flex items-center gap-2 relative z-10 pointer-events-none">
                            <div className={`w-2 h-2 rounded-full shadow-sm transition-all ${isActive ? 'bg-indigo-500 shadow-indigo-500/50 scale-110' : 'bg-neutral-700'}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-indigo-400' : 'text-neutral-500'}`}>
                              {viewportLabels[index]}
                            </span>
                          </div>

                          <div className="absolute inset-0 flex items-center justify-center px-20 pointer-events-none">
                            <div className="relative group flex justify-center pointer-events-auto max-w-full">
                              <span
                                className="text-[10px] text-neutral-400 font-mono truncate block text-center"
                              >
                                {ctrl.proteinTitle || ctrl.pdbId || (ctrl.file ? ctrl.file.name : "No Structure")}
                              </span>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-neutral-900 text-white text-[10px] rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-neutral-700 w-max max-w-[90%] text-center whitespace-normal break-words shadow-xl">
                                {ctrl.proteinTitle || ctrl.pdbId || (ctrl.file ? ctrl.file.name : "No Structure")}
                              </div>
                            </div>
                          </div>

                          <div className="relative z-10 ml-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); ctrl.handleResetView(); }}
                              className="p-1 hover:bg-white/10 rounded text-neutral-500 hover:text-white transition-colors shrink-0"
                              title="Reset Camera"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Viewer */}
                      <div className="relative flex-1 w-full h-full">
                        {/* Lazy Load Overlay REMOVED */}
                        {(!ctrl.pdbId && !ctrl.file) ? (
                          <div className={`absolute inset-0 flex items-center justify-center text-center select-none z-0 ${viewMode === 'single' ? 'p-6' : 'p-2'}`}>
                            <div className={`max-w-md space-y-4 opacity-100 transform translate-y-0 transition-all duration-500 animate-in fade-in zoom-in-95 ${viewMode !== 'single' ? 'scale-90 origin-center' : ''}`}>

                              {/* Large Header - Hide in multi-view to save space */}
                              {viewMode === 'single' && (
                                <>
                                  <div className="flex justify-center mb-4">
                                    <div className="p-4 bg-neutral-800/50 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
                                      <Grid3X3 className="w-12 h-12 text-blue-500/50" />
                                    </div>
                                  </div>
                                  <h2 className="text-2xl font-bold text-white tracking-tight">Ready to Visualize?</h2>
                                  <p className="text-neutral-400">
                                    Select a structure to begin exploring in 3D.
                                  </p>
                                </>
                              )}

                              {/* Compact Header for Multi-View */}
                              {viewMode !== 'single' && (
                                <div className="mb-2">
                                  <Grid3X3 className="w-8 h-8 text-neutral-600 mx-auto mb-2 opacity-50" />
                                  <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">Empty Viewport</p>
                                </div>
                              )}

                              <div className={`flex items-center justify-center gap-2 ${viewMode === 'single' ? 'pt-4' : 'pt-1 flex-col sm:flex-row'}`}>
                                <button
                                  onClick={() => {
                                    setActiveViewIndex(index);
                                    setIsLibraryOpen(true);
                                  }}
                                  className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20 ${viewMode === 'single' ? 'px-5 py-2.5' : 'px-3 py-1.5 text-xs w-full sm:w-auto min-w-[100px]'}`}
                                >
                                  <BookOpen className={viewMode === 'single' ? "w-4 h-4" : "w-3 h-3"} />
                                  {viewMode === 'single' ? "Browse Library" : "Library"}
                                </button>
                                <label
                                  onClick={() => setActiveViewIndex(index)}
                                  className={`flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10 hover:border-white/20 ${viewMode === 'single' ? 'px-5 py-2.5' : 'px-3 py-1.5 text-xs w-full sm:w-auto min-w-[100px]'}`}
                                >
                                  <Upload className={viewMode === 'single' ? "w-4 h-4" : "w-3 h-3"} />
                                  {viewMode === 'single' ? "Upload File" : "Upload"}
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept=".pdb,.cif,.ent,.mol,.sdf,.mol2,.xyz"
                                    onChange={(e) => {
                                      if (e.target.files?.[0]) {
                                        // Set this viewport as active
                                        setActiveViewIndex(index);
                                        // Use the specific controller for this viewport
                                        handleFileUploadWithSync(e.target.files[0]);
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              {viewMode === 'single' && (
                                <div className="pt-8 text-xs text-neutral-600 font-mono">
                                  <p>Or enter a PDB ID or PubChem Code (e.g., <span className="text-neutral-400">2244</span>) in the sidebar.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <ViewerComponent
                            ref={ref}
                            pdbId={ctrl.pdbId}
                            dataSource={ctrl.dataSource}
                            file={ctrl.file || undefined}
                            fileType={ctrl.fileType}
                            isLightMode={isLightMode}
                            isSpinning={controllers[index].isSpinning}
                            isRocking={controllers[index].isRocking}
                            // Interactive if: Not connected OR Is Host OR Not Synced OR Is Active Controller
                            isInteractive={!peerSession.isConnected || peerSession.isHost || !isCameraSynced || (!!controllerId && controllerId === peerSession.peerId)}
                            representation={ctrl.representation}
                            showSurface={ctrl.showSurface}
                            showLigands={ctrl.showLigands}
                            showIons={ctrl.showIons}
                            coloring={ctrl.coloring}
                            customColors={ctrl.customColors}
                            chainStyles={ctrl.chainStyles}
                            customStyles={ctrl.customStyles}
                            customTransparency={ctrl.customTransparency}
                            smoothSheetEnabled={ctrl.smoothSheetEnabled}
                            palette={colorPalette}
                            backgroundColor={
                              (isStudioMode && recorder.session?.metadata?.settings?.backgroundColor !== undefined)
                                ? recorder.session.metadata.settings.backgroundColor
                                : (ctrl.customBackgroundColor || (isLightMode ? 'white' : 'black'))
                            }
                            measurementTextColor={measurementTextColorMode}
                            overlays={ctrl.overlays}

                            initialOrientation={index === 0 ? embedOrientation : undefined}

                            // Layout Sync (from Mol*)
                            isMultiView={viewMode !== 'single'}
                            onLayoutChange={setIsMolStarSidebarExpanded}
                            // Live Session: Broadcast camera changes if active view and connected
                            onCameraChange={index === 0 && peerSession.isConnected ? (orient: any) => {
                              // Pass the Chalk: Only broadcast if I am allowed
                              if (controllerId && controllerId !== peerSession.peerId) return;
                              peerSession.broadcastCamera(orient);
                            } : undefined}


                            onStructureLoaded={(info: any) => handleLoad(info, ctrl)}
                            onAtomClick={(info: any) => handleAtomClick(info, index)}
                            isMeasurementMode={isMeasurementMode}
                            measurements={ctrl.measurements}
                            onAddMeasurement={(m: any) => {
                              // LOCK: Mark local update to prevent overwrite by stale remote state
                              lastLocalMeasurementUpdate.current = Date.now();
                              ctrl.setMeasurements([...ctrl.measurements, m]);
                              ctrl.setIsMeasurementPanelOpen(true);
                              setActiveViewIndex(index);
                            }}
                            onHover={setHoveredResidue}
                            // Live Session Features
                            annotations={annotations}
                            onAddAnnotation={handleAddAnnotation}
                            remoteHoveredResidue={remoteHoveredResidue}



                            // Action bindings for this viewport
                            quality={
                              (isStudioMode && recorder.session?.metadata?.settings?.exportQuality)
                                ? recorder.session.metadata.settings.exportQuality
                                : (isPublicationMode ? 'high' : settings.quality)
                            }
                            enableAmbientOcclusion={
                              (isStudioMode && recorder.session?.metadata?.settings?.ssao !== undefined)
                                ? recorder.session.metadata.settings.ssao
                                : settings.ssao
                            }
                            pixelRatio={
                              (isStudioMode && recorder.session?.metadata?.settings?.resolutionScale !== undefined)
                                ? recorder.session.metadata.settings.resolutionScale
                                : undefined
                            }
                            showCursor={
                              isStudioMode
                                ? (recorder.session?.metadata?.settings?.showCursor ?? true)
                                : true
                            }
                            resetCamera={ctrl.resetKey}
                            disableScroll={!isScrollEnabled} // Scroll Protection

                          />
                        )}
                      </div>
                    </div>
                  );
                };

                // Render layout based on viewMode
                switch (viewMode) {
                  case 'single':
                    return renderViewport(0, 'w-full');

                  case 'dual':
                    return (
                      <>
                        {renderViewport(0, 'w-1/2 border-r border-[#333]')}
                        {renderViewport(1, 'w-1/2')}
                      </>
                    );

                  case 'quad':
                    return (
                      <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
                        {renderViewport(0, 'border-r border-b border-[#333]')}
                        {renderViewport(1, 'border-b border-[#333]')}
                        {renderViewport(2, 'border-r border-[#333]')}
                        {renderViewport(3)}
                      </div>
                    );

                  case 'triple':
                    return (
                      <div className="flex flex-col w-full h-full">
                        {renderViewport(0, 'w-full h-1/2 border-b border-[#333]')}
                        <div className="flex h-1/2 w-full">
                          {renderViewport(1, 'w-1/2 border-r border-[#333]')}
                          {renderViewport(2, 'w-1/2')}
                        </div>
                      </div>
                    );

                  default:
                    // Fallback to single view
                    return renderViewport(0, 'w-full');
                }
              })()}
            </div>
            {/* Right Sidebar: Sequence Track */}
            {!isCleanMode && visualizerEngine === 'ngl' && (
              <SequenceTrack
                id="sequence-track"
                chains={chains}
                highlightedResidue={highlightedResidue}
                onHoverResidue={() => { }}
                onClickResidue={(chain, resNo) => viewerRef.current?.focusResidue(chain, resNo)}
                onClickAtom={(serial) => viewerRef.current?.highlightAtom(serial)}
                isLightMode={isLightMode}
                coloring={coloring}
                colorPalette={colorPalette}
              />
            )}
          </div>

          <ViewportSelector
            isOpen={isSelectorOpen}
            viewMode={viewMode}
            actionName={pendingToolAction?.type === 'record' ? 'Record Video' :
              pendingToolAction?.type === 'snapshot' ? 'Take Snapshot' :
                pendingToolAction?.type === 'reset' ? 'Reset View' :
                  pendingToolAction?.type === 'save' ? 'Save Session' : 'Unknown Action'}
            onConfirm={handleSelectorConfirm}
            onCancel={() => { setIsSelectorOpen(false); setPendingToolAction(null); }}
          />

          <SnapshotModal
            isOpen={isSnapshotModalOpen}
            viewMode={viewMode}
            onConfirm={(indices, factor, transparent) => {
              handleSnapshotConfirm(indices, factor, transparent);
              sendSystemLog(`Captured Snapshot (Quality: ${factor}x)`);
            }}
            onCancel={() => setIsSnapshotModalOpen(false)}
          />

          <SessionChat
            messages={chatMessages}
            onSendMessage={handleSendChat}
            myPeerId={peerSession.peerId}
            isOpen={isChatOpen}
            setIsOpen={setIsChatOpen}
          />

          {/* End Main Content Flex Container */}

          {/* End Main Content Flex Container */}

        </>
      )}


      <ContactMap

        isOpen={showContactMap}
        onClose={() => setShowContactMap(false)}
        chains={chains}
        getContactData={getAtomDataWrapper}
        onHighlightResidue={(chain, resNo) => handleHighlightResidue(chain, resNo)}
        onPixelClick={handlePixelClick}
        isLightMode={isLightMode}
        colorPalette={colorPalette}
        proteinName={proteinTitle || (file ? file.name.replace(/\.[^/.]+$/, "") : pdbId)}
        pdbAccession={pdbId}
        getSnapshot={async () => {
          if (!viewerRef.current) return null;
          const blob = await viewerRef.current.getSnapshotBlob();
          if (!blob) return null;
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }}
        getShareableLink={() => {
          return getShareableURL(viewMode, controllers.map((ctrl, index) => ({
            pdbId: ctrl.pdbId,
            representation: ctrl.representation,
            coloring: ctrl.coloring,
            isSpinning: ctrl.isSpinning,
            showLigands: ctrl.showLigands,
            showSurface: ctrl.showSurface,
            showIons: ctrl.showIons,
            customColors: ctrl.customColors,
            customBackgroundColor: ctrl.customBackgroundColor,
            dataSource: ctrl.dataSource,
            orientation: viewerRefs[index].current?.getOrientation()
          })));
        }}
        pdbMetadata={pdbMetadata}
        getLigandInteractions={async () => {
          if (viewerRef.current) {
            return await viewerRef.current.getLigandInteractions();
          }
          return [];
        }}
      />




      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        warning={
          // Check if any visible VIEWPORT relies on a local file...
          // Actually, we can just let the user try to share. The URL generator will filter out local files automatically (no PDB ID).
          // But maybe we should warn if ALL selected are local?
          // For now, keep simple: Warn if NO shareable content exists at all in the session?
          // Or just let the generic warning handle it.
          // The current warning logic was specific to single view local files.
          // Let's refine: Warn if the user is trying to share a local file (no PDB ID).
          (viewMode === 'single' && !activeController.pdbId && activeController.file)
            ? "Sharing is not available for local files. Please use a PDB ID or PubChem Code to generate a shareable link."
            : null
        }
        viewMode={viewMode}
        viewports={controllers.map((c, i) => ({
          index: i,
          title: c.proteinTitle || c.pdbId || (c.file ? c.file.name : "Empty"),
          hasContent: !!(c.pdbId || c.file)
        }))}
        onGenerateLink={(selectedIndices) => {
          // NOTE: This callback is strictly for generating the LINK URL.
          // The Live Session logic runs separately in the useEffect above.
          const selectedViewports = controllers.map((ctrl, index) => {
            if (!selectedIndices.includes(index)) return {} as any;
            return {
              pdbId: ctrl.pdbId,
              representation: ctrl.representation,
              coloring: ctrl.coloring,
              isSpinning: ctrl.isSpinning,
              showLigands: ctrl.showLigands,
              showSurface: ctrl.showSurface,
              showIons: ctrl.showIons,
              customColors: ctrl.customColors,
              customBackgroundColor: ctrl.customBackgroundColor,
              dataSource: ctrl.dataSource,
              orientation: viewerRefs[index].current?.getOrientation()
            };
          });
          return getShareableURL(viewMode, selectedViewports);
        }}
        // Pass lifted state for Live Session sync
        selectedIndices={sharedViewportIndices}
        onSelectionChange={(indices) => {
          setSharedViewportIndices(indices);
          // Auto-switch viewMode based on max index to ensure visibility
          if (indices.length > 0) {
            const maxIndex = Math.max(...indices);
            if (maxIndex === 3) setViewMode('quad');
            else if (maxIndex === 2) setViewMode('triple');
            else if (maxIndex === 1) setViewMode('dual');
            else setViewMode('single');
          } else {
            setViewMode('single');
          }
        }}
        isLightMode={isLightMode}
        peerSession={peerSession}
      />

      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        snapshots={snapshots}
        movies={movies}
        onDeleteSnapshot={handleDeleteSnapshot}
        onDeleteMovie={handleDeleteMovie}
        onDownloadSnapshot={handleDownloadSnapshot}
        onDownloadMovie={handleDownloadMovie}
        isLightMode={isLightMode}
      />



      <LandingOverlay
        isVisible={showLanding}
        onDismiss={() => setShowLanding(false)}
        onUpload={() => {
          setShowLanding(false);
          document.getElementById('file-upload')?.click();
        }}
        onStartTour={() => {
          setShowLanding(false);
          handleStartTour();
        }}
        onLoadPdb={(id, fileUrl) => {
          if (activeController) {
            if (fileUrl) {
              activeController.setPdbId(id);
            } else {
              activeController.setPdbId(id);
            }
          }
          if (id) sendSystemLog(`Loaded Structure: ${id}`);
          setShowLanding(false);
        }}
      />

      {/* Hidden File Input for Landing Overlay Upload Action */}
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdb,.cif,.mmcif,.ent,.gro,.mol2,.sdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && activeController) {
            // Determine format
            // We use setFile to load local files
            activeController.setFile(file);
            // Also update title
            activeController.setProteinTitle(file.name);
            // Remove PDB ID/URL to ensure we render the file
            activeController.setPdbId('');
          }
        }}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {
        !isEmbedMode && (
          <HelpGuide isVisible={!isCleanMode} isLightMode={isLightMode} hasSequence={chains.length > 0} isMolStarActive={visualizerEngine === 'molstar'} isMolStarSidebarExpanded={isMolStarSidebarExpanded} />
        )
      }

      {/* Embed Mode Attribution - Viral Loop - Mobile Optimized */}
      {
        isEmbedMode && (
          <a
            href="https://quercusviewer.com"
            target="_blank"
            rel="noopener noreferrer" // Moved to bottom-left, smaller size, logo icon
            className="fixed bottom-2 left-2 md:bottom-3 md:left-3 z-50 px-1.5 py-0.5 md:px-2 md:py-1 bg-black/80 backdrop-blur-md text-white text-[9px] md:text-[10px] font-bold rounded-full shadow-lg border border-white/20 hover:scale-105 transition-transform flex items-center gap-1 md:gap-1.5"
          >
            <img src="logo/icon-white.png" alt="Q" className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Powered by Quercus
          </a>
        )
      }

      {/* Background Gradient */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isLightMode ? 'opacity-0' : 'opacity-100 bg-[radial-gradient(circle_at_50%_50%,rgba(50,50,80,0.2),rgba(0,0,0,0))]'}`} />
    </main >
  );
}




export default App;
