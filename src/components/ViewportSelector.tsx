import React, { useState, useEffect } from 'react';
import { Check, Grid2X2 } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../lib/i18n';

interface ViewportSelectorProps {
    isOpen: boolean;
    viewMode: 'single' | 'dual' | 'triple' | 'quad';
    actionName: string; // e.g., "Take Snapshot", "Reset View"
    onConfirm: (selectedIndices: number[]) => void;
    onCancel: () => void;
}

export const ViewportSelector: React.FC<ViewportSelectorProps> = ({ isOpen, viewMode, actionName, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState<boolean[]>([true, true, true, true]); // Max 4

    // Reset selection when opening
    useEffect(() => {
        if (isOpen) {
            // Default to all selected based on active view count
            const count = viewMode === 'single' ? 1 : viewMode === 'dual' ? 2 : viewMode === 'triple' ? 3 : 4;
            const newSelection = [false, false, false, false];
            for (let i = 0; i < count; i++) newSelection[i] = true;
            setSelected(newSelection);
        }
    }, [isOpen, viewMode]);

    if (!isOpen) return null;

    const toggleViewport = (index: number) => {
        const newSelection = [...selected];
        newSelection[index] = !newSelection[index];
        setSelected(newSelection);
    };

    const handleConfirm = () => {
        const indices = selected.map((isSelected, idx) => isSelected ? idx : -1).filter(idx => idx !== -1);
        onConfirm(indices);
    };

    const toggleSelectAll = () => {
        const count = viewMode === 'single' ? 1 : viewMode === 'dual' ? 2 : viewMode === 'triple' ? 3 : 4;
        const allSelected = selected.slice(0, count).every(Boolean);
        const newSelection = [...selected];
        for (let i = 0; i < count; i++) newSelection[i] = !allSelected;
        setSelected(newSelection);
    };

    // Render visual grid based on viewMode
    const renderGrid = () => {
        const renderItem = (index: number, label: string, classes: string) => (
            <button
                key={index}
                onClick={() => toggleViewport(index)}
                className={clsx(
                    "relative flex items-center justify-center border-2 rounded-xl transition-all duration-200 overflow-hidden group",
                    classes,
                    selected[index]
                        ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                        : "border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/5"
                )}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <span className={clsx(
                    "font-bold font-mono z-10 transition-colors",
                    selected[index] ? "text-blue-400" : "text-gray-500"
                )}>
                    {label}
                </span>

                {selected[index] && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                        <Check size={12} className="text-white font-bold" />
                    </div>
                )}
            </button>
        );

        const gridClasses = "w-full aspect-video gap-2 p-2 bg-black/20 rounded-xl border border-white/5";

        switch (viewMode) {
            case 'dual':
                return (
                    <div className={clsx(gridClasses, "flex")}>
                        {renderItem(0, (t.vpViewport as (n: number) => string)(1), "w-1/2 h-full")}
                        {renderItem(1, (t.vpViewport as (n: number) => string)(2), "w-1/2 h-full")}
                    </div>
                );
            case 'triple':
                return (
                    <div className={clsx(gridClasses, "flex flex-col")}>
                        {renderItem(0, (t.vpViewport as (n: number) => string)(1), "w-full h-1/2")}
                        <div className="flex w-full h-1/2 gap-2 mt-2">
                            {renderItem(1, (t.vpViewport as (n: number) => string)(2), "w-1/2 h-full")}
                            {renderItem(2, (t.vpViewport as (n: number) => string)(3), "w-1/2 h-full")}
                        </div>
                    </div>
                );
            case 'quad':
                return (
                    <div className={clsx(gridClasses, "grid grid-cols-2 grid-rows-2")}>
                        {renderItem(0, (t.vpVP as (n: number) => string)(1), "w-full h-full")}
                        {renderItem(1, (t.vpVP as (n: number) => string)(2), "w-full h-full")}
                        {renderItem(2, (t.vpVP as (n: number) => string)(3), "w-full h-full")}
                        {renderItem(3, (t.vpVP as (n: number) => string)(4), "w-full h-full")}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-gray-900 to-black">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Grid2X2 className="text-blue-400" size={18} />
                        Select Viewports
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                        Which viewports do you want to <strong>{actionName}</strong>?
                    </p>
                </div>

                {/* Body */}
                <div className="p-6">
                    {renderGrid()}

                    <div className="mt-4 flex justify-between items-center">
                        <button
                            onClick={toggleSelectAll}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                            {selected.filter(Boolean).length === (viewMode === 'triple' ? 3 : viewMode === 'quad' ? 4 : 2) ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-xs text-gray-500">
                            {selected.filter(Boolean).length} selected
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-900/50 border-t border-white/10 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selected.some(Boolean)}
                        className="px-6 py-2 rounded-lg text-sm bg-blue-600 text-white font-bold hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                    >
                        Confirm Action
                    </button>
                </div>
            </div>
        </div>
    );
};
