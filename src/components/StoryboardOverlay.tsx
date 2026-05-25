import React from 'react';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';
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
    const { title, slides } = storyboard;

    if (!slides || slides.length === 0) return null;

    const currentSlide = slides[currentSlideIndex] || slides[0];

    const handleNext = () => {
        if (currentSlideIndex < slides.length - 1) {
            onSlideChange(currentSlideIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentSlideIndex > 0) {
            onSlideChange(currentSlideIndex - 1);
        }
    };

    // Simple markdown renderer to support basic styling (bold, italics, lists)
    const renderContent = (text: string) => {
        if (!text) return '';
        
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Bold **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Italics *text*
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // Bullet points
        const lines = html.split('\n');
        let inList = false;
        const formattedLines = lines.map(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                const content = trimmed.substring(2);
                let result = '';
                if (!inList) {
                    result += '<ul class="list-disc pl-5 my-2 space-y-1 font-medium">';
                    inList = true;
                }
                result += `<li>${content}</li>`;
                return result;
            } else {
                let result = '';
                if (inList) {
                    result += '</ul>';
                    inList = false;
                }
                if (trimmed.length > 0) {
                    result += `<p class="my-1.5 leading-relaxed font-medium">${line}</p>`;
                }
                return result;
            }
        });

        if (inList) {
            formattedLines.push('</ul>');
        }

        return formattedLines.join('');
    };

    const progressPercentage = ((currentSlideIndex + 1) / slides.length) * 100;

    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg p-5 rounded-2xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-bottom-2 fade-in transition-all duration-300 ${isLightMode ? 'bg-white/90 border-neutral-200 text-neutral-800' : 'bg-neutral-900/90 border-neutral-800 text-neutral-100'}`}>
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3 border-b pb-2 border-neutral-200/55 dark:border-neutral-800/55">
                <div className="min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit mb-1">
                        <Play className="w-2.5 h-2.5 fill-current" /> Presentation Mode
                    </span>
                    <h3 className={`font-bold text-xs uppercase tracking-wider truncate opacity-60`}>
                        {title}
                    </h3>
                </div>
                <button
                    onClick={onExit}
                    title="Exit Presentation"
                    className={`p-1 rounded-full transition-colors ${isLightMode ? 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800' : 'hover:bg-neutral-800 text-neutral-400 hover:text-white'}`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Slide Title & Description */}
            <div className="min-h-[100px] mb-4">
                <h4 className="font-extrabold text-base tracking-tight mb-2">
                    {currentSlide.title}
                </h4>
                <div 
                    className={`text-xs space-y-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-300'}`}
                    dangerouslySetInnerHTML={{ __html: renderContent(currentSlide.description) }}
                />
            </div>

            {/* Progress and Controls */}
            <div className="flex items-center justify-between gap-4 pt-1">
                {/* Progress bar and counter */}
                <div className="flex-1 flex items-center gap-3">
                    <span className="text-[10px] font-bold opacity-60 shrink-0">
                        {currentSlideIndex + 1} / {slides.length}
                    </span>
                    <div className={`h-1.5 flex-1 rounded-full overflow-hidden ${isLightMode ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                        <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Nav buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={handlePrev}
                        disabled={currentSlideIndex === 0}
                        className={`p-2 rounded-xl border transition-all ${currentSlideIndex === 0 
                            ? 'opacity-40 cursor-not-allowed border-transparent' 
                            : (isLightMode ? 'bg-white hover:bg-neutral-50 border-neutral-200' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750')}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={currentSlideIndex === slides.length - 1}
                        className={`p-2 rounded-xl border transition-all ${currentSlideIndex === slides.length - 1 
                            ? 'opacity-40 cursor-not-allowed border-transparent' 
                            : (isLightMode ? 'bg-white hover:bg-neutral-50 border-neutral-200' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750')}`}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
