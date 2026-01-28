import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordedSession, RecordedEvent, TimelineSegment, AudioClip } from '../types';

interface UseSessionRecorderProps {
    onPlaybackStateChange?: (state: any) => void;
    onPlaybackCameraChange?: (orientation: any) => void;
}

export const useSessionRecorder = ({ onPlaybackStateChange, onPlaybackCameraChange }: UseSessionRecorderProps = {}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [session, setSession] = useState<RecordedSession | null>(null);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [masterVolume, setMasterVolume] = useState(1.0);

    // --- State & Refs (Restored) ---
    const eventsRef = useRef<RecordedEvent[]>([]);
    const initialStateRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);

    // Playback Optimization Refs
    const playbackCursorRef = useRef<number>(0);
    const accumulatedStateRef = useRef<any>(null);
    const lastAppliedTimeRef = useRef<number>(-1);
    const lastPlaybackUpdateRef = useRef<number>(0);

    // Timeline Segments
    const [segments, setSegments] = useState<TimelineSegment[]>([]);
    // Audio Playback
    // We need a pool of players or a single smart player?
    // For MVP: Single Music Track => Single Audio Element.
    // We dynamically change src or currentTime based on active clip.
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioStateRef = useRef<{ currentClipId: string | null }>({ currentClipId: null });

    // --- Audio Synchronization ---
    const syncAudio = useCallback((time: number, forcePlay = false) => {
        if (!session?.metadata?.audioClips || !session.metadata.audioTrack) {
            if (audioRef.current) audioRef.current.pause();
            return;
        }

        const clips = session.metadata.audioClips;
        const activeClip = clips.find(c => time >= c.startTime && time < c.startTime + c.duration);

        if (!activeClip) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioStateRef.current.currentClipId = null;
            }
            return;
        }

        // We have an active clip
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        // Prioritize clip data, fallback to global track
        const trackData = activeClip.data || session.metadata.audioTrack?.data;

        if (!trackData) return;

        // Check if we need to load src
        // Note: In real app, we'd map clip.trackId to actual media. 
        // Here we assume all music clips use the single audioTrack for now (Music Layer).
        if (audio.src !== trackData) {
            audio.src = trackData;
            audio.volume = masterVolume;
        }

        // Calculate Time
        const offsetInClip = time - activeClip.startTime;
        const targetSourceTime = (activeClip.sourceStartTime + offsetInClip) / 1000;

        // Sync if drifted or just entered
        // Allow small drift (0.1s)
        if (Math.abs(audio.currentTime - targetSourceTime) > 0.15 || audio.paused) {
            audio.currentTime = targetSourceTime;
            if (forcePlay || isPlaying) {
                audio.play().catch(() => { });
            }
        }

        audioStateRef.current.currentClipId = activeClip.id;

    }, [session, masterVolume, isPlaying]);

    // Effect: Sync volume
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = masterVolume;
    }, [masterVolume]);

    // Effect: Stop if component unmounts
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);


    // --- Recording ---

    const startRecording = useCallback((initialState: any) => {
        setIsRecording(true);
        setSession(null);
        eventsRef.current = [];
        initialStateRef.current = JSON.parse(JSON.stringify(initialState));
        startTimeRef.current = Date.now();
        setRecordingTime(0);

        // Start timer for UI
        const tick = () => {
            setRecordingTime(Date.now() - startTimeRef.current);
            animationFrameRef.current = requestAnimationFrame(tick);
        };
        animationFrameRef.current = requestAnimationFrame(tick);
    }, []);

    const stopRecording = useCallback(() => {
        setIsRecording(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const duration = Date.now() - startTimeRef.current;
        const newSession: RecordedSession = {
            id: crypto.randomUUID(),
            version: 1,
            metadata: {
                title: `Recording ${new Date().toLocaleTimeString()}`,
                author: 'User', // Could be passed in
                date: new Date().toISOString(),
                duration
            },
            initialState: initialStateRef.current,
            events: eventsRef.current
        };
        setSession(newSession);

        // NLE: Initialize with one full segment
        setSegments([{
            id: crypto.randomUUID(),
            sessionId: newSession.id,
            startTime: 0,
            duration: newSession.metadata.duration,
            sourceStartTime: 0
        }]);

        setPlaybackTime(0); // Reset playback cursor

        // Reset optimization refs
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, []);

    const recordEvent = useCallback((type: 'state' | 'camera' | 'annotation' | 'chat', payload: any) => {
        if (!isRecording) return;

        const timestamp = Date.now() - startTimeRef.current;
        // Optimization: Deduplicate identical sequential events if needed
        // For now, raw capture
        eventsRef.current.push({
            timestamp,
            type,
            payload: JSON.parse(JSON.stringify(payload)) // Deep copy safety
        });
    }, [isRecording]);

    // --- Playback Helper ---

    const applyFrameAt = useCallback((globalTime: number) => {
        if (!session || !onPlaybackStateChange || !onPlaybackCameraChange) return;

        // Find which segment covers this global time
        const activeSegment = segments.find(
            s => globalTime >= s.startTime && globalTime < s.startTime + s.duration
        );

        if (!activeSegment) {
            return;
        }

        // Calculate time within the source recording
        const timeInSegment = globalTime - activeSegment.startTime;
        const sourceTime = activeSegment.sourceStartTime + timeInSegment;

        // Rebuild state from scratch for now to ensure correctness across jumps
        let currentState = JSON.parse(JSON.stringify(session.initialState));
        let currentCamera = null;

        // Find events in source up to sourceTime
        for (const event of session.events) {
            if (event.timestamp <= sourceTime) {
                if (event.type === 'state') {
                    Object.assign(currentState, event.payload);
                } else if (event.type === 'camera') {
                    currentCamera = event.payload;
                }
            } else {
                break; // Events are sorted
            }
        }

        onPlaybackStateChange(currentState);
        if (currentCamera && onPlaybackCameraChange) {
            onPlaybackCameraChange(currentCamera);
        }

        lastAppliedTimeRef.current = globalTime;
    }, [session, segments, onPlaybackStateChange, onPlaybackCameraChange]);

    // --- Playback Controls ---

    const play = useCallback(() => {
        if (!session) return;
        setIsPlaying(true);
        lastPlaybackUpdateRef.current = Date.now();

        // Sync Audio
        syncAudio(playbackTime, true);
    }, [session, playbackTime, syncAudio]);

    const pause = useCallback(() => {
        setIsPlaying(false);
        // Sync Audio
        if (audioRef.current) {
            audioRef.current.pause();
        }
    }, []);

    const seek = useCallback((time: number) => {
        if (!session) return;
        setPlaybackTime(time);
        applyFrameAt(time);
        syncAudio(time, isPlaying);
    }, [session, isPlaying, applyFrameAt, syncAudio]);


    // Playback Loop
    useEffect(() => {
        if (isPlaying && session) {
            const tick = () => {
                const now = Date.now();
                const delta = now - lastPlaybackUpdateRef.current;
                lastPlaybackUpdateRef.current = now;

                setPlaybackTime(prev => {
                    const nextTime = prev + (delta * playbackSpeed);

                    if (nextTime >= session.metadata.duration) {
                        setIsPlaying(false);
                        return session.metadata.duration;
                    }

                    applyFrameAt(nextTime);
                    syncAudio(nextTime); // Continuous sync
                    return nextTime;
                });

                animationFrameRef.current = requestAnimationFrame(tick);
            };

            lastPlaybackUpdateRef.current = Date.now();
            animationFrameRef.current = requestAnimationFrame(tick);

            return () => {
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            };
        }
    }, [isPlaying, session, playbackSpeed, applyFrameAt]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    // Auto-apply initial frame when session is loaded or finished recording
    useEffect(() => {
        if (session && !isRecording && !isPlaying) {
            // Small timeout to ensure state has settled and UI is ready
            setTimeout(() => applyFrameAt(0), 50);
        }
    }, [session, isRecording]);

    // Export/Import
    const exportSession = useCallback(() => {
        if (!session) return;
        const blob = new Blob([JSON.stringify(session)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.metadata.title.replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [session]);

    const importSession = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                // Basic validation
                if (data.events && data.metadata) {
                    setSession(data);
                    setSession(data);
                    setPlaybackTime(0);
                    // Reset cache
                    playbackCursorRef.current = 0;
                    accumulatedStateRef.current = null;
                    lastAppliedTimeRef.current = -1;
                    setIsPlaying(false);
                }
            } catch (err) {
                console.error("Failed to parse session", err);
            }
        };
        reader.readAsText(file);
    }, []);

    const updateMetadata = useCallback((updates: Partial<RecordedSession['metadata']>) => {
        setSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                metadata: {
                    ...prev.metadata,
                    ...updates
                }
            };
        });
    }, []);

    // --- Undo/Redo/History ---

    // History State
    const [past, setPast] = useState<{ session: RecordedSession; segments: TimelineSegment[] }[]>([]);
    const [future, setFuture] = useState<{ session: RecordedSession; segments: TimelineSegment[] }[]>([]);

    const pushHistory = useCallback(() => {
        if (!session) return;
        setPast(prev => [...prev, {
            session: JSON.parse(JSON.stringify(session)),
            segments: JSON.parse(JSON.stringify(segments))
        }]);
        setFuture([]); // Clear future on new action
    }, [session, segments]);

    const undo = useCallback(() => {
        if (past.length === 0 || !session) return;

        const previousState = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);

        // Save current to future
        setFuture(prev => [{
            session: JSON.parse(JSON.stringify(session)),
            segments: JSON.parse(JSON.stringify(segments))
        }, ...prev]);

        // Restore past
        setSession(previousState.session);
        setSegments(previousState.segments);
        setPast(newPast);

        // Reset specific UI states?
        // Maybe playback time to start?
    }, [past, session, segments]);

    const redo = useCallback(() => {
        if (future.length === 0 || !session) return;

        const nextState = future[0];
        const newFuture = future.slice(1);

        // Save current to past
        setPast(prev => [...prev, {
            session: JSON.parse(JSON.stringify(session)),
            segments: JSON.parse(JSON.stringify(segments))
        }]);

        // Restore future
        setSession(nextState.session);
        setSegments(nextState.segments);
        setFuture(newFuture);
    }, [future, session, segments]);

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    // Post-Processing Functions (Wrapped with History)

    const trimSession = useCallback((startTime: number, endTime: number) => {
        pushHistory();
        setSession(prev => {
            if (!prev) return null;
            // Filter events within time range
            const trimmedEvents = prev.events
                .filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
                .map(e => ({
                    ...e,
                    timestamp: e.timestamp - startTime // Adjust timestamps
                }));

            return {
                ...prev,
                events: trimmedEvents,
                metadata: {
                    ...prev.metadata,
                    duration: endTime - startTime
                }
            };
        });

        // Reset playback
        setPlaybackTime(0);
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, [pushHistory]);

    const deleteEvent = useCallback((index: number) => {
        pushHistory();
        setSession(prev => {
            if (!prev || index < 0 || index >= prev.events.length) return prev;
            const newEvents = [...prev.events];
            newEvents.splice(index, 1);
            return {
                ...prev,
                events: newEvents
            };
        });
        // Reset playback
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, [pushHistory]);

    const deleteEventsByType = useCallback((type: string, fromTime?: number, toTime?: number) => {
        pushHistory();
        setSession(prev => {
            if (!prev) return null;
            const filteredEvents = prev.events.filter(e => {
                if (e.type !== type) return true;
                if (fromTime !== undefined && e.timestamp < fromTime) return true;
                if (toTime !== undefined && e.timestamp > toTime) return true;
                return false;
            });
            return {
                ...prev,
                events: filteredEvents
            };
        });
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, [pushHistory]);

    const deleteEventsByTimeRange = useCallback((fromTime: number, toTime: number) => {
        pushHistory();
        setSession(prev => {
            if (!prev) return null;
            const filteredEvents = prev.events.filter(e =>
                e.timestamp < fromTime || e.timestamp > toTime
            );
            return {
                ...prev,
                events: filteredEvents
            };
        });
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, [pushHistory]);

    // NLE: Split the current segment at playbackTime
    const splitSession = useCallback((splitTime: number) => {
        if (!session) return null;
        // Don't push history here yet, we need to check if split is valid first?
        // Actually, we can just push history inside the setter callback only if it changes?
        // React state setters don't support side effects easily. 
        // We should move logic out of setter or push history optimistically?
        // Let's modify logic to calculate first.

        setSegments(prevSegments => {
            const newSegments = [...prevSegments];
            const segmentIndex = newSegments.findIndex(
                s => splitTime >= s.startTime && splitTime < s.startTime + s.duration
            );

            if (segmentIndex === -1) return prevSegments;

            const originalSegment = newSegments[segmentIndex];
            const splitOffset = splitTime - originalSegment.startTime;

            // Enforce minimum segment length (e.g., 500ms)
            if (splitOffset < 500 || (originalSegment.duration - splitOffset) < 500) {
                return prevSegments;
            }

            // Valid split

            // Create two new segments
            const segment1: TimelineSegment = {
                ...originalSegment,
                id: crypto.randomUUID(),
                duration: splitOffset
            };

            const segment2: TimelineSegment = {
                ...originalSegment,
                id: crypto.randomUUID(),
                startTime: originalSegment.startTime + splitOffset,
                sourceStartTime: originalSegment.sourceStartTime + splitOffset,
                duration: originalSegment.duration - splitOffset
            };

            // Replace original with new pieces
            newSegments.splice(segmentIndex, 1, segment1, segment2);
            return newSegments;
        });

        // Hacky: We pushed history even if split failed? No, we need to verify.
        // Since we are inside `setSegments` we can't easily push history conditionally *before* the setter completes.
        // Let's refactor:
        // We will call pushHistory() *before* calling setSegments, assuming the split will succeed?
        // Or we can rely on `didSplit` flag? But it's local.
        // Better: Duplicate logic outside setter to check validity.

        // REFACTOR: 
        // We simply push history blindly. If split fails (no change), it's a no-op state change in history. 
        // That's acceptable for MVP.
        pushHistory();

        return null;
    }, [session, pushHistory]);

    const adjustSessionSpeed = useCallback((startTime: number, endTime: number, speedFactor: number) => {
        if (!session || speedFactor <= 0 || startTime >= endTime) return;
        pushHistory();

        const start = Math.max(0, startTime);
        const end = Math.min(session.metadata.duration, endTime);
        const originalSectionDuration = end - start;
        const newSectionDuration = originalSectionDuration / speedFactor;
        const shiftAmount = newSectionDuration - originalSectionDuration;

        const newEvents = session.events.map(event => {
            if (event.timestamp < start) {
                return event;
            } else if (event.timestamp <= end) {
                const offset = event.timestamp - start;
                return {
                    ...event,
                    timestamp: start + (offset / speedFactor)
                };
            } else {
                return {
                    ...event,
                    timestamp: event.timestamp + shiftAmount
                };
            }
        });

        const newSession: RecordedSession = {
            ...session,
            metadata: {
                ...session.metadata,
                duration: session.metadata.duration + shiftAmount
            },
            events: newEvents
        };

        setSession(newSession);

        setPlaybackTime(start);
        playbackCursorRef.current = 0;
        accumulatedStateRef.current = null;
        lastAppliedTimeRef.current = -1;
    }, [session, pushHistory]);

    // Selection State
    const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);

    const updateSegment = useCallback((segmentId: string, updates: Partial<TimelineSegment>) => {
        pushHistory();
        setSegments(prev => prev.map(s =>
            s.id === segmentId ? { ...s, ...updates } : s
        ));
    }, [pushHistory]);

    const deleteSelectedSegments = useCallback(() => {
        pushHistory();
        setSegments(prev => prev.filter(s => !selectedSegmentIds.includes(s.id)));
        setSelectedSegmentIds([]);
    }, [selectedSegmentIds, pushHistory]);

    const toggleSegmentSelection = useCallback((segmentId: string, multiSelect: boolean) => {
        // Selection doesn't need history? Maybe? 
        // Usually selection changes are not undone. (Standard UX)
        setSelectedSegmentIds(prev => {
            if (multiSelect) {
                return prev.includes(segmentId)
                    ? prev.filter(id => id !== segmentId)
                    : [...prev, segmentId];
            }
            return prev.includes(segmentId) && prev.length === 1 ? [] : [segmentId];
        });
    }, []);

    const updateAudioClip = useCallback((clipId: string, updates: Partial<AudioClip>) => {
        if (!session) return;
        pushHistory();

        updateMetadata({
            audioClips: session.metadata.audioClips?.map(c =>
                c.id === clipId ? { ...c, ...updates } : c
            )
        });
    }, [session, pushHistory, updateMetadata]);

    return {
        isRecording,
        isPlaying,
        recordingTime,
        playbackTime,
        session,
        playbackSpeed,
        setPlaybackSpeed,
        startRecording,
        stopRecording,
        recordEvent,
        play,
        pause,
        seek,
        exportSession,
        importSession,
        updateMetadata,
        trimSession,
        deleteEvent,
        deleteEventsByType,
        deleteEventsByTimeRange,
        splitSession,
        adjustSessionSpeed,
        segments,
        setSegments,

        // Selection
        selectedSegmentIds, // Fix: Expose selection state
        toggleSegmentSelection,
        deleteSelectedSegments,
        updateSegment,

        // Audio
        masterVolume,
        setMasterVolume,
        updateAudioClip,

        // History
        undo,
        redo,
        canUndo,
        canRedo
    };
};
