import React, { useState, useEffect } from 'react';
import { X, Check, Copy, Camera, Target } from 'lucide-react';
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className={`relative w-full max-w-2xl rounded-xl shadow-2xl p-6 ${isLightMode ? 'bg-white text-neutral-900' : 'bg-neutral-900 text-white'}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Target className="w-6 h-6 text-blue-500" />
                        Create Assignment
                    </h2>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Form */}
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Question Prompt
                            </label>
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium outline-none border transition-all ${isLightMode
                                    ? 'bg-neutral-100 border-neutral-200 focus:border-blue-500'
                                    : 'bg-neutral-800 border-neutral-700 focus:border-blue-500'}`}
                                placeholder="e.g. Find Leucine 50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Success Message
                            </label>
                            <input
                                type="text"
                                value={successMessage}
                                onChange={(e) => setSuccessMessage(e.target.value)}
                                className={`w-full px-3 py-2 rounded-lg text-sm font-medium outline-none border transition-all ${isLightMode
                                    ? 'bg-neutral-100 border-neutral-200 focus:border-blue-500'
                                    : 'bg-neutral-800 border-neutral-700 focus:border-blue-500'}`}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={`text-xs font-bold uppercase tracking-wider flex justify-between items-end ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                                Target Answer
                                {targetResidue && <span className="text-green-500 text-[10px]">✓ Selected</span>}
                            </label>
                            
                            <div className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-3 text-center transition-all ${targetResidue 
                                ? (isLightMode ? 'bg-green-50 border-green-200' : 'bg-green-500/10 border-green-500/30') 
                                : (isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-800/50 border-neutral-700')}`}>
                                
                                {targetResidue ? (
                                    <div>
                                        <div className={`text-sm font-bold ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
                                            {targetResidue.resName} {targetResidue.resNo} (Chain {targetResidue.chain})
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`text-sm ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                                        No target selected
                                    </div>
                                )}
                                
                                <button
                                    onClick={handleSetTarget}
                                    disabled={!highlightedResidue}
                                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${highlightedResidue
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                                        : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed'}`}
                                >
                                    <Target className="w-4 h-4" />
                                    {highlightedResidue ? `Set as ${highlightedResidue.resName} ${highlightedResidue.resNo}` : 'Click on 3D structure first'}
                                </button>
                            </div>
                            <p className={`text-[10px] mt-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                Close this modal, click the residue you want in the 3D viewer, then re-open to set it.
                            </p>
                        </div>

                        <button
                            onClick={handleSetStartView}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold border transition-colors ${embedOrientation
                                ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                : (isLightMode ? 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700')
                                }`}
                        >
                            <Camera className="w-4 h-4" />
                            {embedOrientation ? 'Start View Captured' : 'Capture Current Camera View'}
                            {embedOrientation && <Check className="w-4 h-4 ml-1" />}
                        </button>
                    </div>

                    {/* Right Column: Output */}
                    <div className="flex flex-col h-full">
                        <label className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            LMS Embed Code
                        </label>
                        <div className={`flex-1 relative rounded-lg border overflow-hidden ${isLightMode ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-950 border-neutral-800'}`}>
                            {!isReady ? (
                                <div className="absolute inset-0 flex items-center justify-center text-center p-6">
                                    <p className={`text-sm ${isLightMode ? 'text-neutral-500' : 'text-neutral-500'}`}>
                                        Fill out the question and select a target residue to generate the embed code.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <pre className={`p-4 text-[10px] sm:text-xs overflow-auto h-full ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                                        <code>{embedCode}</code>
                                    </pre>
                                    <button
                                        onClick={handleCopyEmbed}
                                        className={`absolute bottom-4 right-4 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg transition-all ${copied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                                    >
                                        {copied ? (
                                            <>Copied! <Check className="w-4 h-4" /></>
                                        ) : (
                                            <>Copy Code <Copy className="w-4 h-4" /></>
                                        )}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
