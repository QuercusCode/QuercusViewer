import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Play, Pause, Check, HelpCircle, Tag } from 'lucide-react';
import type { StoryboardPayload } from '../types';

interface StoryboardOverlayProps {
    storyboard: StoryboardPayload;
    currentSlideIndex: number;
    isLightMode: boolean;
    onSlideChange: (index: number) => void;
    onExit: () => void;
}

export const StoryboardOverlay: React.FC<StoryboardOverlayProps> = ({
    storyboard,
    currentSlideIndex,
    isLightMode,
    onSlideChange,
    onExit
}) => {
    const { title, slides, autoPlaySeconds } = storyboard;

    // Auto-play state
    const [isPlaying, setIsPlaying] = useState(!!autoPlaySeconds && autoPlaySeconds > 0);
    const [autoPlayProgress, setAutoPlayProgress] = useState(0); // 0–100
    const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRef = useRef(0);

    // Quiz state (resets per slide)
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    if (!slides || slides.length === 0) return null;

    const currentSlide = slides[currentSlideIndex] || slides[0];
    const hasQuiz = !!currentSlide.quiz;
    const quizPassed = !hasQuiz || (quizSubmitted && quizAnswer === currentSlide.quiz?.correctIndex);
    const canAdvance = quizPassed;

    // ── Reset quiz state when slide changes ─────────────────────────────
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        setQuizAnswer(null);
        setQuizSubmitted(false);
        setAutoPlayProgress(0);
        progressRef.current = 0;
    }, [currentSlideIndex]);

    // ── Auto-play timer ─────────────────────────────────────────────────
    const startAutoPlay = useCallback(() => {
        if (!autoPlaySeconds || autoPlaySeconds <= 0) return;
        if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
        const intervalMs = 50;
        const totalMs = autoPlaySeconds * 1000;
        autoPlayTimer.current = setInterval(() => {
            progressRef.current += intervalMs;
            setAutoPlayProgress(Math.min((progressRef.current / totalMs) * 100, 100));
            if (progressRef.current >= totalMs) {
                clearInterval(autoPlayTimer.current!);
                autoPlayTimer.current = null;
                if (currentSlideIndex < slides.length - 1 && canAdvance) {
                    onSlideChange(currentSlideIndex + 1);
                } else {
                    setIsPlaying(false);
                }
            }
        }, intervalMs);
    }, [autoPlaySeconds, currentSlideIndex, slides.length, canAdvance, onSlideChange]);

    const stopAutoPlay = useCallback(() => {
        if (autoPlayTimer.current) { clearInterval(autoPlayTimer.current); autoPlayTimer.current = null; }
    }, []);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (isPlaying && canAdvance) {
            startAutoPlay();
        } else {
            stopAutoPlay();
        }
        return stopAutoPlay;
    }, [isPlaying, currentSlideIndex, canAdvance, startAutoPlay, stopAutoPlay]);

    // ── Keyboard navigation ─────────────────────────────────────────────
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                if (canAdvance && currentSlideIndex < slides.length - 1) onSlideChange(currentSlideIndex + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                if (currentSlideIndex > 0) onSlideChange(currentSlideIndex - 1);
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
            stopAutoPlay();
            progressRef.current = 0;
            setAutoPlayProgress(0);
            onSlideChange(currentSlideIndex + 1);
        }
    };
    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            stopAutoPlay();
            progressRef.current = 0;
            setAutoPlayProgress(0);
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
            {/* ── Floating Annotations ─────────────────────────────────────── */}
            {currentSlide.annotations && currentSlide.annotations.map(a => (
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

            {/* ── Main overlay panel ────────────────────────────────────────── */}
            <div className={base}>
                {/* Auto-play progress stripe at top */}
                {autoPlaySeconds && autoPlaySeconds > 0 && isPlaying && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-none"
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
                            {/* Auto-play toggle */}
                            {autoPlaySeconds && autoPlaySeconds > 0 && (
                                <button onClick={() => setIsPlaying(p => !p)} title={isPlaying ? 'Pause auto-play' : 'Resume auto-play'}
                                    className={`p-1.5 rounded-full transition-colors ${isLightMode ? 'hover:bg-neutral-100 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400'}`}>
                                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                            )}
                            <button onClick={onExit} title="Exit Presentation (Esc)"
                                className={`p-1 rounded-full transition-colors ${isLightMode ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Slide title & description */}
                    <div className="min-h-[80px] mb-3">
                        <h4 className="font-extrabold text-base tracking-tight mb-1">{currentSlide.title}</h4>
                        <div className={`text-xs space-y-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-300'}`}
                            dangerouslySetInnerHTML={{ __html: renderContent(currentSlide.description) }} />
                    </div>

                    {/* ── Quiz block ────────────────────────────────────────── */}
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
