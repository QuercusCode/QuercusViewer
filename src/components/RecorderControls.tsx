import { useRef, useState } from 'react';
import {
    Play, Pause, Circle, Square,
    Upload, Save, Film, Pencil, Scissors, ChevronDown, Trash2
} from 'lucide-react';
import type { RecordedSession } from '../types';

interface RecorderControlsProps {
    isRecording: boolean;
    isPlaying: boolean;
    recordingTime: number;
    playbackTime: number;
    session: RecordedSession | null;
    playbackSpeed: number;

    startRecording: () => void;
    stopRecording: () => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    exportSession: () => void;
    importSession: (file: File) => void;
    exportVideo: () => void;
    updateMetadata: (updates: any) => void;
    trimSession: (startTime: number, endTime: number) => void;
    deleteEvent: (index: number) => void;
    deleteEventsByType: (type: string, fromTime?: number, toTime?: number) => void;
    deleteEventsByTimeRange: (fromTime: number, toTime: number) => void;

    isLightMode: boolean;
    cardBg: string;
}

const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

export const RecorderControls = ({
    isRecording, isPlaying, recordingTime, playbackTime, session, playbackSpeed,
    startRecording, stopRecording, play, pause, seek, setPlaybackSpeed,
    exportSession, importSession, exportVideo, updateMetadata,
    trimSession, deleteEvent, deleteEventsByType, deleteEventsByTimeRange,
    isLightMode, cardBg
}: RecorderControlsProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
    const [trimStart, setTrimStart] = useState('00:00');
    const [trimEnd, setTrimEnd] = useState('00:00');
    const [deleteRangeStart, setDeleteRangeStart] = useState('00:00');
    const [deleteRangeEnd, setDeleteRangeEnd] = useState('00:00');

    // Only show full detailed controls if we have a session or are recording
    // Otherwise show a compact "Start Recording" or "Load Session" button
    const styles = {
        icon: "w-4 h-4",
        button: `p-2 rounded-lg border transition-all flex items-center justify-center gap-2 ${cardBg} ${isLightMode ? 'hover:bg-neutral-100 border-neutral-200' : 'hover:bg-white/10 border-white/10'}`,
        activeButton: "bg-red-500 text-white border-red-600 animate-pulse",
        text: `text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`
    };

    // Render Timeline Scrubber
    const renderScrubber = () => {
        if (!session) return null;

        const progress = (playbackTime / session.metadata.duration) * 100;

        // Filter out high-frequency camera events, keep state/annotation/chat
        const markers = session.events.filter(e => e.type !== 'camera');

        return (
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const p = (e.clientX - rect.left) / rect.width;
                    seek(p * session.metadata.duration);
                }}>

                {/* Visual Markers for Significant Events */}
                {markers.map((event, idx) => {
                    const left = (event.timestamp / session.metadata.duration) * 100;
                    return (
                        <div
                            key={idx}
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-500 rounded-full pointer-events-none opacity-50 z-10"
                            style={{ left: `${left}%` }}
                            title={`${event.type} change at ${formatTime(event.timestamp)}`}
                        />
                    );
                })}

                <div
                    className="h-full bg-blue-500 rounded-full absolute top-0 left-0 pointer-events-none transition-all duration-100 z-20"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="w-3 h-3 bg-white shadow rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-30"
                    style={{ left: `${progress}%` }}
                />
            </div>
        );
    };

    return (
        <div className={`p-3 rounded-xl border space-y-3 ${cardBg} ${isLightMode ? 'border-neutral-200' : 'border-white/10'}`}>

            {/* Header / Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 mr-2">
                    {isRecording ? (
                        <div className="flex items-center gap-2 text-red-500 animate-pulse">
                            <Circle className="w-3 h-3 fill-current" />
                            <span className="text-xs font-bold">REC {formatTime(recordingTime)}</span>
                        </div>
                    ) : session ? (
                        isEditingTitle ? (
                            <input
                                autoFocus
                                type="text"
                                value={session.metadata.title}
                                onChange={(e) => updateMetadata({ title: e.target.value })}
                                onBlur={() => setIsEditingTitle(false)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') setIsEditingTitle(false);
                                }}
                                className={`bg-transparent border-b border-blue-500 outline-none text-xs font-bold w-full ${styles.text}`}
                            />
                        ) : (
                            <button
                                onClick={() => setIsEditingTitle(true)}
                                className={`flex items-center gap-2 group text-left w-full hover:bg-white/5 p-1 -ml-1 rounded transition-colors`}
                            >
                                <span className={`text-xs font-bold truncate ${styles.text}`}>
                                    {session.metadata.title}
                                </span>
                                <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                            </button>
                        )
                    ) : (
                        <span className={styles.text}>Session Recorder</span>
                    )}
                </div>

                {/* File Controls (Load/Save) */}
                {!isRecording && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1 hover:text-blue-500 transition-colors"
                            title="Load Session"
                        >
                            <Upload className="w-3.5 h-3.5" />
                        </button>
                        <input
                            type="file"
                            accept=".json"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && importSession(e.target.files[0])}
                        />
                        {session && (
                            <>
                                <button
                                    onClick={exportVideo}
                                    className="p-1 hover:text-purple-500 transition-colors"
                                    title="Export Video (WebM)"
                                >
                                    <Film className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={exportSession}
                                    className="p-1 hover:text-green-500 transition-colors"
                                    title="Save Session (JSON)"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-between gap-2">
                {!session && !isRecording ? (
                    <button onClick={startRecording} className={`w-full ${styles.button} text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                        <Circle className="w-3 h-3" /> Start Recording
                    </button>
                ) : isRecording ? (
                    <button onClick={stopRecording} className={`w-full ${styles.button} text-neutral-900 dark:text-white`}>
                        <Square className="w-3 h-3 fill-current" /> Stop
                    </button>
                ) : (
                    // Playback Controls
                    <div className="flex-1 flex items-center justify-center gap-2">
                        <button onClick={isPlaying ? pause : play} className={`${styles.button} w-10`}>
                            {isPlaying ? <Pause className={styles.icon} /> : <Play className={styles.icon} />}
                        </button>
                        <button onClick={() => {
                            const idx = [0.5, 1, 2, 4].indexOf(playbackSpeed);
                            const next = [0.5, 1, 2, 4][(idx + 1) % 4];
                            setPlaybackSpeed(next);
                        }} className={`${styles.button} px-2 w-12 font-mono text-[10px]`}>
                            {playbackSpeed}x
                        </button>
                    </div>
                )}
            </div>

            {/* Timeline (Only if session exists) */}
            {session && !isRecording && (
                <div className="space-y-1 pt-1">
                    {renderScrubber()}
                    <div className="flex justify-between text-[9px] font-mono opacity-60">
                        <span>{formatTime(playbackTime)}</span>
                        <span>{formatTime(session.metadata.duration)}</span>
                    </div>
                </div>
            )}

            {/* Edit Panel (Only if session exists and not recording) */}
            {session && !isRecording && (
                <div className="space-y-2">
                    <button
                        onClick={() => setIsEditPanelOpen(!isEditPanelOpen)}
                        className={`w-full flex items-center justify-between p-2 rounded ${styles.button} text-xs`}
                    >
                        <div className="flex items-center gap-2">
                            <Scissors className="w-3.5 h-3.5" />
                            <span className={styles.text}>Edit Recording</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isEditPanelOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isEditPanelOpen && (
                        <div className="space-y-3 p-3 bg-black/20 rounded-lg">
                            {/* Trim Controls */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Trim</label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={trimStart}
                                        onChange={(e) => setTrimStart(e.target.value)}
                                        placeholder="00:00"
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs w-16 font-mono"
                                    />
                                    <span className="text-xs opacity-50">to</span>
                                    <input
                                        type="text"
                                        value={trimEnd}
                                        onChange={(e) => setTrimEnd(e.target.value)}
                                        placeholder={formatTime(session.metadata.duration)}
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs w-16 font-mono"
                                    />
                                    <button
                                        onClick={() => {
                                            const start = parseTimeString(trimStart);
                                            const end = parseTimeString(trimEnd) || session.metadata.duration;
                                            if (start < end) {
                                                trimSession(start, end);
                                                setIsEditPanelOpen(false);
                                            }
                                        }}
                                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>

                            {/* Event Deletion Controls */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Delete Events</label>
                                <div className="flex gap-2 flex-wrap">
                                    <button
                                        onClick={() => {
                                            const lastIdx = session.events.length - 1;
                                            if (lastIdx >= 0) deleteEvent(lastIdx);
                                        }}
                                        className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 border border-red-600/30 rounded text-xs transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Undo Last
                                    </button>
                                    <button
                                        onClick={() => deleteEventsByType('camera')}
                                        className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30 rounded text-xs transition-colors"
                                    >
                                        Delete Camera
                                    </button>
                                    <button
                                        onClick={() => deleteEventsByType('annotation')}
                                        className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/30 rounded text-xs transition-colors"
                                    >
                                        Delete Annotations
                                    </button>
                                </div>
                            </div>

                            {/* Delete by Time Range */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Delete by Time Range</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <input
                                        type="text"
                                        value={deleteRangeStart}
                                        onChange={(e) => setDeleteRangeStart(e.target.value)}
                                        placeholder="00:00"
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs w-16 font-mono"
                                    />
                                    <span className="text-xs opacity-50">to</span>
                                    <input
                                        type="text"
                                        value={deleteRangeEnd}
                                        onChange={(e) => setDeleteRangeEnd(e.target.value)}
                                        placeholder="00:00"
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs w-16 font-mono"
                                    />
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
                                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Delete Range
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper function to parse MM:SS format
const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return (minutes * 60 + seconds) * 1000; // Convert to milliseconds
};
