import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Play, Pause, Scissors, Trash2, Download,
    Settings, Layers, Music, Type, Film, Pencil, Undo, Redo,
    Image as ImageIcon, Monitor, Camera, Plus
} from 'lucide-react';
import { VideoTimeline } from './VideoTimeline';
import type { useSessionRecorder } from '../hooks/useSessionRecorder';
import { formatTime, parseTimeString } from '../utils/timeUtils';

interface StudioLayoutProps {
    recorder: ReturnType<typeof useSessionRecorder>;
    onExit: () => void;
    exportVideo: () => void;
    captureThumbnail?: () => Promise<string | null>;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({ recorder, onExit, exportVideo, captureThumbnail }) => {
    const {
        session,
        isPlaying,
        playbackTime,
        play,
        pause,
        seek,
        segments,
        updateSegment,
        selectedSegmentIds,
        toggleSegmentSelection,
        deleteSelectedSegments,
        splitSession,
        updateMetadata,
        exportSession,

        deleteEvent,
        deleteEventsByType,
        deleteEventsByTimeRange,
        trimSession,
        adjustSessionSpeed,
        playbackSpeed,
        setPlaybackSpeed,
        undo,
        redo,
        canUndo,
        canRedo
    } = recorder;

    const [isEditingTitle, setIsEditingTitle] = useState(false);

    const selectedSegments = segments.filter(s => selectedSegmentIds.includes(s.id));

    // Global Edit Modes
    const [isTrimMode, setIsTrimMode] = useState(false);
    const [tempTrimStart, setTempTrimStart] = useState<number>(0);
    const [tempTrimEnd, setTempTrimEnd] = useState<number>(0);
    const [activeTool, setActiveTool] = useState<'default' | 'settings' | 'tracks' | 'audio' | 'text'>('default');

    // Segment/Range Edit Modes
    const [speedFactor, setSpeedFactor] = useState(2);

    // Delete Range State
    const [deleteRangeStart, setDeleteRangeStart] = useState('00:00');
    const [deleteRangeEnd, setDeleteRangeEnd] = useState('00:00');

    // Reset trim on session load
    useEffect(() => {
        if (session) {
            setTempTrimStart(0);
            setTempTrimEnd(session.metadata.duration);
        }
    }, [session]);

    // Undo/Redo Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey) {
                // Redo: Shift+Cmd+Z or Cmd+Y (Windows common)
                if ((e.shiftKey && e.key.toLowerCase() === 'z') || e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    if (canRedo) redo();
                }
                // Undo: Cmd+Z
                else if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (canUndo) undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    if (!session) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
            {/* TOP BAR */}
            <div className="h-14 bg-neutral-900/95 backdrop-blur border-b border-white/10 flex items-center justify-between px-4 pointer-events-auto">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onExit}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                        title="Exit Studio"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* Divider */}
                    <div className="h-6 w-px bg-white/10 mx-2" />

                    {/* Undo/Redo */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={undo}
                            disabled={!canUndo}
                            className={`p-2 rounded-full transition-colors ${canUndo ? 'hover:bg-white/10 text-white' : 'text-white/30 cursor-not-allowed'}`}
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={!canRedo}
                            className={`p-2 rounded-full transition-colors ${canRedo ? 'hover:bg-white/10 text-white' : 'text-white/30 cursor-not-allowed'}`}
                            title="Redo (Ctrl+Shift+Z)"
                        >
                            <Redo className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-white/10 mx-2" />

                    {/* Editable Title */}
                    <div className="group">
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                type="text"
                                value={session.metadata.title}
                                onChange={(e) => updateMetadata({ title: e.target.value })}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingTitle(false);
                                }}
                                className="bg-transparent border-b border-blue-500 outline-none text-sm font-semibold text-white w-64"
                            />
                        ) : (
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                                <div>
                                    <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                                        {session.metadata.title}
                                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                    </h1>
                                    <div className="text-xs text-white/50 flex gap-2">
                                        <span>{formatTime(session.metadata.duration)}</span>
                                        <span>•</span>
                                        <span>{segments.length} clips</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-medium text-white transition-colors">
                        Drafts
                    </button>
                    <button
                        onClick={exportVideo}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs font-medium text-white transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                        <Film className="w-3.5 h-3.5" />
                        Export Video
                    </button>
                    <button
                        onClick={exportSession}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Save Project
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex min-h-0">
                {/* LEFT TOOLBAR */}
                <div className="w-16 bg-neutral-900/95 backdrop-blur border-r border-white/10 flex flex-col items-center py-4 gap-4 pointer-events-auto z-50">
                    <ToolButton
                        icon={<Settings className="w-5 h-5" />}
                        label="Settings"
                        active={activeTool === 'settings'}
                        onClick={() => setActiveTool('settings')}
                    />
                    <ToolButton
                        icon={<Layers className="w-5 h-5" />}
                        label="Tracks"
                        active={activeTool === 'tracks'}
                        onClick={() => setActiveTool('tracks')}
                    />
                    <ToolButton
                        icon={<Music className="w-5 h-5" />}
                        label="Audio"
                        active={activeTool === 'audio'}
                        onClick={() => setActiveTool('audio')}
                    />
                    <ToolButton
                        icon={<Type className="w-5 h-5" />}
                        label="Text"
                        active={activeTool === 'text'}
                        onClick={() => setActiveTool('text')}
                    />
                </div>

                {/* VISUAL AREA (The hole) */}
                <div className="flex-1 relative">
                    {/* Floating Transport Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 text-white pointer-events-auto border border-white/10 shadow-2xl z-50">
                        <span className="text-xs font-mono ml-2">{formatTime(playbackTime)}</span>

                        <div className="h-4 w-px bg-white/20" />

                        <button
                            onClick={isPlaying ? pause : play}
                            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                        </button>

                        <div className="h-4 w-px bg-white/20" />

                        <button
                            onClick={() => {
                                const idx = [0.5, 1, 2, 4].indexOf(playbackSpeed);
                                const next = [0.5, 1, 2, 4][(idx + 1) % 4];
                                setPlaybackSpeed(next);
                            }}
                            className="text-xs font-bold w-8 hover:text-blue-400 transition-colors"
                        >
                            {playbackSpeed}x
                        </button>
                    </div>
                </div>

                {/* RIGHT PROPERTIES PANEL */}
                <div className="w-80 bg-neutral-900/95 backdrop-blur border-l border-white/10 flex flex-col pointer-events-auto">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider">
                            {activeTool === 'settings' && 'Studio Settings'}
                            {activeTool === 'tracks' && 'Timeline Tracks'}
                            {activeTool === 'audio' && 'Audio Mixer'}
                            {activeTool === 'text' && 'Text Overlays'}
                            {activeTool === 'default' && (selectedSegmentIds.length > 0 ? 'Clip Properties' : 'Project Properties')}
                        </h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        {/* Segment Tools - Show when segments selected AND tool is default (or force override?) */}
                        {/* Let's prioritize explicit Tool selection. If user clicks Settings, show Settings even if segment selected. */}
                        {activeTool === 'default' && selectedSegmentIds.length > 0 ? (
                            // SEGMENT TOOLS
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/70 font-semibold">Actions</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={deleteSelectedSegments}
                                            className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 flex flex-col items-center gap-2 transition-colors group"
                                        >
                                            <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-bold">Delete</span>
                                        </button>
                                        <button
                                            onClick={() => splitSession(playbackTime)}
                                            className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-white/10 flex flex-col items-center gap-2 transition-colors group"
                                        >
                                            <Scissors className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="text-[10px] uppercase font-bold">Split</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs text-white/70 font-semibold">Speed FX</label>
                                    <div className="bg-neutral-800 rounded-lg p-1 flex gap-1">
                                        {[0.5, 1, 2, 4].map(speed => (
                                            <button
                                                key={speed}
                                                onClick={() => setSpeedFactor(speed)}
                                                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${speedFactor === speed
                                                    ? 'bg-blue-600 text-white shadow'
                                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {speed}x
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => {
                                            // Apply speed to selected segment(s)
                                            // We'll use the current playback time or segment bounds? 
                                            // Currently adjustSessionSpeed takes a range. 
                                            // TODO: Ideally we'd map this to segment bounds. 
                                            // For now, let's use the visual range if set, or just warn.
                                            // Actually, let's keep it simple: apply to the *current* visual trim range if active, 
                                            // OR maybe we should implement per-segment speed property.
                                            // Reverting to range-based for parity with RecorderControls.
                                            adjustSessionSpeed(tempTrimStart, tempTrimEnd, speedFactor);
                                        }}
                                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                    >
                                        Apply {speedFactor}x Speed
                                    </button>
                                    <p className="text-[10px] text-white/30 text-center">
                                        Applies to range {formatTime(tempTrimStart)} - {formatTime(tempTrimEnd)}
                                    </p>
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-bold truncate">Segment Settings</span>
                                    </div>

                                    {selectedSegments.length === 1 && (
                                        <div className="space-y-3 mb-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-white/60">Fade In/Out</span>
                                                <button
                                                    onClick={() => {
                                                        const seg = selectedSegments[0];
                                                        const hasFade = !!seg.transition;
                                                        updateSegment(seg.id, {
                                                            transition: hasFade ? undefined : { type: 'fade', duration: 1000 }
                                                        });
                                                    }}
                                                    className={`w-8 h-4 rounded-full transition-colors relative ${selectedSegments[0].transition ? 'bg-purple-600' : 'bg-white/10'}`}
                                                >
                                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${selectedSegments[0].transition ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : activeTool === 'settings' ? (
                            // SETTINGS PANEL
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                {/* Description Field */}
                                <div className="space-y-3">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Type className="w-3 h-3" /> Description
                                    </label>
                                    <textarea
                                        value={session.metadata.description || ''}
                                        onChange={(e) => updateMetadata({ description: e.target.value })}
                                        className="w-full h-20 bg-neutral-800 border border-white/10 rounded-lg p-3 text-xs text-white resize-none focus:ring-1 focus:ring-blue-500 outline-none"
                                        placeholder="Add project notes..."
                                    />
                                </div>

                                {/* Thumbnail */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <ImageIcon className="w-3 h-3" /> Thumbnail
                                    </label>
                                    <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/20 aspect-video flex items-center justify-center">
                                        {session.metadata.thumbnail ? (
                                            <img src={session.metadata.thumbnail} alt="Project Thumbnail" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-white/20 flex flex-col items-center">
                                                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                                                <span className="text-[10px]">No Thumbnail</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            {captureThumbnail && (
                                                <button
                                                    onClick={async () => {
                                                        const dataUrl = await captureThumbnail();
                                                        if (dataUrl) updateMetadata({ thumbnail: dataUrl });
                                                    }}
                                                    className="px-3 py-1.5 bg-white text-black rounded text-xs font-bold hover:scale-105 transition-transform flex items-center gap-2"
                                                >
                                                    <Camera className="w-3 h-3" /> Capture Frame
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Visual Settings */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Monitor className="w-3 h-3" /> Visual Settings
                                    </label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/60">Export Quality</span>
                                            <select
                                                value={session.metadata.settings?.exportQuality || 'medium'}
                                                onChange={(e) => updateMetadata({
                                                    settings: { ...session.metadata.settings, exportQuality: e.target.value as any }
                                                })}
                                                className="bg-neutral-800 border-none text-xs text-white rounded px-2 py-1 outline-none cursor-pointer hover:bg-neutral-700"
                                            >
                                                <option value="low">Low (720p)</option>
                                                <option value="medium">Medium (1080p)</option>
                                                <option value="high">High (4K)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/60">Show Cursor</span>
                                            <button
                                                onClick={() => updateMetadata({
                                                    settings: { ...session.metadata.settings, showCursor: !session.metadata.settings?.showCursor }
                                                })}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${session.metadata.settings?.showCursor ? 'bg-blue-600' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${session.metadata.settings?.showCursor ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        {/* Watermark Toggle */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/60">Watermark</span>
                                            <button
                                                onClick={() => updateMetadata({
                                                    settings: { ...session.metadata.settings, showWatermark: !session.metadata.settings?.showWatermark }
                                                })}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${session.metadata.settings?.showWatermark ? 'bg-blue-600' : 'bg-white/10'}`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${session.metadata.settings?.showWatermark ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                        {session.metadata.settings?.showWatermark && (
                                            <input
                                                type="text"
                                                value={session.metadata.watermarkText || ''}
                                                onChange={(e) => updateMetadata({ watermarkText: e.target.value })}
                                                className="w-full bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                placeholder="Custom Watermark..."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : activeTool === 'text' ? (
                            // TEXT OVERLAYS PANEL
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                            <Type className="w-3 h-3" /> Overlays
                                        </label>
                                        <button
                                            onClick={() => {
                                                const newOverlay = {
                                                    id: Date.now().toString(),
                                                    text: "New Title",
                                                    start: playbackTime,
                                                    end: playbackTime + 2000,
                                                    x: 0.5,
                                                    y: 0.8
                                                };
                                                updateMetadata({
                                                    textOverlays: [...(session.metadata.textOverlays || []), newOverlay]
                                                });
                                            }}
                                            className="p-1.5 bg-blue-600 hover:bg-blue-500 rounded text-white flex items-center gap-1.5 text-[10px] font-bold"
                                            title="Add Text Overlay at current time"
                                        >
                                            <Plus className="w-3 h-3" /> Add Text
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(session.metadata.textOverlays || []).length > 0 ? (session.metadata.textOverlays || []).map((overlay) => (
                                            <div key={overlay.id} className="bg-neutral-800 p-3 rounded-lg border border-white/5 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={overlay.text}
                                                        onChange={(e) => {
                                                            const updated = (session.metadata.textOverlays || []).map(o =>
                                                                o.id === overlay.id ? { ...o, text: e.target.value } : o
                                                            );
                                                            updateMetadata({ textOverlays: updated });
                                                        }}
                                                        className="flex-1 bg-transparent border-b border-white/10 text-xs text-white outline-none focus:border-blue-500 pb-1"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const updated = (session.metadata.textOverlays || []).filter(o => o.id !== overlay.id);
                                                            updateMetadata({ textOverlays: updated });
                                                        }}
                                                        className="text-white/40 hover:text-red-400 p-1"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                                                    <span>{formatTime(overlay.start)}</span>
                                                    <span>→</span>
                                                    <span>{formatTime(overlay.end)}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-8 text-center border ring-1 ring-white/5 border-dashed border-white/10 rounded-lg">
                                                <p className="text-[10px] text-white/30 italic">No text overlays added yet.</p>
                                                <p className="text-[10px] text-white/20 mt-1">Click "Add Text" to start.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : activeTool === 'tracks' ? (
                            // TRACKS / LAYERS PANEL
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                {/* Segment List */}
                                <div className="space-y-3">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Layers className="w-3 h-3" /> Timeline Segments ({segments.length})
                                    </label>
                                    <div className="max-h-60 overflow-y-auto space-y-1">
                                        {segments.map((seg, idx) => {
                                            const isSelected = selectedSegmentIds.includes(seg.id);
                                            return (
                                                <div
                                                    key={seg.id}
                                                    onClick={() => toggleSegmentSelection(seg.id)}
                                                    className={`p-2 rounded flex items-center gap-2 text-xs border transition-colors cursor-pointer ${isSelected
                                                        ? 'bg-blue-600/20 border-blue-500/50 text-white'
                                                        : 'bg-neutral-800 border-white/5 text-white/70 hover:bg-white/5'
                                                        }`}
                                                >
                                                    <span className="font-mono text-white/30 text-[10px] w-4">{idx + 1}</span>
                                                    <div className="flex-1 truncate">
                                                        <span className="font-semibold">Clip {idx + 1}</span>
                                                        <span className="mx-1 opacity-50">•</span>
                                                        <span>{formatTime(seg.startTime)}</span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                        {segments.length === 0 && (
                                            <p className="text-[10px] text-white/30 text-center italic py-4">No segments in timeline</p>
                                        )}
                                    </div>
                                </div>

                                {/* Bulk Delete / Clean up */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Trash2 className="w-3 h-3" /> Bulk Actions
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => deleteEventsByType('camera')}
                                            className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white/80 rounded block text-xs transition-colors border border-white/5 text-left"
                                        >
                                            <span className="block font-bold mb-1">Clear Camera</span>
                                            <span className="text-[10px] opacity-50 block">Removes all camera moves</span>
                                        </button>
                                        <button
                                            onClick={() => deleteEventsByType('annotation')}
                                            className="p-3 bg-neutral-800 hover:bg-neutral-700 text-white/80 rounded block text-xs transition-colors border border-white/5 text-left"
                                        >
                                            <span className="block font-bold mb-1">Clear Notes</span>
                                            <span className="text-[10px] opacity-50 block">Removes all annotations</span>
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const lastIdx = session.events.length - 1;
                                            if (lastIdx >= 0) deleteEvent(lastIdx);
                                        }}
                                        className="w-full p-2 bg-neutral-800 hover:bg-red-900/30 hover:text-red-400 text-white/60 rounded text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                                    >
                                        <ArrowLeft className="w-3 h-3" /> Undo Last Event
                                    </button>
                                </div>

                                {/* Delete Range */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/70 font-semibold">Delete Range</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={deleteRangeStart}
                                            onChange={(e) => setDeleteRangeStart(e.target.value)}
                                            className="bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs text-white w-full text-center font-mono"
                                            placeholder="00:00"
                                        />
                                        <span className="text-white/30">-</span>
                                        <input
                                            type="text"
                                            value={deleteRangeEnd}
                                            onChange={(e) => setDeleteRangeEnd(e.target.value)}
                                            className="bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs text-white w-full text-center font-mono"
                                            placeholder="00:00"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            const start = parseTimeString(deleteRangeStart);
                                            const end = parseTimeString(deleteRangeEnd);
                                            if (start < end && end > 0) {
                                                deleteEventsByTimeRange(start, end);
                                                setDeleteRangeStart('00:00');
                                                setDeleteRangeEnd('00:00');
                                            }
                                        }}
                                        className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/20 rounded text-xs font-bold transition-colors"
                                    >
                                        Delete In Range
                                    </button>
                                </div>
                            </div>
                        ) : activeTool === 'audio' ? (
                            // AUDIO PANEL
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
                                <div className="space-y-3">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Music className="w-3 h-3" /> Audio Mixer
                                    </label>

                                    {/* Emulate Audio Channels */}
                                    <div className="bg-neutral-800 p-3 rounded-lg border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">Master Volume</span>
                                            <span className="text-[10px] text-blue-400">100%</span>
                                        </div>
                                        <input type="range" className="w-full h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/60">Music Track</span>
                                            <button className="text-[10px] text-blue-400 hover:underline">+ Add File</button>
                                        </div>
                                        <div className="bg-neutral-800/50 p-2 rounded border border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-neutral-700 rounded flex items-center justify-center">
                                                <Music className="w-4 h-4 text-white/30" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500/50 w-full" />
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-white/30">Empty</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-white/60">Sound Effects</span>
                                            <span className="text-[10px] text-white/20">None</span>
                                        </div>
                                        <button className="w-full py-2 border border-dashed border-white/10 rounded text-[10px] text-white/40 hover:bg-white/5 hover:text-white transition-colors">
                                            Browse SFX Library
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // GLOBAL / PROJECT TOOLS (Default View)
                            <div className="space-y-6">
                                {/* Trim Tool */}
                                <div className="space-y-3">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Scissors className="w-3 h-3" /> Trim Project
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setIsTrimMode(!isTrimMode)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isTrimMode
                                                ? 'bg-blue-600 text-white ring-2 ring-blue-400/50'
                                                : 'bg-neutral-800 text-white hover:bg-neutral-700'
                                                }`}
                                        >
                                            {isTrimMode ? 'Done' : 'Select Range'}
                                        </button>
                                        {isTrimMode && (
                                            <button
                                                onClick={() => {
                                                    trimSession(tempTrimStart, tempTrimEnd);
                                                    setIsTrimMode(false);
                                                }}
                                                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Apply
                                            </button>
                                        )}
                                    </div>
                                    {isTrimMode && (
                                        <p className="text-[10px] text-blue-400">
                                            Drag timeline handles to set start/end
                                        </p>
                                    )}
                                </div>
                                <div className="pt-8 text-center">
                                    <p className="text-[10px] text-white/30">Select a tool from the sidebar to edit settings, text, or layers.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM TIMELINE */}
            <div className={`h-48 bg-neutral-900/95 backdrop-blur border-t border-white/10 flex flex-col pointer-events-auto relative transition-all duration-300 ${isTrimMode ? 'ring-1 ring-blue-500/50' : ''}`}>
                <div className="flex-1 relative mt-2">
                    <VideoTimeline
                        session={session}
                        segments={segments}
                        onSegmentUpdate={updateSegment}
                        selectedSegmentIds={selectedSegmentIds}
                        onSegmentSelect={toggleSegmentSelection}
                        playbackTime={playbackTime}
                        isPlaying={isPlaying}
                        onSeek={seek}
                        isLightMode={false}
                        trimMode={isTrimMode}
                        trimStart={tempTrimStart}
                        trimEnd={tempTrimEnd}
                        onTrimChange={(start, end) => {
                            setTempTrimStart(start);
                            setTempTrimEnd(end);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const ToolButton = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
    <button
        onClick={onClick}
        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-white/40 hover:bg-white/5 hover:text-white'}`}
        title={label}
    >
        {icon}
    </button>
);
