import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Play, Pause, Scissors, Trash2, Download,
    Settings, Layers, Music, Type, Film, Pencil
} from 'lucide-react';
import { VideoTimeline } from './VideoTimeline';
import type { useSessionRecorder } from '../hooks/useSessionRecorder';
import { formatTime, parseTimeString } from '../utils/format';

interface StudioLayoutProps {
    recorder: ReturnType<typeof useSessionRecorder>;
    onExit: () => void;
    exportVideo: () => void;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({ recorder, onExit, exportVideo }) => {
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
        setPlaybackSpeed
    } = recorder;

    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Global Edit Modes
    const [isTrimMode, setIsTrimMode] = useState(false);
    const [tempTrimStart, setTempTrimStart] = useState<number>(0);
    const [tempTrimEnd, setTempTrimEnd] = useState<number>(0);

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
                <div className="w-16 bg-neutral-900/95 backdrop-blur border-r border-white/10 flex flex-col items-center py-4 gap-4 pointer-events-auto">
                    <ToolButton icon={<Settings className="w-5 h-5" />} label="Settings" />
                    <ToolButton icon={<Layers className="w-5 h-5" />} label="Tracks" active />
                    <ToolButton icon={<Music className="w-5 h-5" />} label="Audio" />
                    <ToolButton icon={<Type className="w-5 h-5" />} label="Text" />
                </div>

                {/* VISUAL AREA (The hole) */}
                <div className="flex-1 relative border-4 border-red-500 bg-transparent">
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
                            {selectedSegmentIds.length > 0 ? 'Clip Properties' : 'Project Properties'}
                        </h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        {selectedSegmentIds.length > 0 ? (
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
                            </div>
                        ) : (
                            // GLOBAL / PROJECT TOOLS
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

                                {/* Bulk Delete */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <label className="text-xs text-white/70 font-semibold flex items-center gap-2">
                                        <Trash2 className="w-3 h-3" /> Bulk Delete
                                    </label>

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => deleteEventsByType('camera')}
                                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white/80 rounded block text-xs transition-colors"
                                        >
                                            Camera Events
                                        </button>
                                        <button
                                            onClick={() => deleteEventsByType('annotation')}
                                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white/80 rounded block text-xs transition-colors"
                                        >
                                            Annotations
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => {
                                            const lastIdx = session.events.length - 1;
                                            if (lastIdx >= 0) deleteEvent(lastIdx);
                                        }}
                                        className="w-full p-2 bg-neutral-800 hover:bg-red-900/30 hover:text-red-400 text-white/60 rounded text-xs transition-colors flex items-center justify-center gap-2"
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

const ToolButton = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
    <button className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-white/40 hover:bg-white/5 hover:text-white'}`} title={label}>
        {icon}
    </button>
);
