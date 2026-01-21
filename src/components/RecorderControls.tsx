import { useRef } from 'react';
import {
    Play, Pause, Circle, Square,
    Upload, Save
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
    exportSession, importSession,
    isLightMode, cardBg
}: RecorderControlsProps) => {

    // Only show full detailed controls if we have a session or are recording
    // Otherwise show a compact "Start Recording" or "Load Session" button
    const styles = {
        icon: "w-4 h-4",
        button: `p-2 rounded-lg border transition-all flex items-center justify-center gap-2 ${cardBg} ${isLightMode ? 'hover:bg-neutral-100 border-neutral-200' : 'hover:bg-white/10 border-white/10'}`,
        activeButton: "bg-red-500 text-white border-red-600 animate-pulse",
        text: `text-[10px] font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Render Timeline Scrubber
    const renderScrubber = () => {
        if (!session) return null;

        const progress = (playbackTime / session.metadata.duration) * 100;

        return (
            <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const p = (e.clientX - rect.left) / rect.width;
                    seek(p * session.metadata.duration);
                }}>
                <div
                    className="h-full bg-blue-500 rounded-full absolute top-0 left-0 pointer-events-none transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="w-3 h-3 bg-white shadow rounded-full absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `${progress}%` }}
                />
            </div>
        );
    };

    return (
        <div className={`p-3 rounded-xl border space-y-3 ${cardBg} ${isLightMode ? 'border-neutral-200' : 'border-white/10'}`}>

            {/* Header / Status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isRecording ? (
                        <div className="flex items-center gap-2 text-red-500 animate-pulse">
                            <Circle className="w-3 h-3 fill-current" />
                            <span className="text-xs font-bold">REC {formatTime(recordingTime)}</span>
                        </div>
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
                            <button
                                onClick={exportSession}
                                className="p-1 hover:text-green-500 transition-colors"
                                title="Save Session"
                            >
                                <Save className="w-3.5 h-3.5" />
                            </button>
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
        </div>
    );
};
