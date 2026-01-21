import { useState, useRef, useEffect } from 'react';
import type { RecordedSession, TimelineSegment } from '../types';

interface VideoTimelineProps {
    session: RecordedSession | null;
    segments?: TimelineSegment[]; // NLE Support
    onSegmentUpdate?: (id: string, updates: Partial<TimelineSegment>) => void;
    playbackTime: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    isLightMode?: boolean;

    // Trim mode
    trimMode?: boolean;
    trimStart?: number;
    trimEnd?: number;
    onTrimChange?: (start: number, end: number) => void;
}

export const VideoTimeline = ({
    session,
    segments = [],
    onSegmentUpdate,
    playbackTime,
    onSeek,
    trimMode = false,
    trimStart: externalTrimStart,
    trimEnd: externalTrimEnd,
    onTrimChange
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

    const handleTimelineMouseDown = (e: React.MouseEvent) => {
        if (trimMode) return; // Don't pan in trim mode to avoid conflict with handles
        if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left click to pan
            e.preventDefault();
            setIsPanning(true);
            setPanStartX(e.clientX);
            if (containerRef.current) {
                setPanStartScroll(containerRef.current.scrollLeft);
            }
        } else if (e.button === 0) {
            // Normal click to seek
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
    };

    const handleMouseLeave = () => {
        setHoveredTime(null);
        setIsPanning(false);
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Handle Zoom (Wheel)
    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY;
            setZoomLevel(prev => Math.max(1, Math.min(10, prev + delta * 0.001)));
        }
    };

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
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

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
                className="relative h-24 bg-black/40 rounded-lg border border-white/10 overflow-x-auto overflow-y-hidden cursor-pointer select-none"
                onMouseDown={handleTimelineMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
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
                        const left = (seg.startTime / duration) * 100;
                        const width = (seg.duration / duration) * 100;

                        return (
                            <div
                                key={seg.id}
                                className="absolute top-1 bottom-1 border-x border-white/20 bg-white/10 hover:bg-white/20 cursor-grab active:cursor-grabbing group transition-colors"
                                style={{
                                    left: `${left}%`,
                                    width: `${width}%`
                                }}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const startX = e.clientX;
                                    const originalStartTime = seg.startTime;

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        if (!timelineRef.current) return;
                                        const rect = timelineRef.current.getBoundingClientRect();
                                        const deltaX = moveEvent.clientX - startX;
                                        const deltaTime = (deltaX / rect.width) * duration;

                                        const newStartTime = Math.max(0, originalStartTime + deltaTime);

                                        if (onSegmentUpdate) {
                                            onSegmentUpdate(seg.id, { startTime: newStartTime });
                                        }
                                    };

                                    const handleMouseUp = () => {
                                        window.removeEventListener('mousemove', handleMouseMove);
                                        window.removeEventListener('mouseup', handleMouseUp);
                                        // Snap to grid or neighbors logic could go here
                                    };

                                    window.addEventListener('mousemove', handleMouseMove);
                                    window.addEventListener('mouseup', handleMouseUp);
                                }}
                                title={`Segment: ${formatTime(seg.startTime)} - ${formatTime(seg.startTime + seg.duration)}`}
                            >
                                {/* Drag Handle Indicator */}
                                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-white/20 group-hover:bg-white/40" />
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
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40 hover:w-1.5 transition-all"
                                style={{ left: `${(trimStart / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('start')}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-12 bg-blue-500 rounded-sm flex items-center justify-center scale-x-100 origin-center sticky left-0">
                                    <div className="w-0.5 h-6 bg-white/50" />
                                </div>
                            </div>
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize z-40 hover:w-1.5 transition-all"
                                style={{ left: `${(trimEnd / duration) * 100}%` }}
                                onMouseDown={handleHandleMouseDown('end')}
                            >
                                <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-12 bg-blue-500 rounded-sm flex items-center justify-center scale-x-100 origin-center sticky left-0">
                                    <div className="w-0.5 h-6 bg-white/50" />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30"
                        style={{ left: `${(playbackTime / duration) * 100}%` }}
                    >
                        <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full sticky left-0" />
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
