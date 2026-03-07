import { Play, Calendar, Video } from 'lucide-react';

export const StudioDrafts = () => {
    const drafts = [
        { id: '1', title: 'Viral Entry Animation', duration: '0:45', date: 'Yesterday', poster: 'bg-blue-100' },
        { id: '2', title: 'Subunit Rotation', duration: '1:12', date: 'Last week', poster: 'bg-green-100' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Studio Drafts</h1>
                <p className="text-sm text-gray-500 mt-1">Your saved video timelines and animations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts.map((draft) => (
                    <div key={draft.id} className="bg-white border flex flex-col border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                        {/* Mock Thumbnail */}
                        <div className={`h-40 ${draft.poster} flex items-center justify-center relative`}>
                            <button className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm text-gray-900 transform scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all">
                                <Play className="w-4 h-4 ml-1" />
                            </button>
                            <div className="absolute bottom-2 right-2 bg-gray-900/70 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                                {draft.duration}
                            </div>
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{draft.title}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-auto pt-2">
                                <Calendar className="w-3.5 h-3.5" />
                                {draft.date}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                <button className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[240px]">
                    <Video className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">New Animation</span>
                    <span className="text-xs mt-1 px-4 text-center">Open Studio Mode to create a new draft</span>
                </button>
            </div>
        </div>
    );
};
