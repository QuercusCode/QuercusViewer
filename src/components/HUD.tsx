import { useMemo, useState, useEffect } from 'react';
import type { ResidueInfo, PDBMetadata } from '../types';
import type { PeerSession } from '../hooks/usePeerSession';
import { Eye, Wrench, Lock, Unlock, Mic, MicOff, PhoneOff, MessageSquare, Sparkles, StickyNote, Target, BookOpen } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface HUDProps {
    hoveredResidue: ResidueInfo | null;
    pdbMetadata: PDBMetadata | null;
    pdbId: string | null;
    isLightMode: boolean;
    isEmbedMode?: boolean; // Optional, defaults to false
    peerSession?: PeerSession;
    remoteHoveredResidue?: ResidueInfo | null;
    isHost?: boolean;
    remoteUserName?: string | null;
    peerNames?: Record<string, string>;
    controllerId?: string | null;
    isCameraSynced?: boolean;
    onToggleCameraSync?: () => void;
    userName?: string | null; // Added local user name
    // Chat Props
    unreadCount?: number;
    isChatOpen?: boolean;
    onToggleChat?: () => void;
    isAiChatOpen?: boolean;
    onToggleAiChat?: () => void;
    isNotesOpen?: boolean;
    onToggleNotes?: () => void;
    onOpenSettings?: () => void;
    onOpenAssignmentBuilder?: () => void;
    onOpenStoryboardBuilder?: () => void;
    isTeachingMode?: boolean;
    autoHideHUD?: boolean;
}

