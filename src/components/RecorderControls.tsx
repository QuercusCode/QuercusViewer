import { useRef, useState } from 'react';
import {
    Play, Pause, Circle, Square,
    Upload, Save, Film, Pencil
} from 'lucide-react';
import type { RecordedSession } from '../types';
import { formatTime } from '../utils/timeUtils';

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
    setPlaybackSpeed: (speed: number) => void;
    exportSession: () => void;
    importSession: (file: File) => void;
    exportVideo: () => void;
    updateMetadata: (updates: any) => void;

    isLightMode: boolean;
    cardBg: string;
    onEnterStudio?: () => void;
}

export const RecorderControls = ({
    isRecording, isPlaying, recordingTime, session,
    playbackSpeed,
    startRecording, stopRecording, play, pause, setPlaybackSpeed,
    exportSession, importSession, exportVideo, updateMetadata,
    isLightMode, cardBg, onEnterStudio
}: RecorderControlsProps) => {

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);

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
                {
                    !isRecording && (
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
                    )
                }
            </div >

            {/* Main Controls */}
            < div className="flex items-center justify-between gap-2" >
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

            {/* Studio Mode Launcher (Only if session exists and not recording) */}
            {
                session && !isRecording && (
                    <div className="space-y-2">
                        {onEnterStudio && (
                            <button
                                onClick={onEnterStudio}
                                className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] animate-pulse ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-900 dark:ring-offset-neutral-900`}
                            >
                                <Film className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Launch Studio</span>
                            </button>
                        )}
                    </div>
                )
            }
        </div >
    );
};
