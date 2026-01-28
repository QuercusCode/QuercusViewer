/**
 * Sound Effects Generator and Manager
 * Generates simple sound effects using Web Audio API
 */

export type SoundEffectType = 'ambient' | 'click' | 'folding' | 'helix' | 'sheet' | 'bond' | 'thermal' | 'docking' | 'scan' | 'interaction' | 'denaturation' | 'crystal';

export class SoundEffectsManager {
    private audioContext: AudioContext;
    private sounds: Map<SoundEffectType, AudioBuffer> = new Map();

    constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    /**
     * Generate protein folding sound (dissonant to harmonic transition)
     */
    private generateFolding(): AudioBuffer {
        const duration = 3.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;

                // Start with multiple dissonant frequencies, converge to a major chord
                const baseFreq = 220; // A3
                // Frequencies diverge at start, converge at end
                const f1 = baseFreq * (1 + 0.5 * (1 - progress)); // Dissonant start
                const f2 = baseFreq * 1.25; // Major third (Goal)
                const f3 = baseFreq * 1.5; // Fifth (Goal)

                // Add some warble/instability at start
                const instability = (1 - progress) * 10;

                const s1 = Math.sin(2 * Math.PI * (f1 + Math.random() * instability) * time);
                const s2 = Math.sin(2 * Math.PI * (f2 - (1 - progress) * 50) * time);
                const s3 = Math.sin(2 * Math.PI * (f3 + (1 - progress) * 30) * time);

                const envelope = Math.sin(progress * Math.PI); // Smooth arc

                data[i] = (s1 + s2 + s3) * 0.2 * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Helix Spiral sound (rising swirly tone)
     */
    private generateHelix(): AudioBuffer {
        const duration = 2.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;

                // Rising frequency with LFO (swirl)
                const lfo = Math.sin(2 * Math.PI * 8 * time); // 8Hz swirl
                const startFreq = 300;
                const endFreq = 600;
                const currentFreq = startFreq + (endFreq - startFreq) * progress + (lfo * 20);

                const osc = Math.sin(2 * Math.PI * currentFreq * time);
                const envelope = Math.sin(progress * Math.PI);

                // Pan effect
                const pan = channel === 0 ? Math.cos(2 * Math.PI * 2 * time) : Math.sin(2 * Math.PI * 2 * time);

                data[i] = osc * 0.3 * envelope * (0.5 + 0.5 * pan);
            }
        }
        return buffer;
    }

    /**
     * Generate Beta Sheet sound (structured, rhythmic)
     */
    private generateSheet(): AudioBuffer {
        const duration = 2.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                // Square-ish waves for structure
                const freq = 110; // Low fundamental
                const harmonic = Math.sin(2 * Math.PI * freq * time) +
                    0.5 * Math.sin(2 * Math.PI * freq * 2 * time) +
                    0.25 * Math.sin(2 * Math.PI * freq * 3 * time);

                // Rhythmic gating
                const gate = Math.sin(2 * Math.PI * 4 * time) > 0 ? 1 : 0.1;

                const envelope = 1 - (time / duration);

                data[i] = harmonic * 0.2 * gate * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Molecular Bond sound (sharp snap/ping)
     */
    private generateBond(): AudioBuffer {
        const duration = 0.5;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;


                // Fast envelope
                const envelope = Math.exp(-time * 10);

                // Pure tone ping
                const freq = 880;
                const osc = Math.sin(2 * Math.PI * freq * time);

                data[i] = osc * 0.5 * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Thermal Vibration sound (jittery hum)
     */
    private generateThermal(): AudioBuffer {
        const duration = 1.5;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;

                // Low rumble + jitter
                const jitter = (Math.random() - 0.5) * 0.1;
                const osc = Math.sin(2 * Math.PI * (50 + jitter * 100) * time);

                const envelope = Math.sin((time / duration) * Math.PI);

                data[i] = osc * 0.4 * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Docking Complete sound (satisfying lock)
     */
    private generateDocking(): AudioBuffer {
        const duration = 1.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;

                // Pitch drop thud + high click
                const pitchEnv = Math.exp(-time * 5);
                const freq = 200 * pitchEnv + 60;
                const osc = Math.sin(2 * Math.PI * freq * time);

                const click = time < 0.05 ? (Math.random() - 0.5) : 0;

                const envelope = Math.exp(-time * 3);

                data[i] = (osc + click * 0.5) * 0.5 * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Surface Scan sound (high freq sweep)
     */
    private generateScan(): AudioBuffer {
        const duration = 1.5;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;


                const freq = 2000 + Math.sin(2 * Math.PI * 10 * time) * 500;
                const osc = Math.sin(2 * Math.PI * freq * time);

                // Stereo pan sweep
                const pan = Math.sin(2 * Math.PI * 1 * time); // Left to right
                const amp = channel === 0 ? (1 + pan) / 2 : (1 - pan) / 2;

                data[i] = osc * 0.15 * amp;
            }
        }
        return buffer;
    }

    /**
     * Generate Residue Interaction sound (blips)
     */
    private generateInteraction(): AudioBuffer {
        const duration = 1.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;

                // Two blips
                let blip = 0;
                if ((time > 0.1 && time < 0.2) || (time > 0.4 && time < 0.5)) {
                    blip = Math.sin(2 * Math.PI * 1200 * time);
                }

                data[i] = blip * 0.2;
            }
        }
        return buffer;
    }

    /**
     * Generate Denaturation sound (falling apart)
     */
    private generateDenaturation(): AudioBuffer {
        const duration = 2.5;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;
                const progress = time / duration;

                // Pitch falling, noise increasing
                const freq = 400 * (1 - progress * 0.5);
                const osc = Math.sin(2 * Math.PI * freq * time);
                const noise = (Math.random() - 0.5) * progress; // Noise increases

                const envelope = 1 - progress;

                data[i] = (osc * 0.3 + noise * 0.2) * envelope;
            }
        }
        return buffer;
    }

    /**
     * Generate Crystal Lattice sound (shimmering harmonics)
     */
    private generateCrystal(): AudioBuffer {
        const duration = 3.0;
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(2, duration * sampleRate, sampleRate);

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            const data = buffer.getChannelData(channel);
            for (let i = 0; i < data.length; i++) {
                const time = i / sampleRate;


                // Multiple high pure tones
                const baseF = 1500;
                const h1 = Math.sin(2 * Math.PI * baseF * time);
                const h2 = Math.sin(2 * Math.PI * baseF * 1.5 * time);
                const h3 = Math.sin(2 * Math.PI * baseF * 2.0 * time);

                const shimmer = Math.sin(2 * Math.PI * 6 * time); // slight tremolo

                const envelope = Math.exp(-time * 1.5);

                data[i] = (h1 + h2 + h3) * 0.1 * (0.8 + 0.2 * shimmer) * envelope;
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
        // Initialize standard sounds
        this.sounds.set('ambient', this.generateLabAmbience());
        this.sounds.set('click', this.generateUIClicks());

        // Initialize protein sounds
        this.sounds.set('folding', this.generateFolding());
        this.sounds.set('helix', this.generateHelix());
        this.sounds.set('sheet', this.generateSheet());
        this.sounds.set('bond', this.generateBond());
        this.sounds.set('thermal', this.generateThermal());
        this.sounds.set('docking', this.generateDocking());
        this.sounds.set('scan', this.generateScan());
        this.sounds.set('interaction', this.generateInteraction());
        this.sounds.set('denaturation', this.generateDenaturation());
        this.sounds.set('crystal', this.generateCrystal());
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
