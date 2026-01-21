import { useState, useRef } from 'react';
import type { RecordedSession } from '../types';

interface VideoTimelineProps {
    session: RecordedSession | null;
    playbackTime: number;
    isPlaying: boolean;
    onSeek: (time: number) => void;
    isLightMode?: boolean;
}

export const VideoTimeline = ({
    session,
    playbackTime,
    onSeek
}: VideoTimelineProps) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [hoveredTime, setHoveredTime] = useState<number | null>(null);

    const duration = session?.metadata.duration || 1000;

    // Event type colors (InShot-inspired)
    const eventColors = {
        camera: '#00b4d8',
        state: '#00c853',
        annotation: '#ffd60a',
        chat: '#9d4edd'
    };

    // Convert pixel position to time
    const xToTime = (x: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const relativeX = Math.max(0, Math.min(x - rect.left, rect.width));
        return (relativeX / rect.width) * duration;
    };

    const handleTimelineClick = (e: React.MouseEvent) => {
        const time = xToTime(e.clientX);
        onSeek(time);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const time = xToTime(e.clientX);
        setHoveredTime(time);
    };

    const handleMouseLeave = () => {
        setHoveredTime(null);
    };

    // Format time as MM:SS
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Group events into visual blocks
    const getEventBlocks = () => {
        if (!session) return [];

        const blocks: Array<{
            type: string;
            start: number;
            end: number;
            count: number;
        }> = [];

        // Group consecutive events of same type
        session.events.forEach((event, idx) => {
            const lastBlock = blocks[blocks.length - 1];
            const nextEvent = session.events[idx + 1];
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

        return blocks;
    };

    const eventBlocks = getEventBlocks();

    return (
        <div className="space-y-2">
            {/* Timeline Track */}
            <div
                ref={timelineRef}
                className="relative h-24 bg-black/40 rounded-lg border border-white/10 overflow-hidden cursor-pointer"
                onClick={handleTimelineClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Grid Lines */}
                {[...Array(10)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-white/5"
                        style={{ left: `${(i + 1) * 10}%` }}
                    />
                ))}

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

                {/* Playhead (Current Time Indicator) */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500"
                    style={{ left: `${(playbackTime / duration) * 100}%` }}
                >
                    <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full" />
                </div>

                {/* Hover Time Indicator */}
                {hoveredTime !== null && (
                    <div
                        className="absolute top-0 bottom-0 w-px bg-white/30"
                        style={{ left: `${(hoveredTime / duration) * 100}%` }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 text-white text-xs rounded whitespace-nowrap">
                            {formatTime(hoveredTime)}
                        </div>
                    </div>
                )}
            </div>

            {/* Time Markers */}
            <div className="flex justify-between text-xs opacity-60 font-mono px-1">
                <span>00:00</span>
                <span>{formatTime(duration / 2)}</span>
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
            </div>
        </div>
    );
};
