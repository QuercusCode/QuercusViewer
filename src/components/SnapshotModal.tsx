import React, { useState, useEffect } from 'react';
import { Check, Image, Zap, Target, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../lib/i18n';

interface SnapshotModalProps {
    isOpen: boolean;
    viewMode: 'single' | 'dual' | 'triple' | 'quad';
    onConfirm: (viewportIndices: number[], qualityFactor: number, transparent: boolean) => void;
    onCancel: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ isOpen, viewMode, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const [selectedViewports, setSelectedViewports] = useState<boolean[]>([true, true, true, true]);
    const [selectedQuality, setSelectedQuality] = useState(2); // Default to High (2x)
    const [transparentBackground, setTransparentBackground] = useState(true); // Default to transparent

    const viewportCount = viewMode === 'single' ? 1 : viewMode === 'dual' ? 2 : viewMode === 'triple' ? 3 : 4;
    const isMultiView = viewMode !== 'single';

    // Reset selection when opening
    useEffect(() => {
        if (isOpen) {
            const newSelection = [false, false, false, false];
            for (let i = 0; i < viewportCount; i++) newSelection[i] = true;
            setSelectedViewports(newSelection);
            setSelectedQuality(2); // Reset to High quality
            setTransparentBackground(true); // Reset to transparent
        }
    }, [isOpen, viewportCount]);

    if (!isOpen) return null;

    const toggleViewport = (index: number) => {
        const newSelection = [...selectedViewports];
        newSelection[index] = !newSelection[index];
        setSelectedViewports(newSelection);
    };

    const handleConfirm = () => {
        const indices = selectedViewports.map((isSelected, idx) => isSelected ? idx : -1).filter(idx => idx !== -1);
        if (indices.length === 0) return; // Prevent confirming with no viewports selected
        onConfirm(indices, selectedQuality, transparentBackground);
    };

    const qualityOptions = [
        { label: 'Standard', factor: 1, icon: <Zap size={18} />, description: 'Native resolution' },
        { label: 'High', factor: 2, icon: <Image size={18} />, description: 'Double resolution' },
        { label: 'Ultra', factor: 3, icon: <Target size={18} />, description: 'Triple resolution' },
        { label: 'Maximum', factor: 4, icon: <Sparkles size={18} />, description: 'Quadruple resolution' }
    ];

    const renderViewportGrid = () => {
        const renderItem = (index: number, label: string, classes: string) => (
            <button
                key={index}
                onClick={() => toggleViewport(index)}
                className={clsx(
                    "relative flex items-center justify-center border-2 rounded-lg transition-all duration-200 overflow-hidden group h-16",
                    classes,
                    selectedViewports[index]
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-white/10 bg-black/40 hover:border-white/30"
                )}
            >
                <span className={clsx(
                    "font-bold text-xs z-10",
                    selectedViewports[index] ? "text-blue-400" : "text-gray-500"
                )}>
                    {label}
                </span>
                {
                    selectedViewports[index] && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check size={10} className="text-white" />
                        </div>
                    )
                }
            </button >
        );

        switch (viewMode) {
            case 'dual':
                return (
                    <div className="flex gap-2">
                        {renderItem(0, "VP 1", "w-1/2")}
                        {renderItem(1, "VP 2", "w-1/2")}
                    </div>
                );
            case 'triple':
                return (
                    <div className="flex flex-col gap-2">
                        {renderItem(0, "VP 1", "w-full")}
                        <div className="flex gap-2">
                            {renderItem(1, "VP 2", "w-1/2")}
                            {renderItem(2, "VP 3", "w-1/2")}
                        </div>
                    </div>
                );
            case 'quad':
                return (
                    <div className="grid grid-cols-2 gap-2">
                        {renderItem(0, "VP 1", "w-full")}
                        {renderItem(1, "VP 2", "w-full")}
                        {renderItem(2, "VP 3", "w-full")}
                        {renderItem(3, "VP 4", "w-full")}
                    </div>
                );
            default:
                return null;
        }
    };

    const selectedCount = selectedViewports.filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-gray-900 to-black">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Image className="text-blue-400" size={18} />
                        {t.snapTitle as string}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        {isMultiView ? (t.snapSubtitleMulti as string) : (t.snapSubtitleSingle as string)}
                    </p>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Viewport Selection (Multi-view only) */}
                    {isMultiView && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-white">{t.snapSelectViewports as string}</h4>
                                <span className="text-xs text-gray-500">{(t.snapSelected as (n: number) => string)(selectedCount)}</span>
                            </div>
                            {renderViewportGrid()}
                        </div>
                    )}

                    {/* Quality Selection */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white">{t.snapImageQuality as string}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {qualityOptions.map((option) => (
                                <button
                                    key={option.factor}
                                    onClick={() => setSelectedQuality(option.factor)}
                                    className={clsx(
                                        "p-3 rounded-lg border-2 transition-all text-left group relative overflow-hidden",
                                        selectedQuality === option.factor
                                            ? "border-blue-500 bg-blue-500/10"
                                            : "border-white/10 bg-black/40 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={clsx(
                                            "transition-colors",
                                            selectedQuality === option.factor ? "text-blue-400" : "text-gray-500"
                                        )}>
                                            {option.icon}
                                        </div>
                                        <div className={clsx(
                                            "font-bold text-sm",
                                            selectedQuality === option.factor ? "text-blue-400" : "text-white"
                                        )}>
                                            {option.label}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-gray-500">{option.description}</div>
                                    {selectedQuality === option.factor && (
                                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Check size={10} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transparent Background Toggle */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white">{t.snapBackground as string}</h4>
                        <button
                            onClick={() => setTransparentBackground(!transparentBackground)}
                            className={clsx(
                                "w-full p-4 rounded-lg border-2 transition-all text-left flex items-center justify-between",
                                transparentBackground
                                    ? "border-purple-500 bg-purple-500/10"
                                    : "border-white/10 bg-black/40 hover:border-white/20"
                            )}
                        >
                            <div>
                                <div className={clsx(
                                    "font-bold text-sm mb-1",
                                    transparentBackground ? "text-purple-400" : "text-white"
                                )}>
                                    {t.embedTransparentBg as string}
                                </div>
                                <div className="text-[10px] text-gray-500">{t.snapTransparentBgDesc as string}</div>
                            </div>
                            <div className={clsx(
                                "w-12 h-6 rounded-full transition-colors relative",
                                transparentBackground ? "bg-purple-500" : "bg-gray-600"
                            )}>
                                <div className={clsx(
                                    "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                                    transparentBackground ? "right-0.5" : "left-0.5"
                                )} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900/50 border-t border-white/10 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        {t.cancelBtn as string}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedCount === 0}
                        className="px-6 py-2 rounded-lg text-sm bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        {(t.snapCapture as (n: number) => string)(selectedCount)}
                    </button>
                </div>
            </div>
        </div>
    );
};
