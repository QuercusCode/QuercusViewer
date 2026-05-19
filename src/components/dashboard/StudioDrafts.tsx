import { Play, Calendar, Film, Plus, Clock } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

const mockDrafts = [
    { id: '1', title: 'Viral Entry Animation', duration: '0:45', date: 'Yesterday', frames: '540', color: 'from-blue-600 to-violet-600' },
    { id: '2', title: 'Subunit Rotation', duration: '1:12', date: 'Last week', frames: '864', color: 'from-teal-600 to-blue-600' },
];

export const StudioDrafts = () => {
    const { t } = useTranslation();
    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">{t.studioDrafts as string}</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">{t.studioDraftsSubtitle as string}</p>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockDrafts.map((draft) => (
                    <div key={draft.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition-all group flex flex-col cursor-pointer">
                        {/* Thumbnail */}
                        <div className={`h-40 bg-gradient-to-br ${draft.color} flex items-center justify-center relative overflow-hidden`}>
                            {/* Grid overlay */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
                                backgroundSize: '24px 24px'
                            }} />
                            <button className="h-11 w-11 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg text-white transform scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all border border-white/20">
                                <Play className="w-4 h-4 ml-0.5" />
                            </button>
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium border border-white/10">
                                {draft.duration}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-neutral-100 mb-1">{draft.title}</h3>
                            <p className="text-xs text-neutral-500 mb-3">{(t.studioFrames as (n: string | number) => string)(draft.frames)}</p>
                            <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-auto pt-3 border-t border-neutral-800">
                                <Calendar className="w-3.5 h-3.5" />
                                {draft.date}
                                <div className="ml-auto flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {draft.duration}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Create New Card */}
                <button className="border-2 border-dashed border-neutral-800 rounded-xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[280px] group">
                    <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                        <Film className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">{t.studioNewAnimation as string}</span>
                    <span className="text-xs mt-2 text-neutral-700 group-hover:text-neutral-500 transition-colors px-6 text-center">{t.studioNewAnimationDesc as string}</span>
                    <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5" />
                        {t.studioGoToViewer as string}
                    </div>
                </button>
            </div>
        </div>
    );
};
