import React from 'react';
import { ArrowLeft, Play, Pause, Scissors, Trash2, Gauge, Download, Settings, Layers, Music, Type } from 'lucide-react';
import { VideoTimeline } from './VideoTimeline';
import type { useSessionRecorder } from '../hooks/useSessionRecorder';
import { formatTime } from '../utils/format';

interface StudioLayoutProps {
    recorder: ReturnType<typeof useSessionRecorder>;
    onExit: () => void;
}

export const StudioLayout: React.FC<StudioLayoutProps> = ({ recorder, onExit }) => {
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
        splitSession
    } = recorder;

    if (!session) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col pointer-events-none">
            {/* Darkened Backdrop ensuring 3D view is visible but dimmed if needed, 
                or just UI overlays. We want the 3D view to be clear.
                So we construct a frame. 
            */}

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
                    <div>
                        <h1 className="text-sm font-semibold text-white">{session.metadata.title}</h1>
                        <div className="text-xs text-white/50 flex gap-2">
                            <span>{formatTime(session.metadata.duration)}</span>
                            <span>•</span>
                            <span>{segments.length} clips</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-xs font-medium text-white transition-colors">
                        Drafts
                    </button>
                    <button
                        onClick={recorder.exportSession}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-medium text-white transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA - TRANSPARENT CENTER */}
            <div className="flex-1 flex min-h-0">
                {/* LEFT TOOLBAR */}
                <div className="w-16 bg-neutral-900/95 backdrop-blur border-r border-white/10 flex flex-col items-center py-4 gap-4 pointer-events-auto">
                    <ToolButton icon={<Settings className="w-5 h-5" />} label="Settings" />
                    <ToolButton icon={<Layers className="w-5 h-5" />} label="Tracks" active />
                    <ToolButton icon={<Music className="w-5 h-5" />} label="Audio" />
                    <ToolButton icon={<Type className="w-5 h-5" />} label="Text" />
                </div>

                {/* VISUAL AREA (The hole) */}
                <div className="flex-1 relative">
                    {/* Floating Transport Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900/80 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-4 text-white pointer-events-auto border border-white/10">
                        <button className="hover:text-blue-400 transition-colors">
                            <span className="text-xs font-mono">{formatTime(playbackTime)}</span>
                        </button>
                        <button
                            onClick={isPlaying ? pause : play}
                            className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                        >
                            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                    </div>
                </div>

                {/* RIGHT PROPERTIES PANEL */}
                <div className="w-72 bg-neutral-900/95 backdrop-blur border-l border-white/10 flex flex-col pointer-events-auto">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="text-xs font-bold text-white/50 uppercase tracking-wider">Properties</h2>
                    </div>

                    <div className="p-4 space-y-6 overflow-y-auto flex-1">
                        {/* Selected Segment Properties */}
                        {selectedSegmentIds.length > 0 ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs text-white/70">Actions</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={deleteSelectedSegments}
                                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 flex flex-col items-center gap-1 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="text-[10px]">Delete</span>
                                        </button>
                                        <button
                                            onClick={() => splitSession(playbackTime)}
                                            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-white/10 flex flex-col items-center gap-1 transition-colors"
                                        >
                                            <Scissors className="w-4 h-4" />
                                            <span className="text-[10px]">Split</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-white/70">Speed</label>
                                    <div className="flex items-center gap-2 bg-neutral-800 rounded p-1">
                                        <Gauge className="w-4 h-4 text-white/50 ml-2" />
                                        <select className="bg-transparent text-xs text-white w-full outline-none border-none p-1">
                                            <option>1x (Normal)</option>
                                            <option>0.5x (Slow)</option>
                                            <option>2x (Fast)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 opacity-30">
                                <Layers className="w-12 h-12 mx-auto mb-2 stroke-1" />
                                <p className="text-xs">Select a clip to edit</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM TIMELINE */}
            <div className="h-48 bg-neutral-900/95 backdrop-blur border-t border-white/10 flex flex-col pointer-events-auto relative">
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
                        isLightMode={false} // Force dark for studio
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
