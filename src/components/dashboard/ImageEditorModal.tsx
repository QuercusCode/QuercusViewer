import React from 'react';
import { X } from 'lucide-react';

interface ImageEditorModalProps {
  src: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-6xl bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
        {/* Header Overlay (Close button) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[110] p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md border border-white/10 transition-all hover:scale-110"
          title="Close Editor"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center text-white p-8 text-center">
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10 max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Image Editor Temporarily Unavailable</h2>
            <p className="text-gray-400 mb-6">
              We've identified a compatibility issue between the image editor and the latest React 19 update. 
              The team is working on a fix to restore this feature.
            </p>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
            >
              Back to Lab Notebook
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
