import { X, Check } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import i18next from 'i18next';

interface SettingsProps {
    isLightMode: boolean;
    setIsLightMode: (v: boolean) => void;
    quality: string;
    setQuality: (v: 'low' | 'medium' | 'high') => void;
    ssao: boolean;
    setSsao: (v: boolean) => void;
    visualizerEngine: 'ngl' | 'molstar';
    setVisualizerEngine: (v: 'ngl' | 'molstar') => void;
    isTeachingMode: boolean;
    setIsTeachingMode: (v: boolean) => void;
    isOpen: boolean;
    onClose: () => void;
    uiScale: 'small' | 'medium' | 'large';
    setUiScale: (v: 'small' | 'medium' | 'large') => void;
    autoHideHUD: boolean;
    setAutoHideHUD: (v: boolean) => void;
    reducedMotion: boolean;
    setReducedMotion: (v: boolean) => void;
    visualAccessibility: string;
    setVisualAccessibility: (v: string) => void;
    onUpdateDefaultStyle: (style: string) => void;
    onUpdateDefaultColor: (color: string) => void;
}

export function Settings({
    isLightMode, setIsLightMode,
    quality, setQuality,
    ssao, setSsao,
    visualizerEngine, setVisualizerEngine,
    isTeachingMode, setIsTeachingMode,
    isOpen, onClose,
    uiScale, setUiScale,
    autoHideHUD, setAutoHideHUD,
    reducedMotion, setReducedMotion,
    visualAccessibility, setVisualAccessibility,
    onUpdateDefaultStyle, onUpdateDefaultColor
}: SettingsProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white/90 backdrop-blur-xl' : 'bg-[#0a0a0a]/90 backdrop-blur-xl';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-neutral-200' : 'border-neutral-800';
    const inputBg = isLightMode ? 'bg-neutral-100' : 'bg-neutral-900';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${bgColor} ${textColor} border ${borderColor} font-sans scale-100 transition-transform no-scrollbar`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`flex items-center justify-between p-5 border-b ${borderColor} ${isLightMode ? 'bg-gradient-to-r from-blue-50/50 to-transparent' : 'bg-gradient-to-r from-neutral-900 to-black'} sticky top-0 z-10 backdrop-blur-xl`}>
                    <h2 className="text-lg font-bold tracking-tight">{t.settingsTitle as string}</h2>
                    <button onClick={onClose} className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-all ${isLightMode ? 'hover:bg-black/5' : 'hover:bg-white/10'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-8">

                    {/* GENERAL */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">General</h3>
                        
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium pl-1">Language</span>
                            <select 
                                value={(i18next.language || 'en').slice(0, 2)} 
                                onChange={(e) => i18next.changeLanguage(e.target.value)}
                                className={`w-full p-2.5 rounded-xl border ${borderColor} ${inputBg} text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none`}
                            >
                                <option value="en">English (US)</option>
                                <option value="es">Spanish (ES)</option>
                                <option value="fr">French (FR)</option>
                                <option value="de">German (DE)</option>
                                <option value="pt">Portuguese (PT)</option>
                                <option value="hi">Hindi (HI)</option>
                                <option value="zh">Chinese (ZH)</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium pl-1">Default Startup Style</span>
                            <select 
                                defaultValue={localStorage.getItem('defaultMoleculeStyle') || 'cartoon'} 
                                onChange={(e) => {
                                    localStorage.setItem('defaultMoleculeStyle', e.target.value);
                                    onUpdateDefaultStyle(e.target.value);
                                }}
                                className={`w-full p-2.5 rounded-xl border ${borderColor} ${inputBg} text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none`}
                            >
                                <option value="cartoon">Cartoon</option>
                                <option value="ribbon">Ribbon</option>
                                <option value="ball+stick">Ball + Stick</option>
                                <option value="spacefill">Spacefill</option>
                                <option value="surface">Surface</option>
                                <option value="line">Line</option>
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium pl-1">Default Startup Color</span>
                            <select 
                                defaultValue={localStorage.getItem('defaultColorScheme') || 'chainid'} 
                                onChange={(e) => {
                                    localStorage.setItem('defaultColorScheme', e.target.value);
                                    onUpdateDefaultColor(e.target.value);
                                }}
                                className={`w-full p-2.5 rounded-xl border ${borderColor} ${inputBg} text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none`}
                            >
                                <option value="chainid">By Chain ID</option>
                                <option value="residue">By Residue</option>
                                <option value="secondary">By Secondary Structure</option>
                                <option value="hydrophobicity">By Hydrophobicity</option>
                                <option value="structure">By Structure</option>
                                <option value="element">By Element</option>
                            </select>
                        </div>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* APPEARANCE */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">{t.sectionAppearance as string}</h3>
                        
                        <div className="flex items-center justify-between p-1">
                            <span className="text-sm font-medium">{t.darkMode as string}</span>
                            <button
                                onClick={() => setIsLightMode(!isLightMode)}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${!isLightMode ? 'bg-blue-600' : 'bg-neutral-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${!isLightMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-1">
                            <span className="text-sm font-medium">Teaching Mode</span>
                            <button
                                onClick={() => setIsTeachingMode(!isTeachingMode)}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${isTeachingMode ? 'bg-blue-600' : 'bg-neutral-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${isTeachingMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-1">
                            <span className="text-sm font-medium">Auto-Hide HUD</span>
                            <button
                                onClick={() => {
                                    setAutoHideHUD(!autoHideHUD);
                                    localStorage.setItem('autoHideHUD', String(!autoHideHUD));
                                }}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${autoHideHUD ? 'bg-blue-600' : 'bg-neutral-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${autoHideHUD ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2">
                            <span className="text-sm font-medium pl-1">UI Scale</span>
                            <div className="grid grid-cols-3 gap-2">
                                {(['small', 'medium', 'large'] as const).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => {
                                            setUiScale(s);
                                            localStorage.setItem('uiScale', s);
                                        }}
                                        className={`px-3 py-2 text-xs font-bold uppercase rounded-xl border transition-all ${uiScale === s
                                            ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                            : `${borderColor} ${inputBg} opacity-70 hover:opacity-100`
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* ACCESSIBILITY */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">Accessibility</h3>

                        <div className="flex items-center justify-between p-1">
                            <span className="text-sm font-medium">Reduced Motion</span>
                            <button
                                onClick={() => {
                                    setReducedMotion(!reducedMotion);
                                    localStorage.setItem('reducedMotion', String(!reducedMotion));
                                }}
                                className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${reducedMotion ? 'bg-blue-600' : 'bg-neutral-200'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${reducedMotion ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 pt-2">
                            <span className="text-sm font-medium pl-1">Visual Profile</span>
                            <select 
                                value={visualAccessibility}
                                onChange={(e) => {
                                    setVisualAccessibility(e.target.value);
                                    localStorage.setItem('visualAccessibility', e.target.value);
                                }}
                                className={`w-full p-2.5 rounded-xl border ${borderColor} ${inputBg} text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none`}
                            >
                                <option value="none">Standard</option>
                                <option value="high-contrast">High Contrast</option>
                                <option value="protanopia">Protanopia (Red-blind)</option>
                                <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                                <option value="tritanopia">Tritanopia (Blue-blind)</option>
                                <option value="achromatopsia">Achromatopsia (Monochromacy)</option>
                            </select>
                        </div>
                    </div>

                    <hr className={`border-t ${borderColor}`} />

                    {/* GRAPHICS ENGINE */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold opacity-60 uppercase tracking-widest pl-1">{t.renderingEngine as string}</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {['ngl', 'molstar'].map((engine) => (
                                <button
                                    key={engine}
                                    onClick={() => setVisualizerEngine(engine as any)}
                                    className={`relative px-4 py-3 rounded-xl border text-sm font-bold transition-all duration-200 ${visualizerEngine === engine
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                        : `${inputBg} ${borderColor} opacity-70 hover:opacity-100`
                                        }`}
                                >
                                    {engine === 'ngl' ? 'NGL Viewer' : 'Mol* Viewer'}
                                    {visualizerEngine === engine && (
                                        <div className="absolute top-1.5 right-1.5 bg-white/20 p-0.5 rounded-full">
                                            <Check className="w-2.5 h-2.5" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs opacity-50 pl-1 pb-2">
                            {t.renderingEngineDesc as string}
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                            {(['low', 'medium', 'high'] as const).map(q => (
                                <button
                                    key={q}
                                    onClick={() => setQuality(q)}
                                    className={`px-3 py-2 text-xs font-bold uppercase rounded-xl border transition-all ${quality === q
                                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                        : `${borderColor} ${inputBg} hover:opacity-100 opacity-70`
                                        }`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center justify-between cursor-pointer p-1 hover:opacity-80 transition-opacity">
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
