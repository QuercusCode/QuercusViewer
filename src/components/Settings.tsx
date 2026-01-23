
import { X, Check } from 'lucide-react';

interface SettingsProps {
    isLightMode: boolean;
    setIsLightMode: (v: boolean) => void;
    quality: string;
    setQuality: (v: 'low' | 'medium' | 'high') => void;
    ssao: boolean;
    setSsao: (v: boolean) => void;
    visualizerEngine: 'ngl' | 'molstar';
    setVisualizerEngine: (v: 'ngl' | 'molstar') => void;
    isOpen: boolean;
    onClose: () => void;
}

export function Settings({
    isLightMode, setIsLightMode,
    quality, setQuality,
    ssao, setSsao,
    visualizerEngine, setVisualizerEngine,
    isOpen, onClose
}: SettingsProps) {

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white' : 'bg-neutral-900';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-neutral-200' : 'border-neutral-800';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className={`w-full max-w-md rounded-xl shadow-2xl ${bgColor} ${textColor} border ${borderColor} overflow-hidden font-sans`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`flex items-center justify-between p-4 border-b ${borderColor}`}>
                    <h2 className="text-lg font-bold">Settings</h2>
                    <button onClick={onClose} className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Visualizer Engine */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold opacity-70 uppercase tracking-wide">Rendering Engine</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {['ngl', 'molstar'].map((engine) => (
                                <button
                                    key={engine}
                                    onClick={() => setVisualizerEngine(engine as any)}
                                    className={`relative px-4 py-3 rounded-lg border text-sm font-medium transition-all ${visualizerEngine === engine
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                        : `bg-transparent ${borderColor} opacity-60 hover:opacity-100 hover:bg-neutral-100/10`
                                        }`}
                                >
                                    {engine === 'ngl' ? 'NGL Viewer' : 'Mol* Viewer'}
                                    {visualizerEngine === engine && (
                                        <div className="absolute top-1 right-1">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs opacity-50">
                            Switch between the NGL viewer (Legacy) and Mol* (Advanced).
                        </p>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* Theme */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold opacity-70 uppercase tracking-wide">Appearance</h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Dark Mode</span>
                            <button
                                onClick={() => setIsLightMode(!isLightMode)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${!isLightMode ? 'bg-blue-600' : 'bg-neutral-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${!isLightMode ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>

                    <hr className={`border-t ${borderColor}`} />


                    {/* Graphics */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold opacity-70 uppercase tracking-wide">Graphics Quality</h3>

                        <div className="grid grid-cols-3 gap-2">
                            {['low', 'medium', 'high'].map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q as any)}
                                    className={`px-3 py-2 text-xs font-semibold uppercase rounded border ${quality === q
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : `${borderColor} hover:bg-neutral-100 dark:hover:bg-neutral-800`
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center justify-between cursor-pointer pt-2">
                            <span className="text-sm">Ambient Occlusion (SSAO)</span>
                            <input
                                type="checkbox"
                                checked={ssao}
                                onChange={e => setSsao(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 bg-opacity-5 ${isLightMode ? 'bg-black' : 'bg-white'} text-xs text-center opacity-50`}>
                    Protein Viewer v2.0
                </div>

            </div>
        </div>
    );
}
