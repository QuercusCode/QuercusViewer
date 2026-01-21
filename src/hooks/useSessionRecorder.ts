import { useState, useRef, useCallback, useEffect } from 'react';
import type { RecordedSession, RecordedEvent } from '../types';

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

    const startTimeRef = useRef<number>(0);
    const eventsRef = useRef<RecordedEvent[]>([]);
    const initialStateRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastPlaybackUpdateRef = useRef<number>(0);

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
        setPlaybackTime(0); // Reset playback cursor
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

    // --- Playback ---

    const play = useCallback(() => {
        if (!session) return;
        setIsPlaying(true);
        lastPlaybackUpdateRef.current = Date.now();
    }, [session]);

    const pause = useCallback(() => {
        setIsPlaying(false);
    }, []);

    const seek = useCallback((time: number) => {
        if (!session) return;
        setPlaybackTime(time);
        applyFrameAt(time);
    }, [session]);

    const applyFrameAt = useCallback((time: number) => {
        if (!session) return;

        // 1. Reconstruct state up to 'time'
        // This is "Event Sourcing". We start from initial state and replay all events <= time.
        // Optimization: For long sessions, we'd want Keyframes.
        // For MVP, we iterate.

        // Actually, we can just find the *last* event of each type that happened before 'time'.
        // Because our events are "Full State Snapshots" (from broadcastState), not diffs.
        // broadcastState sends { pdbId: ... }, sending the whole object?
        // No, broadcastState sends Partial<SessionState>.
        // So we DO need to accumulate state.

        let currentState = { ...session.initialState };
        let lastCamera = null;

        // Iterate all events up to current time
        // Optimization needed for long sessions: binary search to find index, then iterate? 
        // Or just lazy iteration if we assume linear playback. But 'seek' jumps.

        for (const event of session.events) {
            if (event.timestamp > time) break;

            if (event.type === 'state') {
                currentState = { ...currentState, ...event.payload };
            } else if (event.type === 'camera') {
                lastCamera = event.payload;
            }
        }

        if (onPlaybackStateChange) onPlaybackStateChange(currentState);
        if (onPlaybackCameraChange && lastCamera) onPlaybackCameraChange(lastCamera);

    }, [session, onPlaybackStateChange, onPlaybackCameraChange]);

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
                    setPlaybackTime(0);
                    setIsPlaying(false);
                }
            } catch (err) {
                console.error("Failed to parse session", err);
            }
        };
        reader.readAsText(file);
    }, []);

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
        importSession
    };
};
