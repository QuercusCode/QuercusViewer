import React, { useState, useEffect } from 'react';
import type { AssignmentPayload, ResidueInfo } from '../types';
import { CheckCircle2, XCircle, ChevronRight, HelpCircle } from 'lucide-react';

interface AssignmentOverlayProps {
    assignment: AssignmentPayload;
    selectedResidue: ResidueInfo | null;
    isLightMode: boolean;
    onResetSelection: () => void;
}

export const AssignmentOverlay: React.FC<AssignmentOverlayProps> = ({
    assignment,
    selectedResidue,
    isLightMode,
    onResetSelection
}) => {
    const [status, setStatus] = useState<'pending' | 'correct' | 'incorrect'>('pending');
    
    // Reset status if selection changes and we were previously incorrect
    useEffect(() => {
        if (status === 'incorrect' && selectedResidue) {
            setStatus('pending');
        }
    }, [selectedResidue]);

    const handleSubmit = () => {
        if (!selectedResidue) return;

        const chain1 = String(selectedResidue.chain || '').trim().toLowerCase();
        const chain2 = String(assignment.targetChain || '').trim().toLowerCase();
        const isChainMatch = chain1 === chain2;
        
        const res1 = String(selectedResidue.resNo || '').trim().toLowerCase();
        const res2 = String(assignment.targetResNo || '').trim().toLowerCase();
        const isResNoMatch = res1 === res2;
        
        // Optionally match atom name if specified, otherwise just residue match is fine
        // Handle cases where JSON.stringify/parse or URL encoding creates literal "null" or "undefined" strings
        const targetAtomStr = String(assignment.targetAtomName || '').trim().toLowerCase();
        const isAtomMatch = (targetAtomStr && targetAtomStr !== 'null' && targetAtomStr !== 'undefined')
            ? String(selectedResidue.atomName || '').trim().toLowerCase() === targetAtomStr
            : true;

        if (isChainMatch && isResNoMatch && isAtomMatch) {
            setStatus('correct');
        } else {
            setStatus('incorrect');
        }
    };

    const handleRetry = () => {
        setStatus('pending');
        onResetSelection();
    };

    return (
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-6 rounded-2xl shadow-2xl backdrop-blur-md border ${isLightMode ? 'bg-white/90 border-neutral-200' : 'bg-neutral-900/90 border-neutral-700'}`}>
            
            {/* Header / Prompt */}
            <div className="flex items-start gap-4 mb-4">
                <div className={`p-2 rounded-lg ${isLightMode ? 'bg-blue-100 text-blue-600' : 'bg-blue-500/20 text-blue-400'}`}>
                    <HelpCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className={`font-bold text-lg leading-tight ${isLightMode ? 'text-neutral-900' : 'text-white'}`}>
                        {assignment.question}
                    </h3>
                    {status === 'pending' && (
                        <p className={`text-sm mt-1 ${isLightMode ? 'text-neutral-600' : 'text-neutral-400'}`}>
                            Click on the 3D structure to select your answer.
                        </p>
                    )}
                </div>
            </div>

            {/* Selection Status */}
            {status === 'pending' && (
                <div className={`p-3 rounded-lg flex items-center justify-between transition-all ${selectedResidue ? (isLightMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-500/10 border-blue-500/30') : (isLightMode ? 'bg-neutral-100' : 'bg-neutral-800')} border`}>
                    <div className="flex flex-col">
                        <span className={`text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-neutral-500' : 'text-neutral-400'}`}>Current Selection</span>
                        <span className={`font-medium ${selectedResidue ? (isLightMode ? 'text-blue-700' : 'text-blue-300') : (isLightMode ? 'text-neutral-400' : 'text-neutral-500')}`}>
                            {selectedResidue 
                                ? `${selectedResidue.resName} ${selectedResidue.resNo} (Chain ${selectedResidue.chain})` 
                                : 'None'}
                        </span>
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedResidue}
                        className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${selectedResidue ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-neutral-300 text-neutral-500 cursor-not-allowed opacity-50'}`}
                    >
                        Submit <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Feedback States */}
            {status === 'correct' && (
                <div className="animate-in slide-in-from-bottom-2 fade-in">
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex flex-col items-center text-center gap-2">
                        <CheckCircle2 className="w-12 h-12 text-green-500 mb-1" />
                        <h4 className="font-bold text-green-600 dark:text-green-400 text-xl">Correct!</h4>
                        <p className={`text-sm ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                            {assignment.successMessage}
                        </p>
                    </div>
                </div>
            )}

            {status === 'incorrect' && (
                <div className="animate-in slide-in-from-bottom-2 fade-in">
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center text-center gap-2">
                        <XCircle className="w-12 h-12 text-red-500 mb-1" />
                        <h4 className="font-bold text-red-600 dark:text-red-400 text-xl">Not quite</h4>
                        <p className={`text-sm ${isLightMode ? 'text-neutral-700' : 'text-neutral-300'}`}>
                            That is {selectedResidue?.resName} {selectedResidue?.resNo} (Chain {selectedResidue?.chain || '?'}). Try again!
                        </p>
                        <p className="text-[10px] opacity-50 mt-1 font-mono break-all max-w-[200px] text-center">
                            Expected: {assignment.targetChain}:{assignment.targetResNo} <br/>
                            Got: {selectedResidue?.chain}:{selectedResidue?.resNo}
                        </p>
                        <button 
                            onClick={handleRetry}
                            className="mt-2 px-4 py-2 rounded-lg font-bold text-sm bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
