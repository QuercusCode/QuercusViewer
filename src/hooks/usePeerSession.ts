import { useEffect, useState, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection, MediaConnection } from 'peerjs';

import type { ChatMessage, CustomTransparencyRule } from '../types';

export interface SessionState {
    // Single View Props (Legacy/Fallback)
    pdbId?: string;
    representation?: string;
    coloring?: string;
    customColors?: any[];
    customTransparency?: CustomTransparencyRule[];
    measurements?: any[];
    customBackgroundColor?: string | null;
    orientation?: any[];
    isSpinning?: boolean;
    highlightedResidue?: any;
    hoveredResidue?: any;
    controllerId?: string | null;
    annotations?: any[];

    // Multi-View Props
    viewMode?: 'single' | 'dual' | 'triple' | 'quad';
    viewports?: Partial<SessionState>[]; // Recursive definition for per-viewport state
}

export interface PeerSession {
    peerId: string | null;
    isConnected: boolean;
    isHost: boolean;
    connections: DataConnection[];
    connectToPeer: (remotePeerId: string) => void;
    broadcastState: (state: Partial<SessionState>) => void;
    broadcastCamera: (orientation: any[]) => void;
    broadcastName: (name: string) => void;
    grantControl: (targetPeerId: string | null) => void; // Host only
    lastReceivedState: Partial<SessionState> | null;
    lastReceivedCamera: any[] | null;
    lastReceivedName: string | null;
    peerNames: Record<string, string>; // Map of Peer ID -> Name
    error: string | null;
    disconnect: () => void;
    broadcastReaction: (emoji: string, senderName?: string) => void;
    lastReaction: { emoji: string; senderId: string; senderName?: string; timestamp: number } | null;
    // Audio
    joinAudio: () => Promise<void>;
    leaveAudio: () => void;
    toggleMute: () => void;
    isAudioConnected: boolean;
    isMuted: boolean;
    remoteStreams: Map<string, MediaStream>;
    // File Sharing
    broadcastFile: (file: File) => void;
    lastReceivedFile: { name: string; data: ArrayBuffer } | null;
    // Chat
    broadcastChat: (message: ChatMessage) => void;
    lastReceivedChat: ChatMessage | null;
}

