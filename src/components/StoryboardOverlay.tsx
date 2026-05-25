import React, { useEffect, useRef, useState } from 'react';
import {
    ChevronLeft, ChevronRight, X, Play, Pause, Check, HelpCircle,
    Volume2, VolumeX, Pencil, Eraser, EyeOff, Lightbulb
} from 'lucide-react';
import type { StoryboardPayload } from '../types';

interface StoryboardOverlayProps {
    storyboard: StoryboardPayload;
    currentSlideIndex: number;
    isLightMode: boolean;
    onSlideChange: (index: number) => void;
    onExit: () => void;

    // Drawing Board Props
    isDrawing: boolean;
    setIsDrawing: (val: boolean) => void;
    drawingColor: string;
    setDrawingColor: (val: string) => void;
    onClearDrawing: () => void;
}

export const StoryboardOverlay: React.FC<StoryboardOverlayProps> = ({
    storyboard,
    currentSlideIndex,
    isLightMode,
    onSlideChange,
    onExit,
    isDrawing,
    setIsDrawing,
    drawingColor,
    setDrawingColor,
    onClearDrawing
}) => {
    const { title, slides, autoPlaySeconds } = storyboard;

    // Auto-play / Timer State
    const [isPlaying, setIsPlaying] = useState(!!autoPlaySeconds && autoPlaySeconds > 0);
    const [autoPlayProgress, setAutoPlayProgress] = useState(0); // 0–100
    const progressRef = useRef(0);

    // Quiz State (resets per slide)
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    // Active Recall / Flashcard State
    const [isStudyMode, setIsStudyMode] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    // Audio Narration State
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [autoPlayAudio] = useState(true);

    if (!slides || slides.length === 0) return null;

    const currentSlide = slides[currentSlideIndex] || slides[0];
    const hasQuiz = !!currentSlide.quiz;
    const quizPassed = !hasQuiz || (quizSubmitted && quizAnswer === currentSlide.quiz?.correctIndex);
    const canAdvance = quizPassed;

    // ── Slide change reset ──────────────────────────────────────────────
    useEffect(() => {
        setQuizAnswer(null);
        setQuizSubmitted(false);
        setAutoPlayProgress(0);
        progressRef.current = 0;
        setIsRevealed(false);

        // Load new audio source if slide contains voice narration
        if (audioRef.current) {
            audioRef.current.pause();
            setIsAudioPlaying(false);
            if (currentSlide.audioNarration) {
                audioRef.current.src = currentSlide.audioNarration;
                audioRef.current.load();
                if (autoPlayAudio) {
                    audioRef.current.play()
                        .then(() => setIsAudioPlaying(true))
                        .catch(err => console.warn('Audio narration autoplay blocked:', err));
                }
            } else {
                audioRef.current.src = '';
            }
        }
    }, [currentSlideIndex, currentSlide.audioNarration]);

    // Handle toggling play/pause in header
    const handleTogglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            if (audioRef.current) {
                audioRef.current.pause();
                setIsAudioPlaying(false);
            }
        } else {
            setIsPlaying(true);
            if (currentSlide.audioNarration && audioRef.current) {
                audioRef.current.play()
                    .then(() => setIsAudioPlaying(true))
                    .catch(() => {});
            }
        }
    };

    // ── Autoplay progress/timing ─────────────────────────────────────────
    useEffect(() => {
        if (!isPlaying) return;

        let interval: ReturnType<typeof setInterval>;

        if (currentSlide.audioNarration && audioRef.current) {
            // Audio based progress
            interval = setInterval(() => {
                const audio = audioRef.current;
                if (audio && audio.duration) {
                    const pct = (audio.currentTime / audio.duration) * 100;
                    setAutoPlayProgress(Math.min(pct, 100));
                }
            }, 100);
        } else if (autoPlaySeconds && autoPlaySeconds > 0) {
            // Static duration based progress
            const totalMs = autoPlaySeconds * 1000;
            const stepMs = 50;
            interval = setInterval(() => {
                progressRef.current += stepMs;
                setAutoPlayProgress(Math.min((progressRef.current / totalMs) * 100, 100));
                if (progressRef.current >= totalMs) {
                    clearInterval(interval);
                    if (currentSlideIndex < slides.length - 1 && canAdvance) {
                        onSlideChange(currentSlideIndex + 1);
                    } else {
                        setIsPlaying(false);
                    }
                }
            }, stepMs);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, currentSlideIndex, currentSlide.audioNarration, autoPlaySeconds, canAdvance, slides.length, onSlideChange]);

    // Handle audio completion event
    const handleAudioEnded = () => {
        setIsAudioPlaying(false);
        if (isPlaying && currentSlideIndex < slides.length - 1 && canAdvance) {
            onSlideChange(currentSlideIndex + 1);
        } else if (currentSlideIndex === slides.length - 1) {
            setIsPlaying(false);
        }
    };

    // Toggle audio sound manually
    const handleAudioPlayClick = () => {
        if (audioRef.current) {
            if (isAudioPlaying) {
                audioRef.current.pause();
                setIsAudioPlaying(false);
            } else {
                audioRef.current.play()
                    .then(() => setIsAudioPlaying(true))
                    .catch(() => {});
            }
        }
    };

    // ── Keyboard navigation ─────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ignore if typing in text inputs
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                if (canAdvance && currentSlideIndex < slides.length - 1) {
                    onSlideChange(currentSlideIndex + 1);
                }
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (currentSlideIndex > 0) {
                    onSlideChange(currentSlideIndex - 1);
                }
            } else if (e.key === 'Escape') {
                onExit();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [currentSlideIndex, slides.length, canAdvance, onSlideChange, onExit]);

    // ── Navigation ───────────────────────────────────────────────────────
    const handleNext = () => {
        if (canAdvance && currentSlideIndex < slides.length - 1) {
            onSlideChange(currentSlideIndex + 1);
        }
    };
    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            onSlideChange(currentSlideIndex - 1);
        }
    };

    // ── Simple markdown renderer ─────────────────────────────────────────
    const renderContent = (text: string) => {
        if (!text) return '';
        let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        const lines = html.split('\n');
        let inList = false;
        const out = lines.map(line => {
            const t = line.trim();
            if (t.startsWith('- ') || t.startsWith('* ')) {
                let r = '';
                if (!inList) { r += '<ul class="list-disc pl-5 my-2 space-y-1 font-medium">'; inList = true; }
                r += `<li>${t.substring(2)}</li>`;
                return r;
            } else {
                let r = '';
                if (inList) { r += '</ul>'; inList = false; }
                if (t.length > 0) r += `<p class="my-1.5 leading-relaxed font-medium">${line}</p>`;
                return r;
            }
        });
        if (inList) out.push('</ul>');
        return out.join('');
    };

    const progressPercentage = ((currentSlideIndex + 1) / slides.length) * 100;
    const isLastSlide = currentSlideIndex === slides.length - 1;

    const base = `absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg rounded-2xl shadow-2xl backdrop-blur-md border transition-all duration-300 ${isLightMode
        ? 'bg-white/90 border-neutral-200 text-neutral-800'
        : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'}`;

    return (
        <>
            <audio ref={audioRef} onEnded={handleAudioEnded} className="hidden" />

            {/* ── Floating Annotations ─────────────────────────────────────── */}
            {(!isStudyMode || isRevealed) && currentSlide.annotations && currentSlide.annotations.map(a => (
                <div key={a.id} className="absolute z-40 pointer-events-none"
                    style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%, -50%)' }}>
                    <div className="px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg whitespace-nowrap"
                        style={{
                            backgroundColor: a.color ? `${a.color}22` : 'rgba(99,102,241,0.15)',
                            color: a.color || '#818cf8',
                            border: `1.5px solid ${a.color || '#818cf8'}55`,
                            backdropFilter: 'blur(6px)'
                        }}>
                        {a.text}
                    </div>
                </div>
            ))}

            {/* ── Float Draw toolbar just above player card ── */}
            <div className="absolute bottom-[284px] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl border shadow-lg backdrop-blur-md bg-neutral-900/85 border-neutral-800 text-white w-fit">
                    <button onClick={() => setIsDrawing(!isDrawing)}
                        className={`p-1.5 rounded-lg transition-all ${isDrawing ? 'bg-indigo-600 text-white' : 'hover:bg-neutral-800 text-neutral-400'}`}
                        title={isDrawing ? 'Disable Doodle Overlay' : 'Enable Doodle Overlay (Draw over 3D model)'}>
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                    
                    {isDrawing && (
                        <>
                            <div className="w-px h-4 bg-neutral-800 mx-0.5" />
                            {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ffffff'].map(color => (
                                <button key={color} onClick={() => setDrawingColor(color)}
                                    className={`w-3.5 h-3.5 rounded-full border transition-all ${drawingColor === color ? 'scale-125 border-white' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: color }}
                                    title={`Draw in ${color}`}
                                />
                            ))}
                            <div className="w-px h-4 bg-neutral-800 mx-0.5" />
                            <button onClick={onClearDrawing}
                                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                                title="Clear drawings">
                                <Eraser className="w-3.5 h-3.5" />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Main player panel ────────────────────────────────────────── */}
            <div className={base}>
                {/* Auto-play progress stripe at top */}
                {isPlaying && ((autoPlaySeconds ?? 0) > 0 || currentSlide.audioNarration) && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-none animate-pulse"
                            style={{ width: `${autoPlayProgress}%` }} />
                    </div>
                )}

                <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-3 border-b pb-2 border-neutral-200/55 dark:border-neutral-800/55">
                        <div className="min-w-0">
                            <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mb-1">
                                <Play className="w-2.5 h-2.5 fill-current" /> Presentation Mode
                            </span>
                            <h3 className="font-bold text-xs uppercase tracking-wider truncate opacity-60">{title}</h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {/* Study / Flashcard Mode */}
                            <button onClick={() => {
                                    setIsStudyMode(!isStudyMode);
                                    setIsRevealed(false);
                                }}
                                className={`p-1.5 rounded-full transition-colors ${isStudyMode ? 'text-amber-500 bg-amber-500/15' : (isLightMode ? 'hover:bg-neutral-100 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400')}`}
                                title={isStudyMode ? 'Disable Active Recall Mode' : 'Enable Active Recall / Study Mode'}>
                                <Lightbulb className="w-3.5 h-3.5" />
                            </button>

                            {/* Voice Narration Audio Toggle */}
                            {currentSlide.audioNarration && (
                                <button onClick={handleAudioPlayClick}
                                    className={`p-1.5 rounded-full transition-colors ${isAudioPlaying ? 'text-red-500 bg-red-500/15' : (isLightMode ? 'hover:bg-neutral-100 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400')}`}
                                    title={isAudioPlaying ? 'Pause audio narration' : 'Play audio narration'}>
                                    {isAudioPlaying ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
                                </button>
                            )}

                            {/* Auto-play toggle */}
                            {((autoPlaySeconds ?? 0) > 0 || currentSlide.audioNarration) && (
                                <button onClick={handleTogglePlay} title={isPlaying ? 'Pause autoplay' : 'Resume autoplay'}
                                    className={`p-1.5 rounded-full transition-colors ${isPlaying ? 'bg-indigo-500/10 text-indigo-500' : (isLightMode ? 'hover:bg-neutral-100 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400')}`}>
                                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                            )}

                            <button onClick={onExit} title="Exit Presentation (Esc)"
                                className={`p-1 rounded-full transition-colors ${isLightMode ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Active recall mask overlay / content */}
                    {isStudyMode && !isRevealed ? (
                        <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 min-h-[120px] bg-neutral-500/5 backdrop-blur-md rounded-xl border border-neutral-205/10 dark:border-neutral-800/20">
                            <EyeOff className="w-7 h-7 text-indigo-500 opacity-60 animate-bounce" />
                            <div>
                                <h5 className="font-bold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Study / Active Recall</h5>
                                <p className={`text-[10px] mt-0.5 max-w-[280px] leading-relaxed ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    Identify the highlighted residues and structure inside the 3D viewer, then reveal details.
                                </p>
                            </div>
                            <button onClick={() => setIsRevealed(true)}
                                className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white transition-all shadow-md active:scale-95">
                                Reveal Explanation
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Slide title & description */}
                            <div className="min-h-[80px] mb-3 select-text">
                                <h4 className="font-extrabold text-base tracking-tight mb-1">{currentSlide.title}</h4>
                                <div className={`text-xs space-y-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-300'}`}
                                    dangerouslySetInnerHTML={{ __html: renderContent(currentSlide.description) }} />
                            </div>

                            {/* ── Quiz block ── */}
                            {hasQuiz && currentSlide.quiz && (
                                <div className={`mb-3 p-3 rounded-xl border ${isLightMode ? 'bg-purple-50/60 border-purple-200' : 'bg-purple-500/10 border-purple-500/30'}`}>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 mb-2">
                                        <HelpCircle className="w-3.5 h-3.5" /> {currentSlide.quiz.question}
                                    </div>
                                    <div className="space-y-1.5">
                                        {currentSlide.quiz.options.filter(o => o.trim()).map((opt, i) => {
                                            let cls = '';
                                            if (!quizSubmitted) {
                                                cls = quizAnswer === i
                                                    ? (isLightMode ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-indigo-500/20 border-indigo-400 text-indigo-200')
                                                    : (isLightMode ? 'bg-white border-neutral-200 text-neutral-700 hover:border-indigo-300' : 'bg-black/20 border-neutral-700 text-neutral-300 hover:border-indigo-500');
                                            } else {
                                                const isCorrect = i === currentSlide.quiz!.correctIndex;
                                                const isWrong = i === quizAnswer && !isCorrect;
                                                cls = isCorrect
                                                    ? 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300'
                                                    : isWrong
                                                        ? 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300 opacity-70'
                                                        : (isLightMode ? 'bg-white border-neutral-200 text-neutral-500 opacity-60' : 'bg-black/20 border-neutral-700 text-neutral-400 opacity-60');
                                            }
                                            return (
                                                <button key={i} disabled={quizSubmitted}
                                                    onClick={() => setQuizAnswer(i)}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between ${cls}`}>
                                                    <span>{opt}</span>
                                                    {quizSubmitted && i === currentSlide.quiz!.correctIndex && <Check className="w-3.5 h-3.5 text-green-500" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!quizSubmitted ? (
                                        <button disabled={quizAnswer === null}
                                            onClick={() => setQuizSubmitted(true)}
                                            className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-40 transition-all">
                                            Submit Answer
                                        </button>
                                    ) : (
                                        <div className={`mt-2 text-center text-xs font-bold ${quizAnswer === currentSlide.quiz.correctIndex ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                            {quizAnswer === currentSlide.quiz.correctIndex ? '✅ Correct! You may proceed.' : '❌ Incorrect. Try again or revisit the structure.'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Progress + Controls */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                        <div className="flex-1 flex items-center gap-3">
                            <span className="text-[10px] font-bold opacity-60 shrink-0">
                                {currentSlideIndex + 1} / {slides.length}
                            </span>
                            <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${isLightMode ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                                <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${progressPercentage}%` }} />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={handlePrev} disabled={currentSlideIndex === 0}
                                className={`p-2 rounded-xl border transition-all ${currentSlideIndex === 0
                                    ? 'opacity-40 cursor-not-allowed border-transparent'
                                    : (isLightMode ? 'bg-white hover:bg-neutral-50 border-neutral-200' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700')}`}>
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={handleNext}
                                disabled={isLastSlide || !canAdvance}
                                title={!canAdvance ? 'Answer the quiz to continue' : ''}
                                className={`p-2 rounded-xl border transition-all ${(isLastSlide || !canAdvance)
                                    ? 'opacity-40 cursor-not-allowed border-transparent'
                                    : (isLightMode ? 'bg-white hover:bg-neutral-50 border-neutral-200' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700')}`}>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Keyboard hint */}
                    <div className={`mt-2 text-center text-[9px] font-medium opacity-30`}>
                        ← → Arrow keys to navigate · Esc to exit
                    </div>
                </div>
            </div>
        </>
    );
};
