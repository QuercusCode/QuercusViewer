import { useState, useRef, useEffect } from 'react';
import type { RecordedSession, TimelineSegment, AudioClip } from '../types';
import { formatTime } from '../utils/timeUtils';

interface VideoTimelineProps {
    session: RecordedSession | null;
    segments?: TimelineSegment[]; // NLE Support
    onSegmentUpdate?: (id: string, updates: Partial<TimelineSegment>) => void;
    selectedSegmentIds?: string[];
    onSegmentSelect?: (id: string, multi: boolean) => void;
    playbackTime: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    isLightMode?: boolean;

    // Trim mode
    trimMode?: boolean;
    trimStart?: number;
    trimEnd?: number;
    onTrimChange?: (start: number, end: number) => void;

    // Audio Clips
    audioClips?: AudioClip[];
    onAudioClipUpdate?: (id: string, updates: Partial<AudioClip>) => void;
    onAudioClipSelect?: (id: string) => void;
}

export const VideoTimeline = ({
    session,
    segments = [],
    onSegmentUpdate,
    selectedSegmentIds = [],
    onSegmentSelect,
    playbackTime,
    onSeek,
    trimMode, // Added trimMode
    trimStart: externalTrimStart,
    trimEnd: externalTrimEnd,
    onTrimChange,
    audioClips = [],
    onAudioClipUpdate,
    onAudioClipSelect
}: VideoTimelineProps) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredTime, setHoveredTime] = useState<number | null>(null);
    const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

    // Zoom and Pan state
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = fit to width, >1 = zoomed in
    const [scrollLeft, setScrollLeft] = useState(0);
    const [isPanning, setIsPanning] = useState(false);
    const [panStartX, setPanStartX] = useState(0);
    const [panStartScroll, setPanStartScroll] = useState(0);

    // Optimized Dragging State
    const [draggingSegmentId, setDraggingSegmentId] = useState<string | null>(null);
    const [dragNewStartTime, setDragNewStartTime] = useState<number>(0);
    const dragNewStartTimeRef = useRef<number>(0);

    // Internal trim state (defaults to full duration)
    const duration = session?.metadata.duration || 1000;
    const trimStart = externalTrimStart ?? 0;
    const trimEnd = externalTrimEnd ?? duration;

    // Event type colors (InShot-inspired)
    const eventColors = {
        camera: '#00b4d8',
        state: '#00c853',
        annotation: '#ffd60a',
        chat: '#9d4edd'
    };

    // Calculate timeline dimensions
    const getTimelineWidth = () => {
        if (!containerRef.current) return 0;
        return containerRef.current.clientWidth * zoomLevel;
    };

    // Convert pixel position to time
    const xToTime = (clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left + scrollLeft;
        const width = getTimelineWidth();
        return Math.max(0, Math.min(duration, (relativeX / width) * duration));
    };

    const [isScrubbing, setIsScrubbing] = useState(false);

    const handleTimelineMouseDown = (e: React.MouseEvent) => {
        if (trimMode) return;
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            e.preventDefault();
            setIsPanning(true);
            setPanStartX(e.clientX);
            if (containerRef.current) {
                setPanStartScroll(containerRef.current.scrollLeft);
            }
        } else if (e.button === 0) {
            // Scrubbing Start
            setIsScrubbing(true);
            const time = xToTime(e.clientX);
            onSeek(time);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const time = xToTime(e.clientX);
        setHoveredTime(time);

        if (isPanning && containerRef.current) {
            const delta = e.clientX - panStartX;
            containerRef.current.scrollLeft = panStartScroll - delta;
            setScrollLeft(containerRef.current.scrollLeft);
        }

        if (isScrubbing) {
            onSeek(time);
        }
    };

    const handleMouseLeave = () => {
        setHoveredTime(null);
        setIsPanning(false);
        // Don't stop scrubbing on leave, let global mouse up handle it? 
        // Or if we leave the track, maybe we should stop scrubbing if we didn't capture pointer?
        // Since we are using simple div events, let's keep it simple: Stop scrubbing on leave or global up.
        // Better UX: add global listener for scrubbing.
    };

    const handleMouseUp = () => {
        setIsPanning(false);
        setIsScrubbing(false);
    };

    // Global Mouse Up to catching dragging outside
    useEffect(() => {
        if (isScrubbing) {
            const handleGlobalUp = () => setIsScrubbing(false);
            const handleGlobalMove = (e: MouseEvent) => {
                // Calculate time relative to container
                if (containerRef.current) {
                    // Logic duplicated from xToTime but needs clientX
                    // We can reuse xToTime if we pass clientX
                    const time = xToTime(e.clientX);
                    onSeek(time);
                }
            };
            window.addEventListener('mouseup', handleGlobalUp);
            window.addEventListener('mousemove', handleGlobalMove);
            return () => {
                window.removeEventListener('mouseup', handleGlobalUp);
                window.removeEventListener('mousemove', handleGlobalMove);
            };
        }
    }, [isScrubbing, onSeek, duration, zoomLevel, scrollLeft]); // Re-attach if deps change

    // Handle Zoom (Wheel) - Non-passive listener to prevent page zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = -e.deltaY;
                setZoomLevel(prev => Math.max(1, Math.min(10, prev + delta * 0.01))); // Increased sensitivity slightly
            }
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        // Also handle gesture events for Safari if needed (gesturestart/change/end) logic could go here

        return () => {
            container.removeEventListener('wheel', onWheel);
        };
    }, []);

    // Trim handle dragging
    const handleHandleMouseDown = (handle: 'start' | 'end') => (e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingHandle(handle);
    };

    useEffect(() => {
        if (!draggingHandle || !trimMode) return;

        const handleGlobalMouseMove = (e: MouseEvent) => {
            const time = xToTime(e.clientX);
            if (draggingHandle === 'start') {
                const newStart = Math.max(0, Math.min(time, trimEnd - 1000));
                onTrimChange?.(newStart, trimEnd);
            } else {
                const newEnd = Math.min(duration, Math.max(time, trimStart + 1000));
                onTrimChange?.(trimStart, newEnd);
            }
        };

        const handleGlobalMouseUp = () => {
            setDraggingHandle(null);
        };

        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [draggingHandle, trimMode, trimStart, trimEnd, duration, onTrimChange, zoomLevel, scrollLeft]);

    // Format time as MM:SS


    // Group events into visual blocks, respecting segments
    const getEventBlocks = () => {
        if (!session) return [];

        const blocks: Array<{
            type: string;
            start: number;
            end: number;
            count: number;
        }> = [];

        // Helper to process a list of events
        const processEvents = (events: { timestamp: number, type: string }[]) => {
            events.sort((a, b) => a.timestamp - b.timestamp).forEach((event, idx) => {
                const lastBlock = blocks[blocks.length - 1];
                const nextEvent = events[idx + 1];
                const eventEnd = nextEvent ? nextEvent.timestamp : duration;

                if (lastBlock && lastBlock.type === event.type && event.timestamp - lastBlock.end < 1000) {
                    // Extend existing block
                    lastBlock.end = eventEnd;
                    lastBlock.count++;
                } else {
                    // Create new block
                    blocks.push({
                        type: event.type,
                        start: event.timestamp,
                        end: Math.min(event.timestamp + 500, eventEnd), // Minimum 500ms block
                        count: 1
                    });
                }
            });
        };

        if (segments.length > 0) {
            // NLE Mode: Map source events to global time via segments
            const virtualEvents: { timestamp: number, type: string }[] = [];

            segments.forEach(seg => {
                session.events.forEach(e => {
                    // Check if event falls within the source range of this segment
                    if (e.timestamp >= seg.sourceStartTime && e.timestamp < seg.sourceStartTime + seg.duration) {
                        // Map to global time
                        const offset = e.timestamp - seg.sourceStartTime;
                        virtualEvents.push({
                            timestamp: seg.startTime + offset,
                            type: e.type
                        });
                    }
                });
            });

            processEvents(virtualEvents);
        } else {
            // Legacy Mode (Linear)
            processEvents(session.events);
        }

        return blocks;
    };

    // Audio Clip Dragging & Resizing State
    const [draggingAudioId, setDraggingAudioId] = useState<string | null>(null);
    const [resizingAudioId, setResizingAudioId] = useState<string | null>(null);
    // const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null); // Removed unused
    const [dragAudioStartTime, setDragAudioStartTime] = useState<number>(0);
    const [dragAudioDuration, setDragAudioDuration] = useState<number>(0);

    const handleAudioDragStart = (e: React.MouseEvent, clip: AudioClip) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const originalStartTime = clip.startTime;
        let hasMoved = false;

        setDraggingAudioId(clip.id);
        setDragAudioStartTime(originalStartTime);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!containerRef.current) return;
            if (!hasMoved && Math.abs(moveEvent.clientX - startX) > 5) {
                hasMoved = true;
                if (onAudioClipSelect) {
                    onAudioClipSelect(clip.id);
                }
            }

            const width = getTimelineWidth();
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = (deltaX / width) * duration;
            const newStartTime = Math.max(0, Math.min(duration - clip.duration, originalStartTime + deltaTime));

            setDragAudioStartTime(newStartTime);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            if (hasMoved && onAudioClipUpdate) {
                onAudioClipUpdate(clip.id, { startTime: dragAudioStartTime });
            }
            setDraggingAudioId(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleAudioResizeStart = (e: React.MouseEvent, clip: AudioClip, handle: 'left' | 'right') => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        const startX = e.clientX;
        const originalStartTime = clip.startTime;
        const originalDuration = clip.duration;
        const originalSourceStart = clip.sourceStartTime;

        setResizingAudioId(clip.id);
        // setResizeHandle(handle);
        setDragAudioStartTime(originalStartTime);
        setDragAudioDuration(originalDuration);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!containerRef.current) return;
            const width = getTimelineWidth();
            const deltaX = moveEvent.clientX - startX;
            const deltaTime = (deltaX / width) * duration;

            if (handle === 'left') {
                // Adjust start time and duration
                // Min duration 100ms
                const maxDelta = originalDuration - 100;
                // Clamp delta
                const safeDelta = Math.min(maxDelta, Math.max(-originalStartTime, deltaTime));

                const newStart = originalStartTime + safeDelta;
                const newDur = originalDuration - safeDelta;

                setDragAudioStartTime(newStart);
                setDragAudioDuration(newDur);
            } else {
                // Adjust duration only
                const newDur = Math.max(100, originalDuration + deltaTime);
                setDragAudioDuration(newDur);
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);

            if (onAudioClipUpdate) {
                if (handle === 'left') {
                    // Calculate source start time offset
                    const delta = dragAudioStartTime - originalStartTime;
                    onAudioClipUpdate(clip.id, {
                        startTime: dragAudioStartTime,
                        duration: dragAudioDuration,
                        sourceStartTime: originalSourceStart + delta
                    });
                } else {
                    onAudioClipUpdate(clip.id, { duration: dragAudioDuration });
                }
            }

            setResizingAudioId(null);
            // setResizeHandle(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const eventBlocks = getEventBlocks();

    return (
        <div id="video-timeline" className="space-y-2">
            {/* Timeline Toolbar */}
            <div className="flex justify-between items-center text-xs px-1">
                <div className="opacity-60 font-mono">
                    {formatTime(playbackTime)} / {formatTime(duration)}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                        className="p-1 hover:bg-white/10 rounded"
                    >
                        -
                    </button>
                    <span className="opacity-60 text-[10px] w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button
                        onClick={() => setZoomLevel(Math.min(10, zoomLevel + 0.5))}
                        className="p-1 hover:bg-white/10 rounded"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Timeline Track Container (Scrollable Parent) */}
            <div
                ref={containerRef}
                className="relative bg-black/40 rounded-lg border border-white/10 overflow-x-auto overflow-y-hidden cursor-pointer select-none py-2 space-y-1"
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
                style={{
                    minHeight: audioClips.length > 0 ? '10rem' : '6rem'
                }}
            >
                {/* Content Wrapper */}
                <div
                    ref={timelineRef}
                    className="relative"
                    style={{ width: `${zoomLevel * 100}%` }}
                >
                    {/* Grid Lines (Background) */}
                    <div className="absolute inset-0 pointer-events-none">
                        {[...Array(20 * Math.ceil(zoomLevel))].map((_, i) => (
                            <div
                                key={i}
                                className="absolute top-0 bottom-0 w-px bg-white/5"
                                style={{ left: `${(i / (20 * Math.ceil(zoomLevel))) * 100}%` }}
                            />
                        ))}
                    </div>

                    {/* VIDEO TRACK */}
                    <div className="relative h-16 mb-2">
                        {/* Segment Blocks */}
                        {segments.length > 0 && segments.map(seg => {
                            const isDragging = draggingSegmentId === seg.id;
                            const currentStartTime = isDragging ? dragNewStartTime : seg.startTime;
                            const left = (currentStartTime / duration) * 100;
                            const width = (seg.duration / duration) * 100;
                            const isSelected = selectedSegmentIds.includes(seg.id);

                            return (
                                <div
                                    key={seg.id}
                                    className={`absolute top-1 bottom-1 border-x transition-colors cursor-pointer group
                                        ${isSelected || isDragging
                                            ? 'bg-blue-500/40 border-blue-400 z-20 shadow-lg'
                                            : 'bg-white/10 hover:bg-white/20 border-white/20 z-10'}
                                        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                                    `}
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        transition: isDragging ? 'none' : undefined
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSegmentSelect) onSegmentSelect(seg.id, e.metaKey || e.shiftKey);
                                    }}
                                    onMouseDown={(e) => {
                                        if (e.button !== 0) return;
                                        e.stopPropagation();
                                        e.preventDefault();

                                        const startX = e.clientX;
                                        const originalStartTime = seg.startTime;
                                        let hasMoved = false;

                                        setDraggingSegmentId(seg.id);
                                        setDragNewStartTime(originalStartTime);
                                        dragNewStartTimeRef.current = originalStartTime;

                                        const handleMouseMove = (moveEvent: MouseEvent) => {
                                            if (!containerRef.current) return;
                                            if (!hasMoved && Math.abs(moveEvent.clientX - startX) > 5) {
                                                hasMoved = true;
                                                if (!isSelected && onSegmentSelect) onSegmentSelect(seg.id, false);
                                            }

                                            const width = getTimelineWidth();
                                            const deltaX = moveEvent.clientX - startX;
                                            const deltaTime = (deltaX / width) * duration;
                                            const newStartTime = Math.max(0, originalStartTime + deltaTime);

                                            setDragNewStartTime(newStartTime);
                                            dragNewStartTimeRef.current = newStartTime;
                                        };

                                        const handleMouseUp = () => {
                                            window.removeEventListener('mousemove', handleMouseMove);
                                            window.removeEventListener('mouseup', handleMouseUp);
                                            if (hasMoved && onSegmentUpdate) {
                                                onSegmentUpdate(seg.id, { startTime: dragNewStartTimeRef.current });
                                            }
                                            setDraggingSegmentId(null);
                                        };

                                        window.addEventListener('mousemove', handleMouseMove);
                                        window.addEventListener('mouseup', handleMouseUp);
                                    }}
                                    title={`Segment: ${formatTime(currentStartTime)}`}
                                >
                                    <div className={`absolute inset-x-2 top-1/2 h-0.5 ${isSelected ? 'bg-blue-200' : 'bg-white/20 group-hover:bg-white/40'}`} />
                                    {isSelected && <div className="absolute inset-0 border-2 border-blue-400 pointer-events-none" />}
                                </div>
                            );
                        })}

                        {/* Event Blocks Overlay */}
                        <div className="absolute top-0 left-0 right-0 h-4 pointer-events-none">
                            {eventBlocks.map((block, idx) => {
                                const left = (block.start / duration) * 100;
                                const width = ((block.end - block.start) / duration) * 100;
                                const color = eventColors[block.type as keyof typeof eventColors] || '#666';

                                return (
                                    <div
                                        key={idx}
                                        className="absolute top-1 h-2 rounded opacity-70"
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            backgroundColor: color,
                                            minWidth: '2px'
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* AUDIO TRACKS */}
                    {audioClips.length > 0 && (
                        <div className="relative h-12 border-t border-white/10 bg-black/20 mt-1">
                            {audioClips.map(clip => {
                                const isDraft = draggingAudioId === clip.id || resizingAudioId === clip.id;
                                const currentStartTime = isDraft ? dragAudioStartTime : clip.startTime;
                                const currentDuration = isDraft && resizingAudioId === clip.id ? dragAudioDuration : clip.duration;

                                const left = (currentStartTime / duration) * 100;
                                const width = (currentDuration / duration) * 100;
                                const isMusic = clip.type === 'music';

                                return (
                                    <div
                                        key={clip.id}
                                        className={`absolute top-1 bottom-1 rounded border overflow-hidden transition-colors cursor-pointer group/audio
                                            ${isDraft ? 'cursor-grabbing z-20 shadow-lg' : 'cursor-grab z-10'}
                                            ${isMusic
                                                ? 'bg-purple-900/40 border-purple-500/50 hover:bg-purple-900/60'
                                                : 'bg-green-900/40 border-green-500/50 hover:bg-green-900/60'}
                                        `}
                                        style={{
                                            left: `${left}%`,
                                            width: `${width}%`,
                                            transition: isDraft ? 'none' : undefined
                                        }}
                                        onMouseDown={(e) => handleAudioDragStart(e, clip)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAudioClipSelect?.(clip.id);
                                        }}
                                        title={`${clip.name} (${formatTime(currentStartTime)} - ${formatTime(currentStartTime + currentDuration)})`}
                                    >
                                        <div className="px-2 py-1 text-[10px] text-white/80 font-medium truncate flex items-center gap-1">
                                            <div className={`w-2 h-2 rounded-full ${isMusic ? 'bg-purple-400' : 'bg-green-400'}`} />
                                            {clip.name}
                                        </div>

                                        {/* Resize Handles */}
                                        <div
                                            className="absolute top-0 bottom-0 left-0 w-2 cursor-w-resize hover:bg-white/20 z-30"
                                            onMouseDown={(e) => handleAudioResizeStart(e, clip, 'left')}
                                        />
                                        <div
                                            className="absolute top-0 bottom-0 right-0 w-2 cursor-e-resize hover:bg-white/20 z-30"
                                            onMouseDown={(e) => handleAudioResizeStart(e, clip, 'right')}
                                        />

                                        {/* Waveform-ish decoration */}
                                        <div className="absolute bottom-0 left-0 right-0 h-4 flex items-end gap-0.5 px-1 opacity-30 pointer-events-none">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className={`flex-1 ${isMusic ? 'bg-purple-400' : 'bg-green-400'}`} style={{ height: `${30 + Math.random() * 70}%` }} />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Trim Overlays (Global) */}
                    {trimMode && (
                        <>
                            <div className="absolute inset-y-0 left-0 bg-black/70 pointer-events-none" style={{ width: `${(trimStart / duration) * 100}%` }} />
                            <div className="absolute inset-y-0 right-0 bg-black/70 pointer-events-none" style={{ width: `${100 - (trimEnd / duration) * 100}%` }} />

                            {/* Handles logic similar to original but relative to full height */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40"
                                style={{ left: `${(trimStart / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('start')}
                            >
                                <div className="absolute top-8 left-0 w-4 h-8 bg-blue-500 rounded-r flex items-center justify-center">
                                    <div className="w-0.5 h-4 bg-white/50" />
                                </div>
                            </div>
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40"
                                style={{ left: `${(trimEnd / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('end')}
                            >
                                <div className="absolute top-8 right-0 w-4 h-8 bg-blue-500 rounded-l flex items-center justify-center">
                                    <div className="w-0.5 h-4 bg-white/50" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* PLAYHEAD (Global) */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
                        style={{ left: `${(playbackTime / duration) * 100}%` }}
                    >
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full border border-white shadow-sm" />
                    </div>

                    {/* Hover Line */}
                    {hoveredTime !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none z-30"
                            style={{ left: `${(hoveredTime / duration) * 100}%` }}
                        >
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1 rounded">
                                {formatTime(hoveredTime)}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Event Legend */}
            <div className="flex gap-3 text-xs flex-wrap">
                {Object.entries(eventColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                        <span className="capitalize opacity-70">{type}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
