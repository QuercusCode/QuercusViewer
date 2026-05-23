import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Camera, Target, Code, Sparkles } from 'lucide-react';
import type { AssignmentPayload, ResidueInfo } from '../types';

interface AssignmentBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLightMode: boolean;
    highlightedResidue: ResidueInfo | null;
    generateBaseUrl: () => string;
}

export const AssignmentBuilderModal: React.FC<AssignmentBuilderModalProps> = ({
    isOpen,
    onClose,
    isLightMode,
    highlightedResidue,
    generateBaseUrl
}) => {
    const [question, setQuestion] = useState('Find the catalytic residue');
    const [successMessage, setSuccessMessage] = useState('Correct! This is the catalytic residue.');
    const [targetResidue, setTargetResidue] = useState<ResidueInfo | null>(null);
    const [embedOrientation, setEmbedOrientation] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    // Orientation Message Handler
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'ORIENTATION_RESPONSE') {
                setEmbedOrientation(event.data.orientation);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSetStartView = () => {
        window.postMessage({ type: 'REQUEST_ORIENTATION' }, '*');
    };

    const handleSetTarget = () => {
        if (highlightedResidue) {
            setTargetResidue(highlightedResidue);
        }
    };

    const getEmbedUrl = () => {
        let url = generateBaseUrl().replace('?', '?embed=true&ui=false&');
        
        if (embedOrientation) {
            url += `&orientation=${encodeURIComponent(JSON.stringify(embedOrientation))}`;
        }
        
        if (targetResidue) {
            const payload: AssignmentPayload = {
                question,
                successMessage,
                targetChain: targetResidue.chain,
                targetResNo: targetResidue.resNo,
                targetAtomName: targetResidue.atomName
            };
            const b64 = btoa(JSON.stringify(payload));
            url += `&assign=${b64}`;
        }
        
        return url;
    };

    const embedCode = `<iframe
  src="${getEmbedUrl()}"
  width="100%"
  height="600"
  style="border:none; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"
  title="Interactive Assignment"
  allowFullScreen
></iframe>`;

    const handleCopyEmbed = async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    if (!isOpen) return null;

    const isReady = targetResidue !== null && question.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className={`relative w-full max-w-4xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-1 overflow-hidden transition-all duration-300 ${isLightMode ? 'bg-white/80' : 'bg-neutral-900/80'} backdrop-blur-xl border ${isLightMode ? 'border-white/40' : 'border-white/10'}`}>
                {/* Decorative background glow */}
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-[80px] pointer-events-none" />

                <div className="relative p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <span className={`bg-clip-text text-transparent bg-gradient-to-r ${isLightMode ? 'from-neutral-900 to-neutral-600' : 'from-white to-neutral-400'}`}>
                                    Create Assignment
                                </span>
                            </h2>
                            <p className={`mt-2 text-sm font-medium ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Build an interactive 3D quiz to embed in your LMS or website.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 ${isLightMode ? 'bg-white/50 hover:bg-neutral-100 text-neutral-600' : 'bg-black/20 hover:bg-neutral-800 text-neutral-400'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Form */}
                        <div className="space-y-6">
                            <div className="space-y-2 group">
                                <label className={`text-xs font-bold uppercase tracking-widest ml-1 transition-colors ${isLightMode ? 'text-neutral-500 group-focus-within:text-blue-600' : 'text-neutral-400 group-focus-within:text-blue-400'}`}>
                                    Question Prompt
                                </label>
                                <input
                                    type="text"
                                    value={question}
                                    onChange={(e) => setQuestion(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 shadow-inner ${isLightMode
                                        ? 'bg-white/50 border-white/40 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] text-neutral-900 border'
                                        : 'bg-black/20 border-white/5 focus:border-blue-500 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] text-white border'}`}
                                    placeholder="e.g. Find Leucine 50"
                                />
                            </div>

                            <div className="space-y-2 group">
                                <label className={`text-xs font-bold uppercase tracking-widest ml-1 transition-colors ${isLightMode ? 'text-neutral-500 group-focus-within:text-blue-600' : 'text-neutral-400 group-focus-within:text-blue-400'}`}>
                                    Success Message
                                </label>
                                <input
                                    type="text"
                                    value={successMessage}
                                    onChange={(e) => setSuccessMessage(e.target.value)}
                                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all duration-200 shadow-inner ${isLightMode
                                        ? 'bg-white/50 border-white/40 focus:border-blue-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(59,130,246,0.1)] text-neutral-900 border'
                                        : 'bg-black/20 border-white/5 focus:border-blue-500 focus:bg-black/40 focus:shadow-[0_0_0_4px_rgba(59,130,246,0.2)] text-white border'}`}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={`text-xs font-bold uppercase tracking-widest ml-1 flex justify-between items-center ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                    Target Answer
                                    {targetResidue && (
                                        <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                                            <Check className="w-3 h-3" /> Selected
                                        </span>
                                    )}
                                </label>
                                
                                <div className={`relative overflow-hidden p-6 rounded-2xl flex flex-col items-center justify-center gap-4 text-center transition-all duration-300 ${targetResidue 
                                    ? (isLightMode ? 'bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200 shadow-sm' : 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 shadow-inner') 
                                    : (isLightMode ? 'bg-white/40 border-2 border-dashed border-neutral-200 hover:border-blue-400 hover:bg-blue-50/50' : 'bg-black/20 border-2 border-dashed border-neutral-700 hover:border-blue-500/50 hover:bg-blue-900/10')}`}>
                                    
                                    {targetResidue ? (
                                        <div className="z-10">
                                            <div className="w-12 h-12 mx-auto rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-2">
                                                <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className={`text-lg font-black tracking-tight ${isLightMode ? 'text-green-800' : 'text-green-400'}`}>
                                                {targetResidue.resName} {targetResidue.resNo}
                                            </div>
                                            <div className={`text-xs font-bold mt-1 ${isLightMode ? 'text-green-600/70' : 'text-green-400/70'}`}>
                                                Chain {targetResidue.chain}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`z-10 flex flex-col items-center gap-2 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            <div className="w-12 h-12 rounded-full bg-neutral-200/50 dark:bg-neutral-800/50 flex items-center justify-center">
                                                <Target className="w-6 h-6 opacity-50" />
                                            </div>
                                            <div className="font-medium">No target selected</div>
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={handleSetTarget}
                                        disabled={!highlightedResidue}
                                        className={`z-10 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 ${highlightedResidue
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'
                                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'}`}
                                    >
                                        <Target className="w-4 h-4" />
                                        {highlightedResidue ? `Set as ${highlightedResidue.resName} ${highlightedResidue.resNo}` : 'Select a residue in 3D viewer'}
                                    </button>
                                </div>
                                <p className={`text-[11px] mt-2 ml-1 font-medium ${isLightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                    💡 <span className="opacity-80">Close this modal, click the target residue in the 3D viewer, then re-open to set it.</span>
                                </p>
                            </div>

                            <button
                                onClick={handleSetStartView}
                                className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-sm ${embedOrientation
                                    ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                                    : (isLightMode 
                                        ? 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 hover:shadow-md' 
                                        : 'bg-neutral-800/50 text-neutral-200 border-white/5 hover:border-white/10 hover:bg-neutral-800 hover:shadow-lg shadow-black/50')
                                    }`}
                            >
                                <Camera className={`w-4 h-4 ${embedOrientation ? 'text-emerald-500' : ''}`} />
                                {embedOrientation ? 'Start View Captured' : 'Capture Current Camera View'}
                                {embedOrientation && <Check className="w-4 h-4 ml-1" />}
                            </button>
                        </div>

                        {/* Right Column: Output */}
                        <div className="flex flex-col h-full">
                            <label className={`text-xs font-bold uppercase tracking-widest ml-1 mb-2 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                LMS Embed Code
                            </label>
                            <div className={`flex-1 relative rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isLightMode ? 'bg-[#FAFAFA] border-neutral-200' : 'bg-[#0D0D0D] border-neutral-800'}`}>
                                
                                {/* MacOS style header */}
                                <div className={`flex items-center gap-2 px-4 py-3 border-b ${isLightMode ? 'bg-neutral-100 border-neutral-200' : 'bg-[#1A1A1A] border-neutral-800'}`}>
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/10"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/10"></div>
                                        <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/10"></div>
                                    </div>
                                    <div className="flex-1 flex justify-center">
                                        <div className={`text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 opacity-50 ${isLightMode ? 'text-neutral-600' : 'text-neutral-300'}`}>
                                            <Code className="w-3 h-3" />
                                            iframe
                                        </div>
                                    </div>
                                </div>

                                {!isReady ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                        <div className="w-16 h-16 mb-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center transform -rotate-12 transition-transform duration-500 hover:rotate-0">
                                            <Code className={`w-8 h-8 ${isLightMode ? 'text-neutral-400' : 'text-neutral-500'}`} />
                                        </div>
                                        <h3 className={`text-lg font-bold mb-2 ${isLightMode ? 'text-neutral-800' : 'text-white'}`}>
                                            Almost there
                                        </h3>
                                        <p className={`text-sm font-medium leading-relaxed max-w-[250px] ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                            Fill out the question and select a target residue to generate the embed code.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="relative flex-1 flex flex-col">
                                        <pre className={`flex-1 p-5 pb-24 text-xs overflow-auto font-mono leading-relaxed ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                            <code>{embedCode}</code>
                                        </pre>
                                        
                                        {/* Gradient fade out at bottom to frame the button nicely */}
                                        <div className={`absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-t ${isLightMode ? 'from-[#FAFAFA]' : 'from-[#0D0D0D]'} to-transparent`} />
                                        
                                        <div className="absolute bottom-5 right-5">
                                            <button
                                                onClick={handleCopyEmbed}
                                                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl transition-all duration-300 hover:-translate-y-1 active:translate-y-0 ${copied
                                                    ? 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/25'
                                                    : 'bg-white text-neutral-900 hover:bg-neutral-50 shadow-black/10 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700 dark:shadow-black/50'}`}
                                            >
                                                {copied ? (
                                                    <>Copied! <Check className="w-4 h-4" /></>
                                                ) : (
                                                    <>Copy HTML <Copy className="w-4 h-4" /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
