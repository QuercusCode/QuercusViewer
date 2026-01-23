import React, { useState } from 'react';
import { Image, Zap, Target, Sparkles } from 'lucide-react';
import clsx from 'clsx';

export interface QualitySelectorProps {
    isOpen: boolean;
    viewportCount: number; // Number of viewports being captured
    onConfirm: (factor: number) => void;
    onCancel: () => void;
}

interface QualityOption {
    label: string;
    factor: number;
    description: string;
    icon: React.ReactNode;
    color: string;
    estimatedSize: string;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({ isOpen, viewportCount, onConfirm, onCancel }) => {
    const [selectedFactor, setSelectedFactor] = useState(2); // Default to High quality

    const qualityOptions: QualityOption[] = [
        {
            label: 'Standard',
            factor: 1,
            description: 'Native resolution, quick capture',
            icon: <Zap size={20} />,
            color: 'blue',
            estimatedSize: viewportCount > 1 ? '~2-3 MB' : '~1-2 MB'
        },
        {
            label: 'High',
            factor: 2,
            description: 'Double resolution, presentations',
            icon: <Image size={20} />,
            color: 'emerald',
            estimatedSize: viewportCount > 1 ? '~5-8 MB' : '~3-5 MB'
        },
        {
            label: 'Ultra',
            factor: 3,
            description: 'Triple resolution, publications',
            icon: <Target size={20} />,
            color: 'orange',
            estimatedSize: viewportCount > 1 ? '~10-15 MB' : '~6-10 MB'
        },
        {
            label: 'Maximum',
            factor: 4,
            description: 'Quadruple resolution, large prints',
            icon: <Sparkles size={20} />,
            color: 'purple',
            estimatedSize: viewportCount > 1 ? '~15-25 MB' : '~10-18 MB'
        }
    ];

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(selectedFactor);
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-gray-900 to-black">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Image className="text-blue-400" size={18} />
                        Select Image Quality
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Choose resolution quality for {viewportCount === 1 ? 'your snapshot' : `${viewportCount} snapshots`}
                    </p>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    {qualityOptions.map((option) => (
                        <button
                            key={option.factor}
                            onClick={() => setSelectedFactor(option.factor)}
                            className={clsx(
                                "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group relative overflow-hidden",
                                selectedFactor === option.factor
                                    ? `border-${option.color}-500 bg-${option.color}-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]`
                                    : "border-white/10 bg-black/40 hover:border-white/20 hover:bg-white/5"
                            )}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        "p-2 rounded-lg mt-0.5 transition-colors",
                                        selectedFactor === option.factor
                                            ? `bg-${option.color}-500/20 text-${option.color}-400`
                                            : "bg-white/5 text-gray-500"
                                    )}>
                                        {option.icon}
                                    </div>
                                    <div>
                                        <div className={clsx(
                                            "font-bold text-base transition-colors",
                                            selectedFactor === option.factor ? `text-${option.color}-400` : "text-white"
                                        )}>
                                            {option.label} ({option.factor}x)
                                        </div>
                                        <div className="text-xs text-gray-400 mt-0.5">
                                            {option.description}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 font-mono">
                                            Est. size: {option.estimatedSize}
                                        </div>
                                    </div>
                                </div>

                                {selectedFactor === option.factor && (
                                    <div className={`w-5 h-5 bg-${option.color}-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200`}>
                                        <div className="w-2 h-2 bg-white rounded-full" />
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900/50 border-t border-white/10 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 rounded-lg text-sm bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        Capture Snapshot{viewportCount > 1 ? 's' : ''}
                    </button>
                </div>
            </div>
        </div>
    );
};
