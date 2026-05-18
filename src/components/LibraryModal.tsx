import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, Database, FlaskConical, Dna, Activity, Zap, Shield, Grid, Archive, Anchor, Layers, ArrowLeft, Syringe, Hexagon, Magnet, Pill, Leaf, Sun, Brain, HeartPulse, Puzzle } from 'lucide-react';
import clsx from 'clsx';
import { OFFLINE_LIBRARY } from '../data/library';
import { CHEMICAL_LIBRARY } from '../data/chemicalLibrary';
import { useTranslation } from '../lib/i18n';



// --- TYPES ---

interface LibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
}

// --- PROTEIN CATEGORY CONFIG ---
const PROTEIN_CATEGORY_CONFIG: Record<string, { icon: React.ReactNode, style: string, description: string }> = {
    'Enzymes': { icon: <Activity size={20} />, style: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 active-color:bg-amber-500', description: 'Biological catalysts speeding up reactions.' },
    'Structural': { icon: <Grid size={20} />, style: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 active-color:bg-blue-500', description: 'Scaffolding and shape-giving proteins.' },
    'Transport': { icon: <Archive size={20} />, style: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 active-color:bg-emerald-500', description: 'Ferries molecules across membranes/blood.' },
    'Signaling': { icon: <Zap size={20} />, style: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 active-color:bg-purple-500', description: 'Communication switches and receptors.' },
    'Viral': { icon: <FlaskConical size={20} />, style: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 active-color:bg-red-500', description: 'Viral capsids, spikes, and machinery.' },
    'DNA/RNA': { icon: <Dna size={20} />, style: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 active-color:bg-pink-500', description: 'Nucleic acid binding and manipulation.' },
    'Toxins': { icon: <Shield size={20} />, style: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 active-color:bg-orange-500', description: 'Poisons and defense molecules.' },
    'Synthetic': { icon: <Layers size={20} />, style: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 active-color:bg-cyan-500', description: 'Engineered or de-novo molecules.' },
    'Immune': { icon: <Shield size={20} />, style: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active-color:bg-rose-500', description: 'Antibodies and defense systems.' },
    'Energy': { icon: <Zap size={20} />, style: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 active-color:bg-yellow-500', description: 'Photosynthesis and metabolism.' },
    'Chaperone': { icon: <Anchor size={20} />, style: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 active-color:bg-indigo-500', description: 'Helpers for protein folding.' },
    'Antibodies': { icon: <Syringe size={20} />, style: 'text-teal-400 border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 active-color:bg-teal-500', description: 'Therapeutic and functional antibodies.' },
    'Nanobodies': { icon: <Hexagon size={20} />, style: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 active-color:bg-pink-500', description: 'Single-domain antibody fragments.' },
    'Binders': { icon: <Magnet size={20} />, style: 'text-violet-400 border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 active-color:bg-violet-500', description: 'Engineered binding proteins.' },
};

// --- CHEMICAL CATEGORY CONFIG ---
const CHEMICAL_CATEGORY_CONFIG: Record<string, { icon: React.ReactNode, style: string, description: string }> = {
    'Vitamins': { icon: <Sun size={20} />, style: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 active-color:bg-yellow-500', description: 'Essential organic nutrients.' },
    'Drugs': { icon: <Pill size={20} />, style: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 active-color:bg-blue-500', description: 'Pharmaceutical compounds.' },
    'Neurotransmitters': { icon: <Brain size={20} />, style: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 active-color:bg-purple-500', description: 'Brain signaling molecules.' },
    'Toxins': { icon: <Shield size={20} />, style: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 active-color:bg-red-500', description: 'Harmful natural substances.' },
    'Metabolites': { icon: <Activity size={20} />, style: 'text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20 active-color:bg-green-500', description: 'Intermediates of metabolism.' },
    'Hormones': { icon: <HeartPulse size={20} />, style: 'text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 active-color:bg-pink-500', description: 'Signaling molecules.' },
    'Calculated': { icon: <Database size={20} />, style: 'text-gray-400 border-gray-500/30 bg-gray-500/10 hover:bg-gray-500/20 active-color:bg-gray-500', description: 'Computational models.' },
    'Nutrients': { icon: <Leaf size={20} />, style: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 active-color:bg-emerald-500', description: 'Food components.' },
    'Natural Products': { icon: <Leaf size={20} />, style: 'text-lime-400 border-lime-500/30 bg-lime-500/10 hover:bg-lime-500/20 active-color:bg-lime-500', description: 'Compounds from nature.' },
    'Amino Acids': { icon: <Puzzle size={20} />, style: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 active-color:bg-indigo-500', description: 'Building blocks of proteins.' },
};

const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, onSelect }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'proteins' | 'chemicals'>('proteins');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
    const [viewMode, setViewMode] = useState<'categories' | 'list'>('categories');

    // Select Data Source
    const currentLibrary = useMemo(() => activeTab === 'proteins' ? OFFLINE_LIBRARY : CHEMICAL_LIBRARY, [activeTab]);
    const currentConfig = activeTab === 'proteins' ? PROTEIN_CATEGORY_CONFIG : CHEMICAL_CATEGORY_CONFIG;

    // Reset view on tab change
    const handleTabChange = (tab: 'proteins' | 'chemicals') => {
        setActiveTab(tab);
        setViewMode('categories');
        setSelectedCategory('All');
        setSearchTerm('');
    };


    // Extract unique categories
    const categories = useMemo(() => {
        const cats = new Set(currentLibrary.map(item => item.category));
        return Array.from(cats).sort();
    }, [currentLibrary]);

    // Filter items (Local Only)
    const filteredItems = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase().trim();
        return currentLibrary.filter(item => {
            // Category Filter
            if (selectedCategory !== 'All' && item.category !== selectedCategory) {
                return false;
            }

            // Search Filter
            if (!lowerTerm) return true;

            const searchableText = `${item.title} ${item.id} ${item.description}`.toLowerCase();
            return searchableText.includes(lowerTerm);
        });
    }, [searchTerm, selectedCategory, currentLibrary]);

    // Handle Category Selection
    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setViewMode('list');
        setSearchTerm(''); // Clear search when picking a category for purity
    };

    // Handle Back to Home
    const handleBack = () => {
        setViewMode('categories');
        setSelectedCategory('All');
        setSearchTerm('');
    };

    // Handle Search Input (Simple)
    const handleSearch = (term: string) => {
        setSearchTerm(term);
        // Switch to list view immediately on typing
        if (term.trim().length > 0 && viewMode === 'categories') {
            setViewMode('list');
            setSelectedCategory('All');
        }
    };

    // Handle Item Selection (Simple Local)
    const handleItemSelect = (item: any) => {
        if (activeTab === 'proteins') {
            onSelect(`models/${item.id}.pdb`);
        } else {
            // Pass special PubChem URL format that App.tsx will recognize
            onSelect(`pubchem://${item.id}`);
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-white/20 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER (Unchanged) */}
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-gray-900/50 gap-4 shrink-0">
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 shrink-0">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-white leading-tight">{t.libraryTitle as string}</h2>
                                <p className="text-gray-400 text-xs sm:text-sm">{t.librarySubtitle as string}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="sm:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* TABS */}
                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto shrink-0">
                        <button
                            onClick={() => handleTabChange('proteins')}
                            className={clsx(
                                "flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                activeTab === 'proteins' ? "bg-blue-500/20 text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <Dna size={16} />
                            {t.libraryProteins as string}
                        </button>
                        <button
                            onClick={() => handleTabChange('chemicals')}
                            className={clsx(
                                "flex-1 sm:flex-none px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap",
                                activeTab === 'chemicals' ? "bg-emerald-500/20 text-emerald-400 shadow-sm" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            <FlaskConical size={16} />
                            {t.libraryChemicals as string}
                        </button>


                    </div>

                    {/* Search Bar (Global) */}
                    <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-md hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text"
                            placeholder={activeTab === 'proteins' ? (t.librarySearchPlaceholder as string) : (t.librarySearchChemicals as string)}
                            value={searchTerm}

                            onChange={(e) => handleSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <button onClick={onClose} className="hidden sm:block p-2 ml-4 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white shrink-0">
                        <X size={24} />
                    </button>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent bg-gradient-to-br from-gray-900 via-gray-900 to-black">

                    {/* VIEW: CATEGORY DASHBOARD */}
                    {viewMode === 'categories' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in zoom-in-95 duration-300">
                            {categories.map(cat => {
                                const config = currentConfig[cat];
                                const count = currentLibrary.filter(i => i.category === cat).length;
                                // Fallback style if config missing
                                const style = config?.style || "text-gray-400 border-gray-500/30 bg-gray-500/10 hover:bg-gray-500/20 active-color:bg-gray-500";
                                const icon = config?.icon || <Database size={20} />;

                                return (
                                    <button
                                        key={cat}
                                        onClick={() => handleCategorySelect(cat)}
                                        className={clsx(
                                            "group relative flex flex-col items-start text-left p-5 sm:p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-xl overflow-hidden min-h-[140px]",
                                            style.replace(/active-color:[\w-]+/g, '').trim()
                                        )}
                                    >
                                        <div className={`absolute -right-4 -bottom-4 opacity-10 scale-[4] group-hover:scale-[4.5] transition-transform duration-500`}>
                                            {icon}
                                        </div>

                                        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10 shadow-inner group-hover:scale-110 transition-transform">
                                            {icon}
                                        </div>

                                        <h3 className="text-lg sm:text-xl font-bold mb-1">{cat}</h3>
                                        <p className="text-xs sm:text-sm opacity-70 mb-3 sm:mb-4 h-8 sm:h-10 line-clamp-2">{config?.description || 'Browse collection.'}</p>

                                        <div className="mt-auto py-1 px-3 rounded-full bg-black/20 text-[10px] sm:text-xs font-mono border border-white/10">
                                            {(t.libraryEntries as (n: number) => string)(count)}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* VIEW: LIST */}
                    {viewMode === 'list' && (
                        <div className="flex flex-col animate-in slide-in-from-right-4 duration-300">
                            {/* Sub-Header / Back */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 sticky top-0 z-20 bg-gray-900/95 backdrop-blur py-2 -mx-2 px-2 border-b border-white/5 sm:border-none sm:bg-transparent sm:py-0 sm:static">
                                <button
                                    onClick={handleBack}
                                    className="self-start flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 text-white border border-white/10 hover:bg-gray-700 transition-colors text-sm"
                                >
                                    <ArrowLeft size={14} />
                                    {t.libraryBackBtn as string}
                                </button>
                                {selectedCategory !== 'All' && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm">
                                        {currentConfig[selectedCategory]?.icon}
                                        <span className="font-bold">{selectedCategory}</span>
                                    </div>
                                )}
                            </div>

                            {/* RESULTS GRID */}
                            <div className="space-y-8">

                                {/* 1. LOCAL RESULTS */}
                                {filteredItems.length > 0 && (
                                    <div>
                                        {searchTerm && <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">{t.libraryCuratedSection as string}</h3>}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                                            {filteredItems.map(item => {
                                                const config = currentConfig[item.category];
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => handleItemSelect(item)}
                                                        className="group relative flex flex-col items-start text-left bg-gray-800/40 hover:bg-gray-800/80 border border-white/5 hover:border-white/20 rounded-xl p-4 transition-all hover:shadow-xl hover:-translate-y-1 overflow-hidden"
                                                    >
                                                        <div className={`absolute top-0 right-0 p-2 opacity-5 scale-150 transition-transform group-hover:scale-[2] group-hover:opacity-10 ${config?.style.split(' ')[0]}`}>
                                                            {config?.icon}
                                                        </div>

                                                        <div className="flex items-center justify-between w-full mb-3 z-10">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/40 text-blue-200 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                                                                {item.id}
                                                            </span>
                                                            <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium", config?.style.replace(/active-color:[\w-]+/g, '').trim())}>
                                                                {config?.icon}
                                                                {item.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-bold text-white mb-1 group-hover:text-blue-300 transition-colors text-sm leading-snug w-full" title={item.title}>
                                                            {item.title}
                                                        </h3>
                                                        <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed h-8 w-full">
                                                            {item.description}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* NO RESULTS STATE */}
                                {filteredItems.length === 0 && (
                                    <div className="text-center py-20 text-gray-500">
                                        <Database size={48} className="mx-auto mb-4 opacity-50" />
                                        <p className="text-lg">{(t.libraryNoResults as (term: string) => string)(searchTerm)}</p>
                                        <p className="text-sm opacity-60">{t.libraryNoResultsHint as string}</p>
                                    </div>
                                )}

                            </div>

                        </div>
                    )}




                </div>

                {/* FOOTER */}
                <div className="p-3 sm:p-4 border-t border-white/10 bg-gray-950 text-right text-[10px] sm:text-xs text-gray-500 font-mono shrink-0 z-30">
                    Library v2.0 • {OFFLINE_LIBRARY.length} offline
                </div>
            </div>
        </div>
    );
};

export default LibraryModal;
