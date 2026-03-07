import { Plus, MoreVertical, Star, Clock } from 'lucide-react';

export const MyStructures = () => {
    // Mock data for now
    const structures = [
        { id: '1', name: 'GFP Complex', date: '2 hours ago', size: '1.2 MB', starred: true },
        { id: '2', name: 'SARS-CoV-2 Spike', date: 'Yesterday', size: '4.5 MB', starred: false },
        { id: '3', name: 'Hemoglobin', date: 'Last week', size: '800 KB', starred: true },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Structures</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage your uploaded PDB and CIF files.</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-fit">
                    <Plus className="w-4 h-4" />
                    Upload Structure
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {structures.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow group flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                                PDB
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-auto pt-4">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {item.date}
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                                <Star className={`w-3.5 h-3.5 cursor-pointer transition-colors ${item.starred ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-gray-400'}`} />
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State / Upload Card */}
                <button className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[160px]">
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">New Structure</span>
                </button>
            </div>
        </div>
    );
};