export function HUD({ hoveredResidue, pdbMetadata, pdbId, isLightMode, isEmbedMode = false, peerSession, remoteHoveredResidue, isHost, remoteUserName, peerNames = {}, controllerId, isCameraSynced, onToggleCameraSync, userName, unreadCount = 0, isChatOpen = false, onToggleChat, isAiChatOpen = false, onToggleAiChat, isNotesOpen = false, onToggleNotes, onOpenSettings, onOpenAssignmentBuilder, onOpenStoryboardBuilder, isTeachingMode = false, autoHideHUD = false }: HUDProps) {
    const { t } = useTranslation();
    const textColor = isLightMode ? 'text-gray-800' : 'text-gray-200';
    const bgColor = isLightMode ? 'bg-white/80' : 'bg-black/80';
    const borderColor = isLightMode ? 'border-gray-200' : 'border-neutral-800';

    // Stabilize Hover Effect: Prevent rapid switching when moving between atoms
    const [effectiveResidue, setEffectiveResidue] = useState<ResidueInfo | null>(hoveredResidue);

    useEffect(() => {
        if (hoveredResidue) {
            setEffectiveResidue(hoveredResidue);
        } else {
            // Add a small grace period before reverting to Title
            // This prevents the "shifting" flickering when moving mouse across small gaps
            const timer = setTimeout(() => setEffectiveResidue(null), 250);
            return () => clearTimeout(timer);
        }
    }, [hoveredResidue]);

    // Stabilize Remote Hover Effect: Prevent rapid switching for Guest View
    const [effectiveRemoteResidue, setEffectiveRemoteResidue] = useState<ResidueInfo | null>(remoteHoveredResidue || null);

    useEffect(() => {
        if (remoteHoveredResidue) {
            setEffectiveRemoteResidue(remoteHoveredResidue);
        } else {
            const timer = setTimeout(() => setEffectiveRemoteResidue(null), 250);
            return () => clearTimeout(timer);
        }
    }, [remoteHoveredResidue]);

    // Show ID or Title when idle
    const structTitle = useMemo(() => {
        if (pdbMetadata?.title) return pdbMetadata.title;
        return pdbId ? pdbId.toUpperCase() : null;
    }, [pdbMetadata, pdbId]);

    // Standard residues list to filter out atom details for proteins/nucleic acids
    const STANDARD_RESIDUES = new Set([
        'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE',
        'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL',
        'A', 'C', 'G', 'T', 'U', 'DA', 'DC', 'DG', 'DT'
    ]);

    // Position at bottom center to avoid interfering with any viewports

    // Close roster when clicking outside (simple check)
    // For now, toggle-based is fine.

    // Always show if connecting/connected to a peer session, even if title is missing (local file)
    const isSessionActive = peerSession?.isConnected;
    if (!isSessionActive && !effectiveResidue && (!structTitle || isEmbedMode)) return null;

    return (
        <>
            {/* Live Session Participants (Top Right) */}
            {peerSession?.isConnected && (
                <div className="fixed top-20 right-4 md:right-28 z-40 flex flex-col gap-2 items-end pointer-events-auto">
                    <div className={`backdrop-blur-md rounded-xl border ${borderColor} ${bgColor} shadow-lg p-3 min-w-[180px] animate-in slide-in-from-right-4 transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                            <span className={`text-[10px] font-bold uppercase tracking-wider opacity-70 ${textColor}`}>{t.liveSession as string}</span>
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className={`text-[10px] font-bold ${textColor}`}>{peerSession.connections.length + 1}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            {/* Me */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                    <span className={`text-xs font-medium ${textColor}`}>{isHost ? (t.youHostLabel as string) : (t.youLabel as string)}</span>
                                </div>
                                {controllerId === peerSession.peerId && (
                                    <button
                                        onClick={onOpenSettings}
                                        className="hover:bg-amber-500/10 p-1 rounded-md transition-colors cursor-pointer"
                                        title={t.openSettingsTitle as string}
                                    >
                                        <Wrench className="w-3 h-3 text-amber-500" />
                                    </button>
                                )}
                            </div>

                            {/* Peers */}
                            {peerSession.connections.map(conn => {
                                const name = peerNames[conn.peer] || 'Student';
                                const isController = controllerId === conn.peer;

                                return (
                                    <div key={conn.peer} className="flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isController ? 'bg-amber-500' : 'bg-neutral-500'}`} />
                                                <span className={`text-xs font-medium opacity-80 ${textColor}`}>{name}</span>
                                            </div>
                                            {isController && <Wrench className="w-3 h-3 text-amber-500" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Remote Hover Indicator (Floating below list) */}
                    {effectiveRemoteResidue && (
                        <div className="backdrop-blur-md rounded-lg border border-indigo-500/30 bg-indigo-500/90 text-white shadow-xl px-3 py-2 animate-in fade-in slide-in-from-right-2 max-w-[200px]">
                            <div className="flex items-center justify-between gap-3 text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-80">
                                <span>{remoteUserName || 'Peer'}</span>
                                <Eye className="w-3 h-3" />
                            </div>
                            <div className="text-xs font-mono font-bold truncate">
                                {effectiveRemoteResidue.resName} {effectiveRemoteResidue.resNo}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Center HUD Container */}
            <div className={`absolute ${isEmbedMode ? 'bottom-14' : 'bottom-28 md:bottom-6'} left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none transition-all duration-300 font-sans flex flex-col items-center gap-3 w-full px-4`}>



                {/* Mobile: Reactions Floating Above Main Bar */}
                {peerSession?.isConnected && (
                    <div className="md:hidden pointer-events-auto backdrop-blur-md rounded-full border border-gray-500/20 bg-black/60 shadow-lg px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-4 mx-auto mb-1">
                        {['👍', '👎', '❤️', '👏', '🎉'].map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => peerSession.broadcastReaction?.(emoji, userName || 'Guest')}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-xl active:scale-90 transition-transform hover:bg-white/10"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Control Pill — hidden in embed mode */}
                {!isEmbedMode && (peerSession?.isConnected || onToggleAiChat || onToggleNotes || (isTeachingMode && (onOpenAssignmentBuilder || onOpenStoryboardBuilder)) || onOpenSettings) && (
                    <div className={`pointer-events-auto backdrop-blur-md rounded-full border ${borderColor} ${bgColor} shadow-lg px-4 py-2 flex items-center justify-center gap-2 animate-in slide-in-from-bottom-2 mx-auto transition-all duration-300 ${autoHideHUD ? 'opacity-20 hover:opacity-100' : 'opacity-100'}`}>

                        {/* Desktop: Reactions Inline */}
                        {peerSession?.isConnected && (
                            <div className="hidden md:flex items-center gap-1 border-r border-gray-500/20 pr-2">
                                {['👍', '👎', '❤️', '👏', '🎉'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => peerSession.broadcastReaction?.(emoji, userName || 'Guest')}
                                        className={`w-6 h-6 flex items-center justify-center rounded-full text-sm hover:scale-125 transition-transform active:scale-90 ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/10'}`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Chat Toggles */}
                        {(onToggleChat || onToggleAiChat || onToggleNotes || onOpenAssignmentBuilder || onOpenStoryboardBuilder) && (
                            <div className={`flex items-center gap-2 ${peerSession?.isConnected ? 'border-r border-gray-500/20 pr-2' : ''}`}>
                                {onToggleNotes && (
                                    <button
                                        onClick={onToggleNotes}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors shadow-sm ${isNotesOpen
                                            ? 'bg-amber-500 text-white shadow-md'
                                            : (isLightMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30')
                                            }`}
                                        title={t.quickNotes as string}
                                    >
                                        <StickyNote className="w-4 h-4 md:w-3 md:h-3" />
                                        {t.notesBtn as string}
                                    </button>
                                )}
                                {onToggleChat && (
                                    <button
                                        onClick={onToggleChat}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors ${isChatOpen
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : (isLightMode ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30')
                                            }`}
                                    >
                                        <MessageSquare className="w-4 h-4 md:w-3 md:h-3" />
                                        {t.chatBtn as string}
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-black">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                                {onToggleAiChat && (
                                    <button
                                        onClick={onToggleAiChat}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors shadow-sm ${isAiChatOpen
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : (isLightMode ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30')
                                            }`}
                                        title="Quercus AI"
                                    >
                                        <Sparkles className="w-4 h-4 md:w-3 md:h-3" />
                                        {t.aiBtn as string}
                                    </button>
                                )}
                                {isTeachingMode && onOpenAssignmentBuilder && (
                                    <button
                                        onClick={onOpenAssignmentBuilder}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors shadow-sm ${isLightMode ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'}`}
                                        title="Create Assignment"
                                    >
                                        <Target className="w-4 h-4 md:w-3 md:h-3" />
                                        Quiz
                                    </button>
                                )}
                                {isTeachingMode && onOpenStoryboardBuilder && (
                                    <button
                                        onClick={onOpenStoryboardBuilder}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors shadow-sm ${isLightMode ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'}`}
                                        title="Create Storyboard"
                                    >
                                        <BookOpen className="w-4 h-4 md:w-3 md:h-3" />
                                        Story
                                    </button>
                                )}
                                {onOpenSettings && (
                                    <button
                                        onClick={onOpenSettings}
                                        className={`relative text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors shadow-sm ${isLightMode ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'}`}
                                        title={t.openSettingsTitle as string}
                                    >
                                        <Wrench className="w-4 h-4 md:w-3 md:h-3" />
                                        Settings
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Audio Controls */}
                        {peerSession?.isConnected && (
                            <div className={`flex items-center gap-2 shrink-0 ${!isHost && onToggleCameraSync ? 'md:pr-2 md:border-r md:border-gray-500/20' : ''}`}>
                                {!peerSession.isAudioConnected ? (
                                    <button
                                        onClick={() => peerSession.joinAudio?.()}
                                        className={`text-[10px] font-bold px-4 py-1.5 md:px-2 md:py-1 rounded-full flex items-center gap-2 transition-colors ${isLightMode
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                                            }`}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {t.joinVoice as string}
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => peerSession.toggleMute?.()}
                                            className={`p-2 md:p-1.5 rounded-full transition-colors ${peerSession.isMuted
                                                ? 'bg-red-500 text-white hover:bg-red-600'
                                                : (isLightMode ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-white/10 text-white hover:bg-white/20')
                                                }`}
                                            title={peerSession.isMuted ? (t.unmuteBtn as string) : (t.muteBtn as string)}
                                        >
                                            {peerSession.isMuted ? <MicOff className="w-4 h-4 md:w-3 md:h-3" /> : <Mic className="w-4 h-4 md:w-3 md:h-3" />}
                                        </button>
                                        <button
                                            onClick={() => peerSession.leaveAudio?.()}
                                            className="p-2 md:p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                            title={t.leaveVoice as string}
                                        >
                                            <PhoneOff className="w-4 h-4 md:w-3 md:h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* View/Edit Toggle for Guests */}
                        {peerSession?.isConnected && !isHost && onToggleCameraSync && (
                            <div className="">
                                <button
                                    onClick={onToggleCameraSync}
                                    className={`text-[10px] font-bold px-2 py-1 md:py-0.5 rounded transition-colors flex items-center gap-1.5 ${isCameraSynced
                                        ? (isLightMode ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50')
                                        : (isLightMode ? 'text-neutral-500 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-200' : 'text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700')
                                        }`}
                                >
                                    {isCameraSynced ? <Lock className="w-3 h-3 md:w-3 md:h-3" /> : <Unlock className="w-3 h-3 md:w-3 md:h-3" />}
                                    <span className="hidden sm:inline">
                                        {isCameraSynced ? (t.viewMode as string) : (t.editMode as string)}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Minimal Capsule (Bottom Center) - Only show if we have content */}
                {/* In embed mode: only show when hovering (EmbedToolbar shows the idle title) */}
                {(effectiveResidue || (!isEmbedMode && structTitle)) && (
                    <div className={`backdrop-blur-md rounded-full border ${borderColor} ${bgColor} shadow-sm px-4 md:px-6 py-2 flex items-center justify-center min-w-[240px] transition-all duration-300 ease-out overflow-hidden mt-1`}>
                        <div className="relative flex items-center justify-center">
                            {/* Residue Info View - Fades In/Out */}
                            <div className={`flex items-center gap-3 transition-opacity duration-300 ${effectiveResidue ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden absolute'}`}>
                                {effectiveResidue && (
                                    <>
                                        {STANDARD_RESIDUES.has(effectiveResidue.resName.toUpperCase()) ? (
                                            <>
                                                <span className={`font-semibold ${textColor} whitespace-nowrap`}>
                                                    {effectiveResidue.resName} <span className="opacity-90">{effectiveResidue.resNo}</span>
                                                </span>
                                                <div className={`h-3 w-px ${isLightMode ? 'bg-black/10' : 'bg-white/20'}`} />
                                                <span className={`text-xs uppercase tracking-wide opacity-80 ${textColor} whitespace-nowrap`}>
                                                    Chain {effectiveResidue.chain}
                                                </span>
                                            </>
                                        ) : (
                                            (effectiveResidue.atomName) ? (
                                                <span className={`font-mono font-bold ${textColor} whitespace-nowrap text-lg`}>
                                                    {effectiveResidue.atomName} <span className="text-sm opacity-60">#{effectiveResidue.atomSerial}</span>
                                                </span>
                                            ) : (
                                                // Fallback for chemical with no atom name: Show Element + Serial
                                                (effectiveResidue.element && effectiveResidue.atomSerial) ? (
                                                    <span className={`font-mono font-bold ${textColor} whitespace-nowrap text-lg`}>
                                                        {effectiveResidue.element}{effectiveResidue.atomSerial} <span className="text-sm opacity-60">#{effectiveResidue.atomSerial}</span>
                                                    </span>
                                                ) : (
                                                    <span className={`font-semibold ${textColor} whitespace-nowrap`}>
                                                        {effectiveResidue.resName} <span className="opacity-90">{effectiveResidue.resNo}</span>
                                                    </span>
                                                )
                                            )
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Idle Title View - Fades In/Out */}
                            <div className={`text-xs font-medium tracking-wider ${textColor} uppercase text-center truncate max-w-[240px] transition-opacity duration-300 ${!effectiveResidue ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden absolute'}`}>
                                {structTitle}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