export const usePeerSession = (initialState?: Partial<SessionState>): PeerSession => {
    const [peerId, setPeerId] = useState<string | null>(null);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [isHost, setIsHost] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [lastReceivedState, setLastReceivedState] = useState<Partial<SessionState> | null>(null);
    const [lastReceivedCamera, setLastReceivedCamera] = useState<any[] | null>(null);
    const [lastReceivedName, setLastReceivedName] = useState<string | null>(null);
    const [lastReaction, setLastReaction] = useState<{ emoji: string; senderId: string; senderName?: string; timestamp: number } | null>(null);
    const [peerNames, setPeerNames] = useState<Record<string, string>>({});
    const [lastReceivedFile, setLastReceivedFile] = useState<{ name: string; data: ArrayBuffer } | null>(null);
    const [lastReceivedChat, setLastReceivedChat] = useState<ChatMessage | null>(null);


    // Audio State
    const [myStream, setMyStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [incomingCalls, setIncomingCalls] = useState<MediaConnection[]>([]);

    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const mediaConnectionsRef = useRef<MediaConnection[]>([]); // Keep specific track of calls

    // Initialize Peer
    useEffect(() => {
        const peer = new Peer();

        peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
            setPeerId(id);
            setError(null);
        });

        peer.on('connection', (conn) => {
            console.log('Incoming connection from:', conn.peer);
            setupConnection(conn);
            setIsHost(true); // If someone connects to me, I'm effectively a host (or just a peer)
        });

        // Handle Incoming Calls (Voice)
        peer.on('call', (call) => {
            console.log('Incoming call from:', call.peer);
            setIncomingCalls(prev => [...prev, call]);

            // Auto-answer if we are already in audio mode
            // (Note: we need to access the current myStream value. State in callbacks handles is tricky)
            // But since 'call' listener is established once at mount, we might need a ref for myStream
            // Or easier: If user has 'joined audio', they answer.
            // We'll handle this in a separate useEffect that watches incomingCalls.
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            setError(err.type === 'peer-unavailable' ? 'Peer not found' : 'Connection error');
        });

        peerRef.current = peer;

        return () => {
            peer.destroy();
        };
    }, []);

    const setupConnection = (conn: DataConnection) => {
        conn.on('open', () => {
            console.log('Connected to:', conn.peer);

            // Check for duplicate connection
            const exists = connectionsRef.current.some(c => c.peer === conn.peer);
            if (!exists) {
                connectionsRef.current = [...connectionsRef.current, conn];
                setConnections([...connectionsRef.current]);
            } else {
                console.warn('Duplicate connection ignored:', conn.peer);
            }

            // If I have initial state, send it to the new peer
            if (initialState) {
                conn.send({ type: 'SYNC_STATE', payload: initialState });
            }
        });

        conn.on('data', (data: any) => {
            handleData(data, conn);
        });

        conn.on('close', () => {
            // Remove connection
            connectionsRef.current = connectionsRef.current.filter(c => c.peer !== conn.peer);
            setConnections([...connectionsRef.current]);
        });
    };

    const handleData = (data: any, sender: DataConnection) => {
        if (data.type === 'SYNC_STATE') {
            setLastReceivedState(data.payload);
        } else if (data.type === 'SYNC_CAMERA') {
            setLastReceivedCamera(data.payload);
        } else if (data.type === 'SYNC_NAME') {
            setLastReceivedName(data.payload);
            setPeerNames(prev => ({
                ...prev,
                [sender.peer]: data.payload
            }));
        } else if (data.type === 'REACTION') {
            const reactionSenderName = data.payload.senderName || peerNames[sender.peer] || 'Guest';
            setLastReaction({
                emoji: data.payload.emoji,
                senderId: sender.peer,
                senderName: reactionSenderName,
                timestamp: Date.now()
            });

            if (isHost) {
                connectionsRef.current.forEach(conn => {
                    if (conn.open && conn.peer !== sender.peer) {
                        conn.send({
                            type: 'REACTION',
                            payload: {
                                emoji: data.payload.emoji,
                                senderName: reactionSenderName
                            }
                        });
                    }
                });
            }
        } else if (data.type === 'SYNC_FILE') {
            console.log('Received file:', data.payload.name);
            setLastReceivedFile(data.payload);

            if (isHost) {
                connectionsRef.current.forEach(conn => {
                    if (conn.open && conn.peer !== sender.peer) {
                        conn.send({
                            type: 'SYNC_FILE',
                            payload: data.payload
                        });
                    }
                });
            }
        } else if (data.type === 'SYNC_CHAT') {
            setLastReceivedChat(data.message); // Changed from data.payload to data.message

            if (isHost) {
                connectionsRef.current.forEach(conn => {
                    if (conn.open && conn.peer !== sender.peer) {
                        conn.send({ type: 'SYNC_CHAT', message: data.message }); // Changed from data.payload to data.message
                    }
                });
            }
        }
    };

    const broadcastFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target?.result as ArrayBuffer;
            if (buffer) {
                const payload = {
                    name: file.name,
                    data: buffer
                };

                connectionsRef.current.forEach(conn => {
                    if (conn.open) {
                        conn.send({ type: 'SYNC_FILE', payload });
                    }
                });
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const connectToPeer = useCallback((remotePeerId: string) => {
        if (!peerRef.current) return;
        sessionStorage.setItem('QUERCUS_LAST_HOST_ID', remotePeerId);
        const conn = peerRef.current.connect(remotePeerId);
        setupConnection(conn);
        setIsHost(false);
    }, []);

    const disconnect = useCallback(() => {
        sessionStorage.removeItem('QUERCUS_LAST_HOST_ID');
        connectionsRef.current.forEach(conn => conn.close());
        setConnections([]);
        setLastReceivedState(null);
        setLastReceivedCamera(null);
    }, []);

    useEffect(() => {
        if (peerId && !connections.length && !isHost) {
            const lastHostId = sessionStorage.getItem('QUERCUS_LAST_HOST_ID');
            const urlParams = new URLSearchParams(window.location.search);
            const isJoiningFromUrl = urlParams.has('join');
            if (lastHostId && !isJoiningFromUrl) {
                console.log('Smart Reconnect: Restoring session with host', lastHostId);
                connectToPeer(lastHostId);
            }
        }
    }, [peerId, connections.length, isHost, connectToPeer]);

    // Audio Logic
    useEffect(() => {
        if (!myStream) return;
        incomingCalls.forEach(call => {
            console.log('Answering incoming call from', call.peer);
            call.answer(myStream);
            handleCall(call);
        });
        setIncomingCalls([]);
    }, [myStream, incomingCalls]);

    const handleCall = (call: MediaConnection) => {
        call.on('stream', (remoteStream) => {
            console.log('Received remote stream from', call.peer);
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.set(call.peer, remoteStream);
                return newMap;
            });
        });
        call.on('close', () => {
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                newMap.delete(call.peer);
                return newMap;
            });
        });
        call.on('error', (err) => console.error('Call error:', err));
        mediaConnectionsRef.current.push(call);
    };

    const joinAudio = useCallback(async () => {
        if (myStream) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setMyStream(stream);
            connectionsRef.current.forEach(dataConn => {
                if (peerRef.current) {
                    console.log('Calling peer:', dataConn.peer);
                    const call = peerRef.current.call(dataConn.peer, stream);
                    handleCall(call);
                }
            });
        } catch (err) {
            console.error('Failed to join audio:', err);
            setError('Microphone access denied');
        }
    }, [myStream, peerNames]);

    const leaveAudio = useCallback(() => {
        if (myStream) {
            myStream.getTracks().forEach(track => track.stop());
            setMyStream(null);
        }
        mediaConnectionsRef.current.forEach(call => call.close());
        mediaConnectionsRef.current = [];
        setRemoteStreams(new Map());
    }, [myStream]);

    const toggleMute = useCallback(() => {
        if (myStream) {
            const audioTrack = myStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    }, [myStream]);

    useEffect(() => {
        return () => {
            if (myStream) {
                myStream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const broadcastState = useCallback((state: Partial<SessionState>) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) {
                conn.send({ type: 'SYNC_STATE', payload: state });
            }
        });
    }, []);

    const lastBroadcastTime = useRef(0);
    const broadcastCamera = useCallback((orientation: any[]) => {
        const now = Date.now();
        if (now - lastBroadcastTime.current > 50) {
            connectionsRef.current.forEach(conn => {
                if (conn.open) {
                    conn.send({ type: 'SYNC_CAMERA', payload: orientation });
                }
            });
            lastBroadcastTime.current = now;
        }
    }, []);

    const broadcastName = useCallback((name: string) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) {
                conn.send({ type: 'SYNC_NAME', payload: name });
            }
        });
    }, []);

    const broadcastReaction = useCallback((emoji: string, senderName?: string) => {
        if (peerId) {
            setLastReaction({ emoji, senderId: peerId, senderName: senderName || 'You', timestamp: Date.now() });
        }
        connectionsRef.current.forEach(conn => {
            if (conn.open) {
                conn.send({ type: 'REACTION', payload: { emoji, senderName } });
            }
        });
    }, [peerId]);

    const broadcastChat = useCallback((message: ChatMessage) => {
        // Optimistic update? Actually caller should handle optimistic add to list.
        // We just send.
        connectionsRef.current.forEach(conn => {
            if (conn.open) {
                conn.send({ type: 'SYNC_CHAT', message: message }); // Changed payload to message
            }
        });
    }, []);

    const grantControl = useCallback((targetPeerId: string | null) => {
        // Only Host controls this
        if (!isHost) return;

        // Broadcast the new controller ID to everyone
        // If targetPeerId is null, it means Host is taking back control
        broadcastState({ controllerId: targetPeerId });
    }, [isHost, broadcastState]);



    return {
        peerId,
        isConnected: connections.length > 0,
        isHost,
        connections,
        connectToPeer,
        broadcastState,
        broadcastCamera,
        broadcastName,
        grantControl,
        lastReceivedState,
        lastReceivedCamera,
        lastReceivedName,
        peerNames,
        error,
        disconnect,
        broadcastReaction,
        lastReaction,
        joinAudio,
        leaveAudio,
        toggleMute,
        isAudioConnected: !!myStream,
        isMuted,
        remoteStreams,
        broadcastFile,
        lastReceivedFile,
        broadcastChat,
        lastReceivedChat
    };
};
