import { useRef, useState, useEffect } from 'react';
import {
    Play, Pause, Circle, Square,
    Upload, Save, Film, Pencil, Scissors, ChevronDown, Trash2, Timer, Gauge
} from 'lucide-react';
import type { RecordedSession } from '../types';
import { VideoTimeline } from './VideoTimeline';
import { formatTime, parseTimeString } from '../utils/format';

interface RecorderControlsProps {
    isRecording: boolean;
    isPlaying: boolean;
    recordingTime: number;
    playbackTime: number;
    session: RecordedSession | null;
    segments?: any[];
    updateSegment?: (id: string, updates: any) => void;
    selectedSegmentIds?: string[];
    toggleSegmentSelection?: (id: string, multi: boolean) => void;
    deleteSelectedSegments?: () => void;
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
    splitSession: (splitTime: number) => { firstSession: any; secondSession: any } | null;
    adjustSessionSpeed: (startTime: number, endTime: number, speedFactor: number) => void;

    isLightMode: boolean;
    cardBg: string;
    onEnterStudio?: () => void;
}

export const RecorderControls = ({
    isRecording, isPlaying, recordingTime, playbackTime, session, segments, updateSegment,
    selectedSegmentIds, toggleSegmentSelection, deleteSelectedSegments,
    playbackSpeed,
    startRecording, stopRecording, play, pause, seek, setPlaybackSpeed,
    exportSession, importSession, exportVideo, updateMetadata,
    trimSession, deleteEvent, deleteEventsByType, deleteEventsByTimeRange, splitSession, adjustSessionSpeed,
    isLightMode, cardBg, onEnterStudio
}: RecorderControlsProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
    const [deleteRangeStart, setDeleteRangeStart] = useState('00:00');
    const [deleteRangeEnd, setDeleteRangeEnd] = useState('00:00');

    // Visual trim mode
    const [isTrimMode, setIsTrimMode] = useState(false);
    const [isSpeedMode, setIsSpeedMode] = useState(false);
    const [speedFactor, setSpeedFactor] = useState(2);
    const [tempTrimStart, setTempTrimStart] = useState<number>(0);
    const [tempTrimEnd, setTempTrimEnd] = useState<number>(0);

    // Update temp trim values when session changes
    useEffect(() => {
        if (session) {
            setTempTrimStart(0);
            setTempTrimEnd(session.metadata.duration);
        }
    }, [session]);

    // Styles
    const styles = {
        icon: "w-4 h-4",
        button: `p-2 rounded-lg border transition-all flex items-center justify-center gap-2 ${cardBg} ${isLightMode ? 'hover:bg-neutral-100 border-neutral-200' : 'hover:bg-white/10 border-white/10'}`,
        activeButton: "bg-red-500 text-white border-red-600 animate-pulse",
        text: `text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`
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

            {/* Visual Timeline (Only if session exists) */}
            {session && !isRecording && (
                <div className="pt-2">
                    <VideoTimeline
                        session={session}
                        segments={segments}
                        onSegmentUpdate={updateSegment}
                        selectedSegmentIds={selectedSegmentIds}
                        onSegmentSelect={toggleSegmentSelection}
                        playbackTime={playbackTime}
                        isPlaying={isPlaying}
                        onSeek={seek}
                        isLightMode={isLightMode}
                        trimMode={isTrimMode}
                        trimStart={tempTrimStart}
                        trimEnd={tempTrimEnd}
                        onTrimChange={(start, end) => {
                            setTempTrimStart(start);
                            setTempTrimEnd(end);
                        }}
                    />
                </div>
            )}

            {/* Edit Panel (Only if session exists and not recording) */}
            {session && !isRecording && (
                <div className="space-y-2">
                    {/* STUDIO LAUNCHER */}
                    {onEnterStudio && (
                        <button
                            onClick={onEnterStudio}
                            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]`}
                        >
                            <Film className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Launch Studio</span>
                        </button>
                    )}

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
                            {/* Trim Controls - Visual Mode */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Trim</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <button
                                        onClick={() => setIsTrimMode(!isTrimMode)}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors ${isTrimMode
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                            : 'bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/30'
                                            }`}
                                    >
                                        {isTrimMode ? '✓ Trimming' : 'Start Trim'}
                                    </button>
                                    {isTrimMode && (
                                        <button
                                            onClick={() => {
                                                trimSession(tempTrimStart, tempTrimEnd);
                                                setIsTrimMode(false);
                                                setIsEditPanelOpen(false);
                                            }}
                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                                        >
                                            Apply Trim
                                        </button>
                                    )}
                                    {isTrimMode && (
                                        <span className="text-xs opacity-60">
                                            Drag blue handles on timeline
                                        </span>
                                    )}
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

                            {/* Split Session */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Split Session</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <button
                                        onClick={() => {
                                            const splitTime = playbackTime;
                                            const result = splitSession(splitTime);
                                            if (result) {
                                                // Download both sessions
                                                const blob1 = new Blob([JSON.stringify(result.firstSession, null, 2)], { type: 'application/json' });
                                                const blob2 = new Blob([JSON.stringify(result.secondSession, null, 2)], { type: 'application/json' });

                                                const url1 = URL.createObjectURL(blob1);
                                                const url2 = URL.createObjectURL(blob2);

                                                const a1 = document.createElement('a');
                                                a1.href = url1;
                                                a1.download = `${result.firstSession.metadata.title}.json`;
                                                a1.click();
                                                URL.revokeObjectURL(url1);

                                                setTimeout(() => {
                                                    const a2 = document.createElement('a');
                                                    a2.href = url2;
                                                    a2.download = `${result.secondSession.metadata.title}.json`;
                                                    a2.click();
                                                    URL.revokeObjectURL(url2);
                                                }, 500);

                                                setIsEditPanelOpen(false);
                                            }
                                        }}
                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors flex items-center gap-1"
                                    >
                                        <Scissors className="w-3 h-3" />
                                        Split at {formatTime(playbackTime)}
                                    </button>
                                    <span className="text-xs opacity-60">
                                        Creates 2 separate sessions
                                    </span>
                                </div>
                            </div>

                            {/* Delete Selected Segment */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Delete Segment</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {selectedSegmentIds && selectedSegmentIds.length > 0 ? (
                                        <button
                                            onClick={deleteSelectedSegments}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors flex items-center gap-1 animate-in fade-in slide-in-from-left-2"
                                        >
                                            <span className="w-3 h-3 text-center font-bold">×</span>
                                            Delete Selected ({selectedSegmentIds.length})
                                        </button>
                                    ) : (
                                        <span className="text-xs opacity-40 italic">Select a segment to delete</span>
                                    )}
                                </div>
                            </div>

                            {/* Speed Control (Feature 3) */}
                            <div className="space-y-2">
                                <label className={`${styles.text} block`}>Playback Speed FX</label>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <button
                                        onClick={() => {
                                            if (isTrimMode) setIsTrimMode(false);
                                            setIsSpeedMode(!isSpeedMode);
                                        }}
                                        className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1 ${isSpeedMode
                                            ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                            : 'bg-orange-600/20 hover:bg-orange-600/40 border border-orange-600/30'
                                            }`}
                                    >
                                        <Gauge className="w-3 h-3" />
                                        {isSpeedMode ? 'Select Range' : 'Adjust Speed'}
                                    </button>

                                    {isSpeedMode && (
                                        <>
                                            <div className="flex bg-black/40 rounded p-1 gap-1">
                                                {[0.5, 1.5, 2, 4].map(speed => (
                                                    <button
                                                        key={speed}
                                                        onClick={() => setSpeedFactor(speed)}
                                                        className={`px-2 py-0.5 rounded text-xs transition-colors ${speedFactor === speed
                                                            ? 'bg-white/20 text-white'
                                                            : 'hover:bg-white/10 text-white/50'
                                                            }`}
                                                    >
                                                        {speed}x
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    adjustSessionSpeed(tempTrimStart, tempTrimEnd, speedFactor);
                                                    setIsSpeedMode(false);
                                                    setIsEditPanelOpen(false);
                                                }}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                                            >
                                                Apply
                                            </button>
                                        </>
                                    )}
                                </div>
                                {isSpeedMode && (
                                    <div className="text-xs opacity-60 flex gap-2 items-center">
                                        <Timer className="w-3 h-3" />
                                        <span>
                                            Applying {speedFactor}x speed from {formatTime(tempTrimStart)} to {formatTime(tempTrimEnd)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
