import React, { useState, useRef } from 'react';
import {
    X, Check, Copy, Camera, Plus, Trash2, ChevronUp, ChevronDown,
    Code, Sparkles, BookOpen, Copy as Duplicate, FileDown, FileUp, FileText,
    Link, Play, HelpCircle, Tag, StickyNote,
    AlertCircle, CheckCircle2
} from 'lucide-react';
import type { StoryboardPayload, StoryboardSlide, SlideQuiz, SlideAnnotation } from '../types';
import { getShareableURL } from '../utils/urlManager';

const AUTO_PLAY_OPTIONS = [0, 3, 5, 10, 15, 30];

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

type ActiveTab = 'content' | 'quiz' | 'notes' | 'annotations';

export const StoryboardBuilderModal: React.FC<StoryboardBuilderModalProps> = ({
    isOpen,
    onClose,
    isLightMode,
    getCurrentViewerState
}) => {
    const [storyTitle, setStoryTitle] = useState('Protein Structure Walkthrough');
    const [autoPlaySeconds, setAutoPlaySeconds] = useState(0);
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
    const [activeTab, setActiveTab] = useState<ActiveTab>('content');
    const [importUrlInput, setImportUrlInput] = useState('');
    const [importUrlError, setImportUrlError] = useState('');
    const [importUrlSuccess, setImportUrlSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const activeSlide = slides.find(s => s.id === activeSlideId) || slides[0];

    // ── Slide management ──────────────────────────────────────────────────
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

    const handleDuplicateSlide = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const source = slides.find(s => s.id === id);
        if (!source) return;
        const newId = String(Date.now());
        const clone: StoryboardSlide = { ...source, id: newId, title: `${source.title} (copy)` };
        const idx = slides.findIndex(s => s.id === id);
        const next = [...slides];
        next.splice(idx + 1, 0, clone);
        setSlides(next);
        setActiveSlideId(newId);
    };

    const handleDeleteSlide = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (slides.length <= 1) return;
        const nextSlides = slides.filter(s => s.id !== id);
        setSlides(nextSlides);
        if (activeSlideId === id) {
            const index = slides.findIndex(s => s.id === id);
            setActiveSlideId(nextSlides[Math.max(0, index - 1)].id);
        }
    };

    const handleMoveSlide = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
        e.stopPropagation();
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === slides.length - 1) return;
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        const nextSlides = [...slides];
        [nextSlides[index], nextSlides[targetIndex]] = [nextSlides[targetIndex], nextSlides[index]];
        setSlides(nextSlides);
    };

    const updateSlide = (id: string, patch: Partial<StoryboardSlide>) => {
        setSlides(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    };

    const handleCaptureView = () => {
        const viewerState = getCurrentViewerState();
        if (!viewerState) return;
        updateSlide(activeSlideId, {
            cameraOrientation: viewerState.cameraOrientation,
            representation: viewerState.representation,
            coloring: viewerState.coloring,
            customColors: viewerState.customColors,
            selectedResidue: viewerState.selectedResidue,
            showSurface: viewerState.showSurface,
            showLigands: viewerState.showLigands
        });
    };

    // ── Quiz helpers ──────────────────────────────────────────────────────
    const ensureQuiz = (): SlideQuiz => activeSlide.quiz || { question: '', options: ['', '', '', ''], correctIndex: 0 };

    const updateQuiz = (patch: Partial<SlideQuiz>) => {
        updateSlide(activeSlideId, { quiz: { ...ensureQuiz(), ...patch } });
    };

    const updateQuizOption = (optIdx: number, value: string) => {
        const q = ensureQuiz();
        const options = [...q.options];
        options[optIdx] = value;
        updateSlide(activeSlideId, { quiz: { ...q, options } });
    };

    // ── Annotation helpers ────────────────────────────────────────────────
    const addAnnotation = () => {
        const existing = activeSlide.annotations || [];
        const newA: SlideAnnotation = { id: String(Date.now()), text: 'Label', x: 50, y: 50, color: '#ffffff' };
        updateSlide(activeSlideId, { annotations: [...existing, newA] });
    };

    const updateAnnotation = (id: string, patch: Partial<SlideAnnotation>) => {
        const next = (activeSlide.annotations || []).map(a => a.id === id ? { ...a, ...patch } : a);
        updateSlide(activeSlideId, { annotations: next });
    };

    const deleteAnnotation = (id: string) => {
        updateSlide(activeSlideId, { annotations: (activeSlide.annotations || []).filter(a => a.id !== id) });
    };

    // ── Export / Import ───────────────────────────────────────────────────
    const getPayload = (): StoryboardPayload => ({
        title: storyTitle,
        slides,
        autoPlaySeconds: autoPlaySeconds > 0 ? autoPlaySeconds : undefined
    });

    const handleExportJSON = () => {
        const json = JSON.stringify(getPayload(), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${storyTitle.replace(/\s+/g, '_')}.storyboard.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportPDF = () => {
        const payload = getPayload();
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const mdToHtml = (text: string) => {
            if (!text) return '';
            return text
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .split('\n')
                .map(line => {
                    const t = line.trim();
                    if (t.startsWith('- ') || t.startsWith('* ')) return `<li>${t.substring(2)}</li>`;
                    return t ? `<p>${line}</p>` : '';
                })
                .join('')
                .replace(/(<li>.*?<\/li>)+/gs, match => `<ul>${match}</ul>`);
        };

        const slidesHtml = payload.slides.map((slide, i) => {
            const quizHtml = slide.quiz ? `
                <div class="quiz-block">
                    <div class="quiz-label">❓ Quiz Question</div>
                    <div class="quiz-question">${slide.quiz.question}</div>
                    <ul class="quiz-options">
                        ${slide.quiz.options.filter(o => o.trim()).map((opt, oi) => `
                            <li class="quiz-option ${oi === slide.quiz!.correctIndex ? 'correct' : ''}">
                                ${oi === slide.quiz!.correctIndex ? '✅' : '○'} ${opt}
                            </li>
                        `).join('')}
                    </ul>
                </div>` : '';

            const notesHtml = slide.speakerNotes ? `
                <div class="notes-block">
                    <div class="notes-label">🗒️ Speaker Notes</div>
                    <div class="notes-content">${slide.speakerNotes.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>
                </div>` : '';

            const annotationsHtml = slide.annotations?.length ? `
                <div class="annotations-block">
                    <div class="annotations-label">🏷️ Floating Labels</div>
                    <ul>${slide.annotations.map(a => `<li><span style="color:${a.color || '#6366f1'}">${a.text}</span> — position (${a.x}%, ${a.y}%)</li>`).join('')}</ul>
                </div>` : '';

            return `
                <div class="slide-page">
                    <div class="slide-number">Slide ${i + 1} of ${payload.slides.length}</div>
                    <h2 class="slide-title">${slide.title}</h2>
                    <div class="slide-description">${mdToHtml(slide.description)}</div>
                    <div class="viewer-placeholder">
                        <div class="viewer-inner">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.5">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                <path d="M2 17l10 5 10-5"/>
                                <path d="M2 12l10 5 10-5"/>
                            </svg>
                            <span>3D Viewer — ${slide.cameraOrientation ? 'view captured' : 'default orientation'}</span>
                            ${slide.representation ? `<span class="rep-badge">${slide.representation}</span>` : ''}
                        </div>
                    </div>
                    ${quizHtml}
                    ${annotationsHtml}
                    ${notesHtml}
                </div>`;
        }).join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>${payload.title}</title>
    <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #111; }

        /* Cover page */
        .cover {
            min-height: 100vh;
            display: flex; flex-direction: column; justify-content: center; align-items: flex-start;
            padding: 80px 72px;
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%);
            color: white;
            page-break-after: always;
        }
        .cover-badge { font-size: 11px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; opacity: .6; margin-bottom: 24px; }
        .cover-title { font-size: 52px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; }
        .cover-meta { font-size: 14px; opacity: .55; margin-top: 48px; }
        .cover-count { font-size: 18px; font-weight: 700; opacity: .8; }

        /* Slide pages */
        .slide-page {
            min-height: 100vh;
            padding: 56px 72px;
            display: flex; flex-direction: column; gap: 24px;
            page-break-after: always;
            border-top: 5px solid #4f46e5;
        }
        .slide-number { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .15em; color: #6366f1; }
        .slide-title { font-size: 36px; font-weight: 900; color: #111; line-height: 1.15; }
        .slide-description { font-size: 15px; line-height: 1.75; color: #374151; }
        .slide-description p { margin-bottom: 8px; }
        .slide-description ul { padding-left: 20px; margin-bottom: 8px; }
        .slide-description li { margin-bottom: 4px; }
        .slide-description strong { font-weight: 700; }
        .slide-description em { font-style: italic; }

        /* 3D view placeholder */
        .viewer-placeholder {
            border: 2px dashed #c7d2fe;
            border-radius: 16px;
            background: #f5f3ff;
            padding: 32px;
            display: flex; justify-content: center;
            min-height: 220px;
        }
        .viewer-inner {
            display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
            color: #6366f1; font-size: 13px; font-weight: 600; text-align: center;
        }
        .rep-badge {
            background: #ede9fe; color: #5b21b6; font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: .1em; padding: 3px 10px; border-radius: 999px;
        }

        /* Quiz */
        .quiz-block { background: #faf5ff; border: 1.5px solid #e9d5ff; border-radius: 12px; padding: 20px 24px; }
        .quiz-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .15em; color: #7c3aed; margin-bottom: 8px; }
        .quiz-question { font-size: 15px; font-weight: 700; color: #1f2937; margin-bottom: 14px; }
        .quiz-options { list-style: none; display: flex; flex-direction: column; gap: 8px; }
        .quiz-option {
            padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600;
            border: 1.5px solid #e5e7eb; color: #374151;
        }
        .quiz-option.correct { background: #f0fdf4; border-color: #22c55e; color: #166534; }

        /* Notes */
        .notes-block { background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 12px; padding: 20px 24px; }
        .notes-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .15em; color: #b45309; margin-bottom: 8px; }
        .notes-content { font-size: 13px; color: #78350f; line-height: 1.7; }

        /* Annotations */
        .annotations-block { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 12px; padding: 16px 20px; }
        .annotations-label { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .15em; color: #c2410c; margin-bottom: 8px; }
        .annotations-block ul { list-style: disc; padding-left: 18px; font-size: 13px; color: #7c2d12; line-height: 1.8; }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .slide-page, .cover { page-break-after: always; }
        }
    </style>
</head>
<body>
    <div class="cover">
        <div class="cover-badge">Molecular Storyboard · Quercus Viewer</div>
        <h1 class="cover-title">${payload.title}</h1>
        <div class="cover-count">${payload.slides.length} slide${payload.slides.length !== 1 ? 's' : ''}${payload.autoPlaySeconds ? ` · Auto-play ${payload.autoPlaySeconds}s` : ''}</div>
        <div class="cover-meta">Exported ${date}</div>
    </div>
    ${slidesHtml}
    <script>
        window.onload = () => { window.print(); window.onafterprint = () => window.close(); };
    <\/script>
</body>
</html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed: StoryboardPayload = JSON.parse(ev.target?.result as string);
                if (!parsed.title || !Array.isArray(parsed.slides)) throw new Error('Invalid format');
                setStoryTitle(parsed.title);
                setSlides(parsed.slides);
                setAutoPlaySeconds(parsed.autoPlaySeconds || 0);
                setActiveSlideId(parsed.slides[0]?.id || '1');
            } catch {
                alert('Invalid storyboard JSON file.');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleImportFromUrl = () => {
        setImportUrlError('');
        setImportUrlSuccess(false);
        try {
            const params = new URLSearchParams(new URL(importUrlInput).search);
            const story = params.get('story');
            if (!story) { setImportUrlError('No storyboard found in this URL.'); return; }
            const decodedStr = decodeURIComponent(escape(atob(story)));
            const parsed: StoryboardPayload = JSON.parse(decodedStr);
            if (!parsed.title || !Array.isArray(parsed.slides)) throw new Error();
            setStoryTitle(parsed.title);
            setSlides(parsed.slides);
            setAutoPlaySeconds(parsed.autoPlaySeconds || 0);
            setActiveSlideId(parsed.slides[0]?.id || '1');
            setImportUrlInput('');
            setImportUrlSuccess(true);
            setTimeout(() => setImportUrlSuccess(false), 3000);
        } catch {
            setImportUrlError('Could not parse a storyboard from this URL.');
        }
    };

    // ── Share URL ─────────────────────────────────────────────────────────
    const getEmbedUrl = () => {
        const viewerState = getCurrentViewerState();
        const appState = {
            pdbId: viewerState.pdbId,
            representation: viewerState.representation || 'cartoon',
            coloring: viewerState.coloring || 'chainid',
            customColors: viewerState.customColors,
            showSurface: viewerState.showSurface,
            showLigands: viewerState.showLigands,
            dataSource: viewerState.dataSource,
            isSpinning: false,
            storyboardPayload: getPayload()
        };
        return getShareableURL('single', [appState]).replace('?', '?embed=true&ui=false&');
    };

    const embedCode = `<iframe\n  src="${getEmbedUrl()}"\n  width="100%"\n  height="600"\n  style="border:none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"\n  title="Interactive Storyboard"\n  allowFullScreen\n></iframe>`;

    const handleCopyUrl = async () => {
        try { await navigator.clipboard.writeText(getEmbedUrl()); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000); } catch { }
    };
    const handleCopyEmbed = async () => {
        try { await navigator.clipboard.writeText(embedCode); setCopiedEmbed(true); setTimeout(() => setCopiedEmbed(false), 2000); } catch { }
    };

    // ── Styles ────────────────────────────────────────────────────────────
    const card = `${isLightMode ? 'bg-white/50 border-neutral-100' : 'bg-black/10 border-neutral-800'} rounded-xl border p-4`;
    const inputCls = `w-full px-3 py-2 rounded-xl text-xs font-medium outline-none transition-all duration-200 shadow-inner ${isLightMode
        ? 'bg-white/50 border border-white/40 focus:border-indigo-500 focus:bg-white text-neutral-900'
        : 'bg-black/20 border border-white/5 focus:border-indigo-500 focus:bg-black/40 text-white'}`;
    const tabCls = (t: ActiveTab) => `px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeTab === t
        ? (isLightMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/20 text-indigo-300')
        : (isLightMode ? 'text-neutral-500 hover:text-neutral-700' : 'text-neutral-500 hover:text-neutral-300')}`;
    const labelCls = `text-[10px] font-bold uppercase tracking-widest mb-1 block ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className={`relative w-full max-w-5xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-1 overflow-hidden transition-all duration-300 ${isLightMode ? 'bg-white/85' : 'bg-neutral-900/85'} backdrop-blur-xl border ${isLightMode ? 'border-white/40' : 'border-white/10'}`}>
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isLightMode ? 'from-neutral-900 to-neutral-600' : 'from-white to-neutral-400'}`}>
                                    Storyboard Creator
                                </span>
                            </h2>
                            <p className={`mt-1 text-sm font-medium ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Build structured, narrative slide decks of 3D structures.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Export/Import */}
                            <button onClick={handleExportPDF} title="Export storyboard as PDF"
                                className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' : 'bg-red-900/30 border-red-800 text-red-300 hover:bg-red-900/50'}`}>
                                <FileText className="w-4 h-4" /> PDF
                            </button>
                            <button onClick={handleExportJSON} title="Export storyboard as JSON"
                                className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'}`}>
                                <FileDown className="w-4 h-4" /> Export
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} title="Import storyboard from JSON"
                                className={`p-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 ${isLightMode ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50' : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-750'}`}>
                                <FileUp className="w-4 h-4" /> Import
                            </button>
                            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
                            <button onClick={onClose} className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${isLightMode ? 'bg-white/50 hover:bg-neutral-100 text-neutral-600' : 'bg-black/20 hover:bg-neutral-800 text-neutral-400'}`}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Title + AutoPlay row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        <div className="sm:col-span-2 space-y-1 group">
                            <label className={labelCls}>Storyboard / Lesson Title</label>
                            <input type="text" value={storyTitle} onChange={e => setStoryTitle(e.target.value)}
                                className={inputCls} placeholder="e.g. DNA Polymerase Substrate Coordination" />
                        </div>
                        <div className="space-y-1">
                            <label className={labelCls}>
                                <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Auto-Play Interval</span>
                            </label>
                            <select value={autoPlaySeconds} onChange={e => setAutoPlaySeconds(Number(e.target.value))}
                                className={inputCls}>
                                {AUTO_PLAY_OPTIONS.map(s => (
                                    <option key={s} value={s}>{s === 0 ? 'Off (manual)' : `${s}s per slide`}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Import from URL */}
                    <div className={`mb-5 p-3 rounded-xl border flex flex-col sm:flex-row gap-2 items-start sm:items-center ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-black/20 border-neutral-800'}`}>
                        <Link className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`} />
                        <input type="text" value={importUrlInput} onChange={e => { setImportUrlInput(e.target.value); setImportUrlError(''); }}
                            placeholder="Paste a shareable storyboard URL to import it…"
                            className={`flex-1 bg-transparent outline-none text-xs font-medium ${isLightMode ? 'text-neutral-800 placeholder:text-neutral-400' : 'text-white placeholder:text-neutral-500'}`} />
                        {importUrlSuccess && <span className="flex items-center gap-1 text-[10px] font-bold text-green-500"><CheckCircle2 className="w-3.5 h-3.5" /> Imported!</span>}
                        {importUrlError && <span className="flex items-center gap-1 text-[10px] font-bold text-red-500"><AlertCircle className="w-3.5 h-3.5" /> {importUrlError}</span>}
                        <button onClick={handleImportFromUrl} disabled={!importUrlInput.trim()}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-all shrink-0">
                            Import
                        </button>
                    </div>

                    {/* Main grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Slide list */}
                        <div className="flex flex-col space-y-3 h-[420px] overflow-hidden">
                            <div className="flex justify-between items-center px-1">
                                <label className={labelCls}>Slides ({slides.length})</label>
                                <button onClick={handleAddSlide}
                                    className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:opacity-85 transition-opacity">
                                    <Plus className="w-3.5 h-3.5" /> Add Slide
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {slides.map((s, index) => {
                                    const isActive = s.id === activeSlideId;
                                    return (
                                        <div key={s.id} onClick={() => setActiveSlideId(s.id)}
                                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${isActive
                                                ? (isLightMode ? 'bg-indigo-50/70 border-indigo-200 shadow-sm' : 'bg-indigo-500/10 border-indigo-500/30')
                                                : (isLightMode ? 'bg-white/40 border-neutral-100 hover:bg-neutral-50' : 'bg-black/10 border-neutral-800 hover:bg-neutral-800/40')}`}>
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? 'bg-indigo-600 text-white' : (isLightMode ? 'bg-neutral-200 text-neutral-600' : 'bg-neutral-800 text-neutral-400')}`}>
                                                    {index + 1}
                                                </span>
                                                <div className="overflow-hidden">
                                                    <span className={`font-semibold text-xs truncate block max-w-[100px] ${isActive ? 'text-indigo-700 dark:text-indigo-300' : (isLightMode ? 'text-neutral-700' : 'text-neutral-300')}`}>
                                                        {s.title || 'Untitled'}
                                                    </span>
                                                    <div className="flex gap-1 mt-0.5">
                                                        {s.cameraOrientation && <span className="text-[8px] bg-green-500/15 text-green-600 dark:text-green-400 px-1 rounded-full font-bold">📷</span>}
                                                        {s.quiz && <span className="text-[8px] bg-purple-500/15 text-purple-600 dark:text-purple-400 px-1 rounded-full font-bold">❓</span>}
                                                        {(s.annotations?.length || 0) > 0 && <span className="text-[8px] bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1 rounded-full font-bold">🏷️</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-0.5 opacity-70 hover:opacity-100 transition-opacity">
                                                <button disabled={index === 0} onClick={e => handleMoveSlide(index, 'up', e)}
                                                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none">
                                                    <ChevronUp className="w-3 h-3" />
                                                </button>
                                                <button disabled={index === slides.length - 1} onClick={e => handleMoveSlide(index, 'down', e)}
                                                    className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none">
                                                    <ChevronDown className="w-3 h-3" />
                                                </button>
                                                <button onClick={e => handleDuplicateSlide(s.id, e)} title="Duplicate slide"
                                                    className="p-1 rounded hover:bg-blue-500/10 text-blue-500">
                                                    <Duplicate className="w-3 h-3" />
                                                </button>
                                                {slides.length > 1 && (
                                                    <button onClick={e => handleDeleteSlide(s.id, e)}
                                                        className="p-1 rounded hover:bg-red-500/10 text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Slide editor */}
                        <div className="md:col-span-2 flex flex-col h-[420px]">
                            {/* Tab bar */}
                            <div className={`flex gap-1 p-1 rounded-xl mb-3 w-fit ${isLightMode ? 'bg-neutral-100' : 'bg-black/30'}`}>
                                <button className={tabCls('content')} onClick={() => setActiveTab('content')}>
                                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 inline" /> Content</span>
                                </button>
                                <button className={tabCls('quiz')} onClick={() => setActiveTab('quiz')}>
                                    <span className="flex items-center gap-1"><HelpCircle className="w-3 h-3 inline" /> Quiz</span>
                                </button>
                                <button className={tabCls('notes')} onClick={() => setActiveTab('notes')}>
                                    <span className="flex items-center gap-1"><StickyNote className="w-3 h-3 inline" /> Notes</span>
                                </button>
                                <button className={tabCls('annotations')} onClick={() => setActiveTab('annotations')}>
                                    <span className="flex items-center gap-1"><Tag className="w-3 h-3 inline" /> Labels</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                                {/* ── Content tab ── */}
                                {activeTab === 'content' && (
                                    <>
                                        <div className="space-y-1">
                                            <label className={labelCls}>Slide Title</label>
                                            <input type="text" value={activeSlide.title}
                                                onChange={e => updateSlide(activeSlideId, { title: e.target.value })}
                                                className={inputCls} placeholder="e.g. Close-up on Active Site" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className={labelCls}>Slide Description (Markdown supported)</label>
                                            <textarea value={activeSlide.description}
                                                onChange={e => updateSlide(activeSlideId, { description: e.target.value })}
                                                rows={4} className={`${inputCls} resize-none`}
                                                placeholder="Describe what structural feature we are looking at…" />
                                        </div>
                                        <div className={`${card} flex items-center justify-between gap-4`}>
                                            <div className="flex-1">
                                                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                                    <Sparkles className="w-3.5 h-3.5" /> Capture Current 3D Canvas
                                                </div>
                                                <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                    Stores camera position, representation, colors, surface, and selection.
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
                                            <button onClick={handleCaptureView}
                                                className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                                                <Camera className="w-4 h-4" /> Capture State
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* ── Quiz tab ── */}
                                {activeTab === 'quiz' && (
                                    <div className={`${card} space-y-4`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold flex items-center gap-1.5 text-purple-500">
                                                    <HelpCircle className="w-3.5 h-3.5" /> Slide Quiz
                                                </div>
                                                <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                    Students must answer before advancing to the next slide.
                                                </p>
                                            </div>
                                            {activeSlide.quiz && (
                                                <button onClick={() => updateSlide(activeSlideId, { quiz: undefined })}
                                                    className="text-[10px] font-bold text-red-500 hover:opacity-75">Remove Quiz</button>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <label className={labelCls}>Question</label>
                                            <input type="text" value={ensureQuiz().question}
                                                onChange={e => updateQuiz({ question: e.target.value })}
                                                className={inputCls} placeholder="e.g. What type of secondary structure is shown in blue?" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className={labelCls}>Answer Options (click the radio to mark correct)</label>
                                            {ensureQuiz().options.map((opt, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <button onClick={() => updateQuiz({ correctIndex: i })}
                                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${ensureQuiz().correctIndex === i ? 'border-green-500 bg-green-500' : (isLightMode ? 'border-neutral-300' : 'border-neutral-600')}`}>
                                                        {ensureQuiz().correctIndex === i && <Check className="w-3 h-3 text-white" />}
                                                    </button>
                                                    <input type="text" value={opt}
                                                        onChange={e => updateQuizOption(i, e.target.value)}
                                                        className={inputCls} placeholder={`Option ${i + 1}`} />
                                                </div>
                                            ))}
                                        </div>
                                        <p className={`text-[9px] ${isLightMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                            Tip: Fill in the question and options, then click the circle next to the correct answer.
                                        </p>
                                    </div>
                                )}

                                {/* ── Speaker Notes tab ── */}
                                {activeTab === 'notes' && (
                                    <div className={`${card} space-y-3`}>
                                        <div className="text-xs font-bold flex items-center gap-1.5 text-amber-500">
                                            <StickyNote className="w-3.5 h-3.5" /> Speaker Notes
                                        </div>
                                        <p className={`text-[10px] ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Private notes visible only in the builder — never shown in the student's embedded player.
                                        </p>
                                        <textarea value={activeSlide.speakerNotes || ''}
                                            onChange={e => updateSlide(activeSlideId, { speakerNotes: e.target.value })}
                                            rows={8} className={`${inputCls} resize-none`}
                                            placeholder="Your private teaching notes for this slide…" />
                                    </div>
                                )}

                                {/* ── Annotations tab ── */}
                                {activeTab === 'annotations' && (
                                    <div className="space-y-3">
                                        <div className={`${card}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div>
                                                    <div className="text-xs font-bold flex items-center gap-1.5 text-orange-500">
                                                        <Tag className="w-3.5 h-3.5" /> Floating Labels
                                                    </div>
                                                    <p className={`text-[10px] mt-0.5 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                                        Text labels that appear on top of the 3D canvas during this slide.
                                                    </p>
                                                </div>
                                                <button onClick={addAnnotation}
                                                    className="flex items-center gap-1 text-[11px] font-black text-orange-500 hover:opacity-80 transition-opacity">
                                                    <Plus className="w-3.5 h-3.5" /> Add Label
                                                </button>
                                            </div>

                                            {(!activeSlide.annotations || activeSlide.annotations.length === 0) ? (
                                                <div className={`text-center py-6 rounded-xl border border-dashed ${isLightMode ? 'border-neutral-200 text-neutral-400' : 'border-neutral-700 text-neutral-500'}`}>
                                                    <Tag className="w-6 h-6 mx-auto mb-2 opacity-40" />
                                                    <p className="text-xs font-medium">No labels yet. Click "Add Label" to create one.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {activeSlide.annotations.map(a => (
                                                        <div key={a.id} className={`p-3 rounded-xl border space-y-2 ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-black/20 border-neutral-800'}`}>
                                                            <div className="flex items-center gap-2">
                                                                <input type="text" value={a.text}
                                                                    onChange={e => updateAnnotation(a.id, { text: e.target.value })}
                                                                    className={`${inputCls} flex-1`} placeholder="Label text" />
                                                                <input type="color" value={a.color || '#ffffff'}
                                                                    onChange={e => updateAnnotation(a.id, { color: e.target.value })}
                                                                    className="w-8 h-8 rounded-lg border-0 cursor-pointer shrink-0" title="Label color" />
                                                                <button onClick={() => deleteAnnotation(a.id)} className="p-1 text-red-500 hover:opacity-75 shrink-0">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className={`${labelCls} mb-0`}>X position: {a.x}%</label>
                                                                    <input type="range" min={0} max={100} value={a.x}
                                                                        onChange={e => updateAnnotation(a.id, { x: Number(e.target.value) })}
                                                                        className="w-full h-1.5 accent-orange-500" />
                                                                </div>
                                                                <div>
                                                                    <label className={`${labelCls} mb-0`}>Y position: {a.y}%</label>
                                                                    <input type="range" min={0} max={100} value={a.y}
                                                                        onChange={e => updateAnnotation(a.id, { y: Number(e.target.value) })}
                                                                        className="w-full h-1.5 accent-orange-500" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer: Share / Embed */}
                    <div className="border-t border-neutral-200 dark:border-neutral-800 mt-6 pt-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLightMode ? 'bg-[#FAFAFA] border-neutral-200' : 'bg-[#0E0E0E] border-neutral-800'}`}>
                                <div>
                                    <h4 className={`text-xs font-bold ${isLightMode ? 'text-neutral-800' : 'text-white'}`}>Shareable Lesson Link</h4>
                                    <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Direct link with the loaded storyboard player.</p>
                                </div>
                                <button onClick={handleCopyUrl}
                                    className={`mt-3 w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all duration-300 ${copiedUrl
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                                        : (isLightMode ? 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300' : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700')}`}>
                                    {copiedUrl ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy Share Link</>}
                                </button>
                            </div>

                            <div className={`p-4 rounded-xl border flex flex-col justify-between ${isLightMode ? 'bg-[#FAFAFA] border-neutral-200' : 'bg-[#0E0E0E] border-neutral-800'}`}>
                                <div>
                                    <h4 className={`text-xs font-bold ${isLightMode ? 'text-neutral-800' : 'text-white'}`}>LMS / HTML Embed Code</h4>
                                    <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Embed inside Canvas, Moodle, or custom website.</p>
                                </div>
                                <button onClick={handleCopyEmbed}
                                    className={`mt-3 w-full py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all duration-300 ${copiedEmbed
                                        ? 'bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20'
                                        : (isLightMode ? 'bg-white text-neutral-800 border-neutral-200 hover:border-neutral-300' : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700')}`}>
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
