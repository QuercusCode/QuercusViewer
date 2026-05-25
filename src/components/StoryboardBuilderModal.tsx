import React, { useState } from 'react';
import { X, Check, Copy, Camera, Plus, Trash2, ChevronUp, ChevronDown, Code, Sparkles, BookOpen } from 'lucide-react';
import type { StoryboardPayload, StoryboardSlide } from '../types';
import { getShareableURL } from '../utils/urlManager';

interface StoryboardBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLightMode: boolean;
    getCurrentViewerState: () => {
        cameraOrientation: any;
        representation: any;
        coloring: any;
        customColors: any;
        selectedResidue: any;
        showSurface: boolean;
        showLigands: boolean;
        pdbId: string;
        dataSource: any;
    };
}

export const StoryboardBuilderModal: React.FC<StoryboardBuilderModalProps> = ({
    isOpen,
    onClose,
    isLightMode,
    getCurrentViewerState
}) => {
    const [storyTitle, setStoryTitle] = useState('Protein Structure Walkthrough');
    const [slides, setSlides] = useState<StoryboardSlide[]>([
        {
            id: '1',
            title: 'Overview',
            description: 'This is the main overview of the protein structure. Notice the overall fold and tertiary organization.'
        }
    ]);
    const [activeSlideId, setActiveSlideId] = useState<string>('1');
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedEmbed, setCopiedEmbed] = useState(false);

    if (!isOpen) return null;

    const activeSlide = slides.find(s => s.id === activeSlideId) || slides[0];

    const handleAddSlide = () => {
        const newId = String(Date.now());
        const newSlide: StoryboardSlide = {
            id: newId,
            title: `Slide ${slides.length + 1}`,
            description: 'Provide an explanation for this structural feature.'
        };
        setSlides([...slides, newSlide]);
        setActiveSlideId(newId);
    };

    const handleDeleteSlide = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (slides.length <= 1) return; // Keep at least one slide
        
        const nextSlides = slides.filter(s => s.id !== id);
        setSlides(nextSlides);
        if (activeSlideId === id) {
            const index = slides.findIndex(s => s.id === id);
            const fallbackIndex = index === 0 ? 0 : index - 1;
            setActiveSlideId(nextSlides[fallbackIndex].id);
        }
    };

    const handleMoveSlide = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
        e.stopPropagation();
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === slides.length - 1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const nextSlides = [...slides];
        const temp = nextSlides[index];
        nextSlides[index] = nextSlides[targetIndex];
        nextSlides[targetIndex] = temp;
        setSlides(nextSlides);
    };

    const handleUpdateSlideField = (id: string, field: keyof StoryboardSlide, value: any) => {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    };

    const handleCaptureView = () => {
        const viewerState = getCurrentViewerState();
        if (!viewerState) return;

        setSlides(prev => prev.map(s => s.id === activeSlideId ? {
            ...s,
            cameraOrientation: viewerState.cameraOrientation,
            representation: viewerState.representation,
            coloring: viewerState.coloring,
            customColors: viewerState.customColors,
            selectedResidue: viewerState.selectedResidue,
            showSurface: viewerState.showSurface,
            showLigands: viewerState.showLigands
        } : s));
    };

    const getEmbedUrl = () => {
        const viewerState = getCurrentViewerState();
        const payload: StoryboardPayload = {
            title: storyTitle,
            slides: slides
        };

        // Build base view state using active viewport
        const appState = {
            pdbId: viewerState.pdbId,
            representation: viewerState.representation || 'cartoon',
            coloring: viewerState.coloring || 'chainid',
            customColors: viewerState.customColors,
            showSurface: viewerState.showSurface,
            showLigands: viewerState.showLigands,
            dataSource: viewerState.dataSource,
            isSpinning: false,
            storyboardPayload: payload
        };

        return getShareableURL('single', [appState]).replace('?', '?embed=true&ui=false&');
    };

    const embedCode = `<iframe
  src="${getEmbedUrl()}"
  width="100%"
  height="600"
  style="border:none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  title="Interactive Storyboard"
  allowFullScreen
></iframe>`;

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(getEmbedUrl());
            setCopiedUrl(true);
            setTimeout(() => setCopiedUrl(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleCopyEmbed = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopiedEmbed(true);
            setTimeout(() => setCopiedEmbed(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className={`relative w-full max-w-5xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-1 overflow-hidden transition-all duration-300 ${isLightMode ? 'bg-white/85' : 'bg-neutral-900/85'} backdrop-blur-xl border ${isLightMode ? 'border-white/40' : 'border-white/10'}`}>
                {/* Glowing decor */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isLightMode ? 'from-neutral-900 to-neutral-600' : 'from-white to-neutral-400'}`}>
                                    Storyboard Creator
                                </span>
                            </h2>
                            <p className={`mt-2 text-sm font-medium ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Build structured, narrative slide decks of 3D structures.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${isLightMode ? 'bg-white/50 hover:bg-neutral-100 text-neutral-600' : 'bg-black/20 hover:bg-neutral-800 text-neutral-400'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Story Title Input */}
                    <div className="mb-6 space-y-2 group">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors ${isLightMode ? 'text-neutral-500 group-focus-within:text-indigo-600' : 'text-neutral-400 group-focus-within:text-indigo-400'}`}>
                            Storyboard / Lesson Title
                        </label>
                        <input
                            type="text"
                            value={storyTitle}
                            onChange={(e) => setStoryTitle(e.target.value)}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold outline-none transition-all duration-200 shadow-inner ${isLightMode
                                ? 'bg-white/50 border-white/40 focus:border-indigo-500 focus:bg-white text-neutral-900 border'
                                : 'bg-black/20 border-white/5 focus:border-indigo-500 focus:bg-black/40 text-white border'}`}
                            placeholder="e.g. DNA Polymerase Substrate Coordination"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Sidebar: Slide list */}
                        <div className="flex flex-col space-y-3 h-[420px] md:h-[450px] overflow-hidden">
                            <div className="flex justify-between items-center px-1">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    Slides ({slides.length})
                                </label>
                                <button
                                    onClick={handleAddSlide}
                                    className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-85 transition-opacity"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Slide
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {slides.map((s, index) => {
                                    const isActive = s.id === activeSlideId;
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => setActiveSlideId(s.id)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${isActive
                                                ? (isLightMode ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' : 'bg-indigo-500/10 border-indigo-500/30')
                                                : (isLightMode ? 'bg-white/40 border-neutral-100 hover:bg-neutral-50' : 'bg-black/10 border-neutral-800 hover:bg-neutral-800/40')
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-indigo-600 text-white' : (isLightMode ? 'bg-neutral-200 text-neutral-600' : 'bg-neutral-800 text-neutral-400')}`}>
                                                    {index + 1}
                                                </span>
                                                <span className={`font-semibold text-xs truncate max-w-[120px] ${isActive ? 'text-indigo-700 dark:text-indigo-300' : (isLightMode ? 'text-neutral-700' : 'text-neutral-300')}`}>
                                                    {s.title || 'Untitled'}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
                                                <button
                                                    disabled={index === 0}
                                                    onClick={(e) => handleMoveSlide(index, 'up', e)}
                                                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                    disabled={index === slides.length - 1}
                                                    onClick={(e) => handleMoveSlide(index, 'down', e)}
                                                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none"
                                                >
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                {slides.length > 1 && (
                                                    <button
                                                        onClick={(e) => handleDeleteSlide(s.id, e)}
                                                        className="p-1 rounded hover:bg-red-500/10 text-red-500"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Slide editor form */}
                        <div className="md:col-span-2 flex flex-col space-y-4 h-[420px] md:h-[450px]">
                            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                                <div className="space-y-2 group">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors ${isLightMode ? 'text-neutral-500 group-focus-within:text-indigo-600' : 'text-neutral-400 group-focus-within:text-indigo-400'}`}>
                                        Slide Title
                                    </label>
                                    <input
                                        type="text"
                                        value={activeSlide.title}
                                        onChange={(e) => handleUpdateSlideField(activeSlide.id, 'title', e.target.value)}
                                        className={`w-full px-4 py-2 rounded-xl text-xs font-semibold outline-none transition-all duration-200 shadow-inner ${isLightMode
                                            ? 'bg-white/50 border-white/40 focus:border-indigo-500 focus:bg-white text-neutral-900 border'
                                            : 'bg-black/20 border-white/5 focus:border-indigo-500 focus:bg-black/40 text-white border'}`}
                                        placeholder="e.g. Close-up on Active Site"
                                    />
                                </div>

                                <div className="space-y-2 group">
                                    <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 transition-colors ${isLightMode ? 'text-neutral-500 group-focus-within:text-indigo-600' : 'text-neutral-400 group-focus-within:text-indigo-400'}`}>
                                        Slide Description (Markdown supported)
                                    </label>
                                    <textarea
                                        value={activeSlide.description}
                                        onChange={(e) => handleUpdateSlideField(activeSlide.id, 'description', e.target.value)}
                                        rows={4}
                                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-medium outline-none transition-all duration-200 shadow-inner resize-none ${isLightMode
                                            ? 'bg-white/50 border-white/40 focus:border-indigo-500 focus:bg-white text-neutral-900 border'
                                            : 'bg-black/20 border-white/5 focus:border-indigo-500 focus:bg-black/40 text-white border'}`}
                                        placeholder="Describe what structure feature we are looking at..."
                                    />
                                </div>

                                <div className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all duration-300 bg-indigo-500/5 border-indigo-500/10">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            Capture Current 3D Canvas
                                        </div>
                                        <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Stores the camera position, representation, colors, surface toggles, and any active selection.
                                        </p>
                                        
                                        {activeSlide.cameraOrientation ? (
                                            <div className="mt-2 inline-flex items-center gap-1 text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                                                <Check className="w-3 h-3" /> View captured
                                            </div>
                                        ) : (
                                            <div className="mt-2 inline-flex items-center gap-1 text-[9px] bg-neutral-200 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full font-bold">
                                                No view captured (will use default load angle)
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleCaptureView}
                                        className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        <Camera className="w-4 h-4" /> Capture State
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom action cards: Links & Embed */}
                    <div className="border-t border-neutral-200 dark:border-neutral-800 mt-6 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLightMode ? 'bg-[#FAFAFA] border-neutral-200' : 'bg-[#0E0E0E] border-neutral-800'}`}>
                                <div>
                                    <h4 className={`text-xs font-bold ${isLightMode ? 'text-neutral-800' : 'white'}`}>Shareable Lesson Link</h4>
                                    <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Direct link with the loaded storyboard player.</p>
                                </div>
                                <button
                                    onClick={handleCopyUrl}
                                    className={`mt-3 w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all duration-300 ${copiedUrl
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                                        : (isLightMode
                                            ? 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300'
                                            : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700')
                                        }`}
                                >
                                    {copiedUrl ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Share Link</>}
                                </button>
                            </div>

                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLightMode ? 'bg-[#FAFAFA] border-neutral-200' : 'bg-[#0E0E0E] border-neutral-800'}`}>
                                <div>
                                    <h4 className={`text-xs font-bold ${isLightMode ? 'text-neutral-800' : 'white'}`}>LMS / HTML Embed Code</h4>
                                    <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Embed inside Canvas, Moodle, or custom website.</p>
                                </div>
                                <button
                                    onClick={handleCopyEmbed}
                                    className={`mt-3 w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all duration-300 ${copiedEmbed
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                                        : (isLightMode
                                            ? 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300'
                                            : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700')
                                        }`}
                                >
                                    {copiedEmbed ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Code className="w-3.5 h-3.5" /> Copy Embed iframe</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
