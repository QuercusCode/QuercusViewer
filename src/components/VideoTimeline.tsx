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

    // Audio Dragging Logic
    const [draggingAudioId, setDraggingAudioId] = useState<string | null>(null);
    const [draggingAudioType, setDraggingAudioType] = useState<'move' | 'start' | 'end' | null>(null);
    const [dragAudioNewStart, setDragAudioNewStart] = useState<number>(0);
    const [dragAudioNewDuration, setDragAudioNewDuration] = useState<number>(0);
    const [dragAudioNewSourceStart, setDragAudioNewSourceStart] = useState<number>(0);
    const dragAudioStateRef = useRef({ start: 0, duration: 0, sourceStart: 0 });

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

    const eventBlocks = getEventBlocks();

    return (
        <div className="space-y-2">
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

            {/* Timeline Track Container */}
            <div
                ref={containerRef}
                className="relative h-auto min-h-[6rem] bg-black/40 rounded-lg border border-white/10 overflow-x-auto overflow-y-hidden cursor-pointer select-none py-2 space-y-2"
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                // onWheel removed - handled by non-passive ref listener
                onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}
            >
                {/* Scrollable Content */}
                <div
                    ref={timelineRef}
                    className="absolute top-0 bottom-0"
                    style={{ width: `${zoomLevel * 100}%` }}
                >
                    {/* Grid Lines */}
                    {[...Array(20 * Math.ceil(zoomLevel))].map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-0 bottom-0 w-px bg-white/5"
                            style={{ left: `${(i / (20 * Math.ceil(zoomLevel))) * 100}%` }}
                        />
                    ))}

                    {/* Segment Blocks (Interactive) */}
                    {segments.length > 0 && segments.map(seg => {
                        // Check if this segment is currently being dragged
                        const isDragging = draggingSegmentId === seg.id;
                        // Use instantaneous time if dragging, otherwise committed time
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
                                    // Disable transition while dragging for smooth movement
                                    transition: isDragging ? 'none' : undefined
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSegmentSelect) {
                                        onSegmentSelect(seg.id, e.metaKey || e.shiftKey);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    if (e.button !== 0) return; // Only Left Click
                                    e.stopPropagation();
                                    e.preventDefault();

                                    const startX = e.clientX;
                                    const originalStartTime = seg.startTime;
                                    let hasMoved = false;

                                    // Start dragging
                                    setDraggingSegmentId(seg.id);
                                    setDragNewStartTime(originalStartTime);
                                    dragNewStartTimeRef.current = originalStartTime;

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        if (!timelineRef.current) return;

                                        if (!hasMoved && Math.abs(moveEvent.clientX - startX) > 5) {
                                            hasMoved = true;
                                            if (!isSelected && onSegmentSelect) {
                                                onSegmentSelect(seg.id, false);
                                            }
                                        }

                                        // Always calculate position even before threshold to avoid jumps
                                        const rect = timelineRef.current.getBoundingClientRect();
                                        const deltaX = moveEvent.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * duration;
                                        const newStartTime = Math.max(0, originalStartTime + deltaTime);

                                        // Update local state
                                        setDragNewStartTime(newStartTime);
                                        dragNewStartTimeRef.current = newStartTime;
                                    };

                                    const handleMouseUp = () => {
                                        window.removeEventListener('mousemove', handleMouseMove);
                                        window.removeEventListener('mouseup', handleMouseUp);

                                        // Commit the change
                                        if (hasMoved && onSegmentUpdate) {
                                            onSegmentUpdate(seg.id, { startTime: dragNewStartTimeRef.current });
                                        }

                                        // Reset
                                        setDraggingSegmentId(null);
                                    };

                                    // Actually, let's fix the closure issue by using a mutable ref for the value
                                    // But to render, we need state. So we update both.
                                    // Ref is needed for access in handleMouseUp.

                                    // See ref setup below.

                                    window.addEventListener('mousemove', handleMouseMove);
                                    window.addEventListener('mouseup', handleMouseUp);
                                }}
                                title={`Segment: ${formatTime(currentStartTime)} - ${formatTime(currentStartTime + seg.duration)}`}
                            >
                                {/* Drag Handle Indicator */}
                                <div className={`absolute inset-x-2 top-1/2 h-0.5 ${isSelected ? 'bg-blue-200' : 'bg-white/20 group-hover:bg-white/40'}`} />

                                {/* Selected Border */}
                                {isSelected && <div className="absolute inset-0 border-2 border-blue-400 pointer-events-none" />}
                            </div>
                        );
                    })}

                    {/* Event Blocks */}
                    <div className="absolute top-0 left-0 right-0 h-12">
                        {eventBlocks.map((block, idx) => {
                            const left = (block.start / duration) * 100;
                            const width = ((block.end - block.start) / duration) * 100;
                            const color = eventColors[block.type as keyof typeof eventColors] || '#666';

                            return (
                                <div
                                    key={idx}
                                    className="absolute top-2 h-8 rounded opacity-70 hover:opacity-100 transition-opacity"
                                    style={{
                                        left: `${left}%`,
                                        width: `${width}%`,
                                        backgroundColor: color,
                                        minWidth: '2px'
                                    }}
                                    title={`${block.type} (${block.count} events)`}
                                />
                            );
                        })}
                    </div>

                    {/* Trim Mode Overlays */}
                    {trimMode && (
                        <>
                            {/* Dimmed regions */}
                            <div
                                className="absolute top-0 bottom-0 bg-black/70 pointer-events-none"
                                style={{
                                    left: 0,
                                    width: `${(trimStart / duration) * 100}%`
                                }}
                            />
                            <div
                                className="absolute top-0 bottom-0 bg-black/70 pointer-events-none"
                                style={{
                                    left: `${(trimEnd / duration) * 100}%`,
                                    right: 0
                                }}
                            />

                            {/* Trim Handles */}
                            {/* Start Handle - Grip faces Right (Inwards) */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40 transition-all group/start"
                                style={{ left: `${(trimStart / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('start')}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-4 h-12 bg-blue-500 rounded-r-md rounded-l-none flex items-center justify-center shadow-lg shadow-black/20 group-hover/start:bg-blue-400 transition-colors">
                                    <div className="w-0.5 h-6 bg-white/50" />
                                </div>
                                {/* Label */}
                                <div className="absolute -top-8 left-0 px-2 py-1 bg-blue-500 text-white text-[10px] rounded opacity-0 group-hover/start:opacity-100 transition-opacity whitespace-nowrap font-bold">
                                    Start: {formatTime(trimStart)}
                                </div>
                            </div>

                            {/* End Handle - Grip faces Left (Inwards) */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40 transition-all group/end"
                                style={{ left: `${(trimEnd / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('end')}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-4 h-12 bg-blue-500 rounded-l-md rounded-r-none flex items-center justify-center shadow-lg shadow-black/20 group-hover/end:bg-blue-400 transition-colors">
                                    <div className="w-0.5 h-6 bg-white/50" />
                                </div>
                                {/* Label */}
                                <div className="absolute -top-8 right-0 px-2 py-1 bg-blue-500 text-white text-[10px] rounded opacity-0 group-hover/end:opacity-100 transition-opacity whitespace-nowrap font-bold">
                                    End: {formatTime(trimEnd)}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Playhead - Interactive & Larger Target */}
                    {/* Playhead - Interactive & Larger Target */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 group/playhead"
                        style={{ left: `${(playbackTime / duration) * 100}%` }}
                    >
                        {/* Safe Zone (Larger Hit Area for easy grabbing) */}
                        <div
                            className="absolute -top-2 -bottom-2 -left-4 -right-4 cursor-ew-resize z-50 flex justify-center"
                            onMouseDown={(e) => {
                                e.stopPropagation(); // Prevent grabbing underlying segments
                                e.preventDefault();
                                setIsScrubbing(true);
                            }}
                            title="Drag to scrub"
                        />

                        {/* Visual Handle */}
                        <div className="absolute -top-1.5 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-md border-2 border-white ring-2 ring-red-500/30 pointer-events-none transition-transform group-hover/playhead:scale-110" />
                    </div>

                    {/* Hover Indicator */}
                    {hoveredTime !== null && (
                        <div
                            className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none"
                            style={{ left: `${(hoveredTime / duration) * 100}%` }}
                        >
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-white text-xs rounded whitespace-nowrap z-50">
                                {formatTime(hoveredTime)}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Audio Track Container */}
            {audioClips.length > 0 && (
                <div
                    className="relative h-12 bg-neutral-900/40 rounded-lg border border-white/5 overflow-hidden mt-1"
                    style={{ width: '100%' }}
                >
                    <div
                        className="absolute top-0 bottom-0"
                        style={{
                            left: -scrollLeft, // Match scrolling of video track? Or separate? 
                            // Currently timeline container handles scroll. This track needs to sync.
                            // Actually, separate container implies separate scroll if not careful.
                            // Better: Put this inside the same scrollable container?
                            // No, structure is: Toolbar -> Video Track (scrollable) -> Time Markers
                            // We should probably move the audio track inside the scrollable area or sync scroll.
                            // Given existing structure, let's put it BELOW the time markers but synchronized?
                            // Simpler: Put it INSIDE the scrollable `containerRef` div, below the video track.
                            width: `${zoomLevel * 100}%`
                        }}
                    >
                        {/* We can't put it inside containerRef because that one has fixed height h-24. 
                            We should refactor the layout to have a common scroll parent. 
                            For now, let's assume we render it separately and user has to scroll main track? 
                            Or we sync scroll. 
                         */}
                    </div>
                </div>
            )}

            {/* 
                Refactor: To support multi-track scrolling, we need a common scroll container.
                Let's change the structure quickly.
                Outer: Toolbar
                ScrollContainer (overflow-x)
                  - TimeGrid (absolute)
                  - VideoTrack (relative, h-24)
                  - AudioTrack (relative, h-12, mt-1)
            */}

            {/* Re-implementing structure for multi-track support */}

            {/* ... Wait, editing the whole structure is risky with replace_file_content chunking.
                Let's try to inject the audio track INSIDE the existing containerRef div, 
                and just increase the height of containerRef or allow it to grow?
                The container has `h-24` class. We should change that to `h-auto` or `min-h-[6rem]`.
            */}

            {/* Time Markers */}
            <div className="flex justify-between text-xs opacity-60 font-mono px-1">
                <span>00:00</span>
                <span>{formatTime(duration)}</span>
            </div>

            {/* Event Legend */}
            <div className="flex gap-3 text-xs flex-wrap">
                {Object.entries(eventColors).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: color }}
                        />
                        <span className="capitalize opacity-70">{type}</span>
                    </div>
                ))}
                <span className="opacity-50 ml-auto italic text-[10px]">
                    Alt+Click to pan • Ctrl+Scroll to zoom
                </span>
            </div>
        </div>
    );
};
