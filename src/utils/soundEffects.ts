/**
 * Sound Effects Generator and Manager
 * Generates simple sound effects using Web Audio API
 */

export type SoundEffectType = 'cinematic' | 'ambient' | 'click';

export class SoundEffectsManager {
    private audioContext: AudioContext;
    private sounds: Map<SoundEffectType, AudioBuffer> = new Map();

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    /**
     * Generate a cinematic rise sound effect
     */
    private generateCinematicRise(): AudioBuffer {
        const duration = 2.5; // 2.5 seconds
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;

                // Exponential frequency sweep from 55Hz to 880Hz
                const freqStart = 55;
                const freqEnd = 880;
                const freq = freqStart * Math.pow(freqEnd / freqStart, progress);

                // Volume envelope - fade in and out
                const envelope = Math.sin(progress * Math.PI);

                // Generate tone with some harmonics for richness
                const fundamental = Math.sin(2 * Math.PI * freq * time);
                const harmonic2 = 0.3 * Math.sin(2 * Math.PI * freq * 2 * time);
                const harmonic3 = 0.15 * Math.sin(2 * Math.PI * freq * 3 * time);

                // White noise for texture
                const noise = (Math.random() * 2 - 1) * 0.05;

                data[i] = (fundamental + harmonic2 + harmonic3 + noise) * envelope * 0.3;
            }
        }

        return buffer;
    }

    /**
     * Generate ambient lab sounds (subtle hum with occasional beeps)
     */
    private generateLabAmbience(): AudioBuffer {
        const duration = 10; // 10 seconds loop
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;

                // Low frequency hum (simulating equipment)
                const hum1 = 0.02 * Math.sin(2 * Math.PI * 60 * time); // 60Hz hum
                const hum2 = 0.015 * Math.sin(2 * Math.PI * 120 * time); // 120Hz harmonic

                // Filtered white noise for air conditioning/ventilation sound
                const noise = (Math.random() * 2 - 1) * 0.01;

                // Occasional soft beeps (every 3 seconds)
                let beep = 0;
                const beepInterval = 3;
                const beepTime = time % beepInterval;
                if (beepTime < 0.1) { // 0.1 second beep
                    const beepProgress = beepTime / 0.1;
                    const beepEnvelope = Math.sin(beepProgress * Math.PI);
                    beep = 0.03 * Math.sin(2 * Math.PI * 1000 * beepTime) * beepEnvelope;
                }

                data[i] = hum1 + hum2 + noise + beep;
            }
        }

        return buffer;
    }

    /**
     * Generate UI click sounds (short, crisp clicks)
     */
    private generateUIClicks(): AudioBuffer {
        const duration = 0.1; // 100ms click
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;

                // Fast exponential decay envelope
                const envelope = Math.exp(-progress * 40);

                // Higher frequency for click (1000Hz + harmonics)
                const click = Math.sin(2 * Math.PI * 1000 * time) * 0.3;
                const clickHarmonic = Math.sin(2 * Math.PI * 2000 * time) * 0.15;

                // Small noise burst for texture
                const noise = (Math.random() * 2 - 1) * 0.1;

                data[i] = (click + clickHarmonic + noise) * envelope * 0.5;
            }
        }

        return buffer;
    }

    /**
     * Initialize all sound effects
     */
    async initialize(): Promise<void> {
        this.sounds.set('cinematic', this.generateCinematicRise());
        this.sounds.set('ambient', this.generateLabAmbience());
        this.sounds.set('click', this.generateUIClicks());
    }

    /**
     * Play a sound effect
     */
    play(type: SoundEffectType, volume: number = 1, when: number = 0): void {
        const buffer = this.sounds.get(type);
        if (!buffer) {
            console.warn(`Sound effect "${type}" not initialized`);
            return;
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start(when);
    }

    /**
     * Get the audio buffer for a sound effect (for mixing into recordings)
     */
    getBuffer(type: SoundEffectType): AudioBuffer | undefined {
        return this.sounds.get(type);
    }

    /**
     * Export sound effect as a DataURL for storage
     */
    async exportAsDataURL(type: SoundEffectType): Promise<string> {
        const buffer = this.sounds.get(type);
        if (!buffer) {
            throw new Error(`Sound effect "${type}" not initialized`);
        }

        // Convert AudioBuffer to WAV file and then to DataURL
        const wavBlob = this.audioBufferToWav(buffer);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(wavBlob);
        });
    }

    /**
     * Convert AudioBuffer to WAV Blob
     */
    private audioBufferToWav(buffer: AudioBuffer): Blob {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const data = new Float32Array(buffer.length * numChannels);
        for (let i = 0; i < numChannels; i++) {
            const channelData = buffer.getChannelData(i);
            for (let j = 0; j < buffer.length; j++) {
                data[j * numChannels + i] = channelData[j];
            }
        }

        const dataLength = data.length * bytesPerSample;
        const bufferLength = 44 + dataLength;
        const arrayBuffer = new ArrayBuffer(bufferLength);
        const view = new DataView(arrayBuffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, bufferLength - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        // Write audio data
        let offset = 44;
        for (let i = 0; i < data.length; i++) {
            const sample = Math.max(-1, Math.min(1, data[i]));
            const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, intSample, true);
            offset += 2;
        }

        return new Blob([arrayBuffer], { type: 'audio/wav' });
    }

    /**
     * Create audio element from sound effect for playback during recording
     */
    createAudioElement(type: SoundEffectType, loop: boolean = false): HTMLAudioElement {
        const buffer = this.sounds.get(type);
        if (!buffer) {
            throw new Error(`Sound effect "${type}" not initialized`);
        }

        const wavBlob = this.audioBufferToWav(buffer);
        const url = URL.createObjectURL(wavBlob);
        const audio = new Audio(url);
        audio.loop = loop;
        return audio;
    }
}

// Singleton instance
let soundManager: SoundEffectsManager | null = null;

export async function getSoundManager(): Promise<SoundEffectsManager> {
    if (!soundManager) {
        soundManager = new SoundEffectsManager();
        await soundManager.initialize();
    }
    return soundManager;
}
