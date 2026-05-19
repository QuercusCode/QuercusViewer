import React, { useState } from 'react';
import { X, Image as ImageIcon, Check, Camera } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../lib/i18n';

interface ScreenshotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (resolutionFactor: number, transparent: boolean) => void;
    isLightMode: boolean;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ isOpen, onClose, onCapture, isLightMode }) => {
    const { t } = useTranslation();
    const [resolution, setResolution] = useState<1 | 2 | 4 | 8>(4); // Default to High (4x)
    const [transparent, setTransparent] = useState(true);

    if (!isOpen) return null;

    const resolutions = [
        { factor: 1, label: t.screenshotStandardLabel as string, desc: t.screenshotStandardDesc as string },
        { factor: 2, label: t.screenshotHighLabel as string, desc: t.screenshotHighDesc as string },
        { factor: 4, label: t.screenshotUltraLabel as string, desc: t.screenshotUltraDesc as string },
        { factor: 8, label: t.screenshotExtremeLabel as string, desc: t.screenshotExtremeDesc as string },
    ];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={clsx(
                "w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border transition-all transform animate-in zoom-in-95 duration-200",
                isLightMode ? "bg-white border-neutral-200" : "bg-neutral-900 border-neutral-800"
            )}>
                {/* Header */}
                <div className={clsx(
                    "flex items-center justify-between p-4 border-b",
                    isLightMode ? "bg-neutral-50 border-neutral-200" : "bg-neutral-800/50 border-neutral-800"
                )}>
                    <div className="flex items-center gap-2">
                        <ImageIcon className={clsx("w-5 h-5", isLightMode ? "text-blue-600" : "text-blue-400")} />
                        <h3 className={clsx("font-bold", isLightMode ? "text-neutral-900" : "text-white")}>{t.screenshotTitle as string}</h3>
                    </div>
                    <button onClick={onClose} className={clsx("p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors", isLightMode ? "text-neutral-500" : "text-neutral-400")}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Resolution Selector */}
                    <div className="space-y-3">
                        <label className={clsx("text-xs font-bold uppercase tracking-wider", isLightMode ? "text-neutral-500" : "text-neutral-400")}>
                            {t.screenshotResolution as string}
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {resolutions.map((res) => (
                                <button
                                    key={res.factor}
                                    onClick={() => setResolution(res.factor as any)}
                                    className={clsx(
                                        "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                                        resolution === res.factor
                                            ? (isLightMode ? "bg-blue-50 border-blue-200 ring-1 ring-blue-500" : "bg-blue-500/20 border-blue-500/50 ring-1 ring-blue-500")
                                            : (isLightMode ? "bg-white border-neutral-200 hover:border-blue-300" : "bg-neutral-800 border-neutral-700 hover:border-neutral-600")
                                    )}
                                >
                                    <div>
                                        <div className={clsx("font-bold text-sm", isLightMode ? "text-neutral-900" : "text-white")}>{res.label}</div>
                                        <div className={clsx("text-xs", isLightMode ? "text-neutral-500" : "text-neutral-400")}>{res.desc}</div>
                                    </div>
                                    {resolution === res.factor && (
                                        <div className={clsx("p-1 rounded-full", isLightMode ? "bg-blue-100 text-blue-600" : "bg-blue-500 text-white")}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Transparency Toggle */}
                    <div className="space-y-3">
                        <label className={clsx("text-xs font-bold uppercase tracking-wider", isLightMode ? "text-neutral-500" : "text-neutral-400")}>
                            {t.snapBackground as string}
                        </label>
                        <button
                            onClick={() => setTransparent(!transparent)}
                            className={clsx(
                                "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                                transparent
                                    ? (isLightMode ? "bg-purple-50 border-purple-200 ring-1 ring-purple-500" : "bg-purple-500/20 border-purple-500/50 ring-1 ring-purple-500")
                                    : (isLightMode ? "bg-white border-neutral-200 hover:border-neutral-300" : "bg-neutral-800 border-neutral-700 hover:border-neutral-600")
                            )}
                        >
                            <div className="text-left">
                                <div className={clsx("font-bold text-sm", isLightMode ? "text-neutral-900" : "text-white")}>{t.embedTransparentBg as string}</div>
                                <div className={clsx("text-xs", isLightMode ? "text-neutral-500" : "text-neutral-400")}>{t.screenshotTransparentDesc as string}</div>
                            </div>
                            <div className={clsx(
                                "w-10 h-6 rounded-full p-1 transition-colors",
                                transparent ? "bg-purple-500" : "bg-neutral-300 dark:bg-neutral-600"
                            )}>
                                <div className={clsx(
                                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform",
                                    transparent ? "translate-x-4" : "translate-x-0"
                                )} />
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className={clsx(
                    "p-4 border-t flex justify-end gap-3",
                    isLightMode ? "bg-neutral-50 border-neutral-200" : "bg-neutral-800/50 border-neutral-800"
                )}>
                    <button
                        onClick={onClose}
                        className={clsx(
                            "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                            isLightMode ? "text-neutral-600 hover:bg-neutral-200" : "text-neutral-400 hover:bg-white/10"
                        )}
                    >
                        {t.cancelBtn as string}
                    </button>
                    <button
                        onClick={() => {
                            onCapture(resolution, transparent);
                            onClose();
                        }}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Camera className="w-4 h-4" />
                        {t.screenshotSaveToGallery as string}
                    </button>
                </div>
            </div>
        </div>
    );
};
