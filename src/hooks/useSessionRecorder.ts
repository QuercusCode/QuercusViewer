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

    // Optimization Refs
    const playbackCursorRef = useRef<number>(0);
    const accumulatedStateRef = useRef<any>(null);
    const lastAppliedTimeRef = useRef<number>(-1);

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

        let state = accumulatedStateRef.current;
        let camera = null;
        let cursor = playbackCursorRef.current;

        // If backward seek or uninitialized, reset to Initial State
        if (time < lastAppliedTimeRef.current || !state) {
            state = { ...session.initialState };
            cursor = 0;
        }

        // Forward Scan from Cursor
        for (let i = cursor; i < session.events.length; i++) {
            const event = session.events[i];
            if (event.timestamp > time) break;

            // Apply Event
            if (event.type === 'state') {
                state = { ...state, ...event.payload };
            } else if (event.type === 'camera') {
                camera = event.payload;
            }

            cursor = i + 1; // Advance cursor past this event
        }

        // Update Cache
        accumulatedStateRef.current = state;
        playbackCursorRef.current = cursor;
        lastAppliedTimeRef.current = time;

        // Apply to UI
        if (onPlaybackStateChange) onPlaybackStateChange(state);
        // Only trigger camera update if we actually found a NEW camera event in this window?
        // Or if we sought backwards?
        // Actually, logic above only sets 'camera' if we encountered an event.
        // If we replay a segment with NO camera events, 'camera' is null.
        // But we want to keep the camera where it was? Or interpolate?
        // If 'camera' is null here, it means no *new* camera event happened in this specific step from cursor->time.
        // BUT if we sought backwards, we reset state... but we lost the 'last known camera'.

        // CORRECT LOGIC FOR SEEKING:
        // If we sought backward, we must scan from 0 to time to find the LAST camera event.
        // The loop above DOES scan from 0 if reset.
        // So 'camera' will be the last camera event encountered.
        // If NO camera event ever happened up to 'time', 'camera' remains null. 
        // In that case, we should probably set it to initial camera (if captured?) or leave it.

        if (onPlaybackCameraChange && camera) {
            onPlaybackCameraChange(camera);
        }

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
