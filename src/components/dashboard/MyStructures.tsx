import { useState } from 'react';
import { Plus, MoreVertical, Star, Clock, Search, Upload, Dna } from 'lucide-react';

const mockStructures = [
    { id: '1', name: 'GFP Complex', date: '2 hours ago', fileType: 'PDB', starred: true, atoms: '3,214' },
    { id: '2', name: 'SARS-CoV-2 Spike', date: 'Yesterday', fileType: 'CIF', starred: false, atoms: '18,901' },
    { id: '3', name: 'Hemoglobin', date: 'Last week', fileType: 'PDB', starred: true, atoms: '4,550' },
];

export const MyStructures = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [starred, setStarred] = useState<Set<string>>(new Set(mockStructures.filter(s => s.starred).map(s => s.id)));

    const filtered = mockStructures.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleStar = (id: string) => {
        setStarred(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-white tracking-tight">My Structures</h1>
                    <p className="text-sm text-neutral-500 mt-0.5">{mockStructures.length} structures in your library</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm w-fit">
                    <Upload className="w-4 h-4" />
                    Upload Structure
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Filter structures..."
                        className="w-full pl-9 pr-3 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400 bg-neutral-900 border border-neutral-700 rounded-lg hover:text-amber-400 hover:border-amber-400/50 transition-all">
                    <Star className="w-4 h-4" />
                    Starred
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((item) => (
                    <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-all group flex flex-col cursor-pointer">
                        <div className="flex items-start justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                    <Dna className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{item.fileType}</span>
                                </div>
                            </div>
                            <button className="text-neutral-600 hover:text-neutral-300 p-1 opacity-0 group-hover:opacity-100 transition-all">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="font-semibold text-neutral-100 mb-1 line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-neutral-500 mb-4">{item.atoms} atoms</p>

                        <div className="flex items-center gap-3 text-xs text-neutral-600 mt-auto pt-4 border-t border-neutral-800">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {item.date}
                            </div>
                            <div className="ml-auto">
                                <button onClick={(e) => { e.stopPropagation(); toggleStar(item.id); }}>
                                    <Star className={`w-4 h-4 transition-all ${starred.has(item.id) ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 hover:text-neutral-400'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Upload Card */}
                <button className="border-2 border-dashed border-neutral-800 rounded-xl p-5 flex flex-col items-center justify-center text-neutral-600 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all min-h-[180px] group">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-blue-500/10 flex items-center justify-center mb-3 transition-colors">
                        <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium">Upload New Structure</span>
                    <span className="text-xs mt-1 text-neutral-700 group-hover:text-neutral-500 transition-colors">.pdb, .cif, .mmcif</span>
                </button>
            </div>
        </div>
    );
};
