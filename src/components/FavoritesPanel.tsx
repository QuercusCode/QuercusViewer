import React, { useState } from 'react';
import { Star, Trash2, X, Clock, History } from 'lucide-react';
import type { Favorite } from '../hooks/useFavorites';
import type { HistoryItem } from '../hooks/useHistory';

import { type DataSource } from '../utils/pdbUtils';
import { useTimezone, formatDate } from '../lib/timezoneUtils';
import { useTranslation } from '../lib/i18n';

interface FavoritesPanelProps {
    favorites: Favorite[];
    history?: HistoryItem[];
    isOpen: boolean;

    initialTab?: 'favorites' | 'history';
    showTabs?: boolean;
    onClose: () => void;
    onSelect: (id: string, dataSource: DataSource) => void;
    onRemove: (id: string, dataSource: DataSource) => void;
    isLightMode: boolean;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
    favorites,
    history = [],
    isOpen,
    onClose,
    onSelect,
    onRemove,
    isLightMode,

    initialTab = 'favorites',
    showTabs = true,
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'favorites' | 'history'>(initialTab);
    const timezone = useTimezone();

    // Sync active tab with prop (for external switching)
    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    if (!isOpen) return null;

    const bgColor = isLightMode ? 'bg-white/95' : 'bg-black/95';
    const textColor = isLightMode ? 'text-neutral-900' : 'text-white';
    const borderColor = isLightMode ? 'border-neutral-200' : 'border-white/10';
    const hoverBg = isLightMode ? 'hover:bg-neutral-100' : 'hover:bg-white/5';
    const subtleText = isLightMode ? 'text-neutral-500' : 'text-neutral-400';

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl border ${bgColor} ${borderColor} backdrop-blur-xl z-50 flex flex-col overflow-hidden`}>

                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b ${borderColor}`}>
                    {showTabs ? (
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveTab('favorites')}
                                className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${activeTab === 'favorites'
                                    ? `border-yellow-500 ${textColor}`
                                    : 'border-transparent text-neutral-500 hover:text-neutral-400'
                                    }`}
                            >
                                <Star className={`w-5 h-5 ${activeTab === 'favorites' ? 'text-yellow-500 fill-yellow-500' : ''}`} />
                                <h2 className="text-lg font-bold">{t.favoritesTitle as string}</h2>
                                <span className="text-xs opacity-60">({favorites.length})</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-2 pb-1 border-b-2 transition-all ${activeTab === 'history'
                                    ? `border-blue-500 ${textColor}`
                                    : 'border-transparent text-neutral-500 hover:text-neutral-400'
                                    }`}
                            >
                                <History className={`w-5 h-5 ${activeTab === 'history' ? 'text-blue-500' : ''}`} />
                                <h2 className="text-lg font-bold">{t.historyTitle as string}</h2>
                                <span className="text-xs opacity-60">({history.length})</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-4 items-center">
                            {activeTab === 'favorites' ? (
                                <div className={`flex items-center gap-2 pb-1 border-b-2 border-transparent ${textColor}`}>
                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    <h2 className="text-lg font-bold">{t.favoritesTitle as string}</h2>
                                    <span className="text-xs opacity-60">({favorites.length})</span>
                                </div>
                            ) : (
                                <div className={`flex items-center gap-2 pb-1 border-b-2 border-transparent ${textColor}`}>
                                    <History className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-lg font-bold">{t.historyTitle as string}</h2>
                                    <span className="text-xs opacity-60">({history.length})</span>
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-lg transition-colors ${hoverBg}`}
                    >
                        <X className={`w-5 h-5 ${textColor}`} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'favorites' ? (
                        favorites.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12">
                                <Star className={`w-16 h-16 mb-4 opacity-20`} />
                                <p className={`text-center ${subtleText}`}>
                                    {t.noFavorites as string}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {favorites.map((fav) => (
                                    <div
                                        key={`${fav.dataSource}-${fav.id}`}
                                        className={`flex items-center justify-between p-4 rounded-lg border ${borderColor} ${hoverBg} transition-all group`}
                                    >
                                        <button
                                            onClick={() => onSelect(fav.id, fav.dataSource)}
                                            className="flex-1 flex items-center gap-4 text-left"
                                        >
                                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium ${textColor} truncate`}>
                                                    {fav.title || fav.id}
                                                </div>
                                                <div className={`text-sm ${subtleText}`}>
                                                    {fav.dataSource === 'pdb' ? 'PDB' : fav.dataSource === 'alphafold' ? 'AlphaFold' : 'PubChem'}: {fav.id}
                                                    {' • '}
                                                    {formatDate(new Date(fav.addedAt), timezone)}
                                                </div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(fav.id, fav.dataSource);
                                            }}
                                            className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${isLightMode ? 'hover:bg-red-100 text-red-600' : 'hover:bg-red-950/50 text-red-400'}`}
                                            title={t.removeFromFavorites as string}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12">
                                <Clock className={`w-16 h-16 mb-4 opacity-20`} />
                                <p className={`text-center ${subtleText}`}>
                                    {t.noHistory as string}
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {history.map((item) => (
                                    <div
                                        key={`${item.dataSource}-${item.id}-${item.timestamp}`}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${borderColor} ${hoverBg} transition-all group`}
                                    >
                                        <button
                                            onClick={() => onSelect(item.id, item.dataSource)}
                                            className="flex-1 flex items-center gap-4 text-left"
                                        >
                                            <Clock className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-mono font-medium ${textColor}`}>
                                                    {item.id}
                                                </div>
                                                <div className={`text-xs ${subtleText} flex items-center gap-2`}>
                                                    <span className={`px-1.5 rounded ${isLightMode ? 'bg-neutral-200' : 'bg-neutral-800'}`}>
                                                        {item.dataSource === 'pdb' ? 'PDB' : item.dataSource === 'alphafold' ? 'AF DB' : 'CHEM'}
                                                    </span>
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </>
    );
};
