
import { X, Check } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

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
    const { t } = useTranslation();

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white/90 backdrop-blur-xl' : 'bg-[#0a0a0a]/90 backdrop-blur-xl';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-white/40' : 'border-white/10';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className={`w-full max-w-md rounded-2xl shadow-2xl ${bgColor} ${textColor} border ${borderColor} overflow-hidden font-sans scale-100 transition-transform`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b ${borderColor} ${isLightMode ? 'bg-gradient-to-r from-blue-50/50 to-transparent' : 'bg-gradient-to-r from-neutral-900 to-black'}`}>
                    <h2 className="text-lg font-bold tracking-tight">{t.settingsTitle as string}</h2>
                    <button onClick={onClose} className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-all ${isLightMode ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Visualizer Engine */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">{t.renderingEngine as string}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {['ngl', 'molstar'].map((engine) => (
                                <button
                                    key={engine}
                                    onClick={() => setVisualizerEngine(engine as any)}
                                    className={`relative px-4 py-3.5 rounded-xl border text-sm font-bold transition-all duration-200 ${visualizerEngine === engine
                                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-500 text-white shadow-lg shadow-blue-900/20 scale-[1.02]'
                                        : `bg-transparent ${borderColor} opacity-70 hover:opacity-100 hover:bg-neutral-500/5`
                                        }`}
                                >
                                    {engine === 'ngl' ? 'NGL Viewer' : 'Mol* Viewer'}
                                    {visualizerEngine === engine && (
                                        <div className="absolute top-2 right-2 bg-white/20 p-0.5 rounded-full">
                                            <Check className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs opacity-50 pl-1">
                            {t.renderingEngineDesc as string}
                        </p>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* Theme */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">{t.sectionAppearance as string}</h3>
                        <div className="flex items-center justify-between p-1">
                            <span className="text-sm font-medium">{t.darkMode as string}</span>
                            <button
                                onClick={() => setIsLightMode(!isLightMode)}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${!isLightMode ? 'bg-indigo-600' : 'bg-neutral-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${!isLightMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* Graphics */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">{t.graphicsQuality as string}</h3>

                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as const).map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`px-3 py-2.5 text-xs font-bold uppercase rounded-lg border transition-all ${quality === q
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-md transform scale-105'
                                        : `${borderColor} hover:bg-neutral-500/5 opacity-70 hover:opacity-100`
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center justify-between cursor-pointer pt-2 p-1 hover:opacity-80 transition-opacity">
                            <span className="text-sm font-medium">{t.ambientOcclusion as string}</span>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${ssao ? 'bg-blue-600 border-blue-600' : 'border-neutral-500'}`}>
                                {ssao && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                checked={ssao}
                                onChange={e => setSsao(e.target.checked)}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${borderColor} ${isLightMode ? 'bg-neutral-50/50' : 'bg-black/30'} text-[10px] text-center opacity-40 uppercase tracking-wider font-mono`}>
                    Quercus Viewer v2.0
                </div>

            </div>
        </div>
    );
}
