
import React from 'react';
import { UploadCloud } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface DragDropOverlayProps {
    isDragging: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isDragging }) => {
    const { t } = useTranslation();
    if (!isDragging) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-opacity duration-300">
            <div className="bg-neutral-900/80 border-4 border-dashed border-blue-500 rounded-3xl p-12 flex flex-col items-center gap-6 animate-pulse shadow-2xl">
                <div className="p-6 bg-blue-500/20 rounded-full">
                    <UploadCloud size={64} className="text-blue-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">{t.dropToLoad as string}</h2>
                    <p className="text-neutral-400 text-lg">{t.dropToLoadDesc as string}</p>
                </div>
            </div>
        </div>
    );
};
