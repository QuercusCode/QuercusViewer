import React, { useMemo } from 'react';
import FilerobotImageEditor from 'filerobot-image-editor';
import { X } from 'lucide-react';
import { uploadNotebookImage } from '../../lib/notebookService';
import { useAuth } from '../../lib/AuthContext';

interface ImageEditorModalProps {
  src: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ src, onSave, onClose }) => {
  const { user } = useAuth();

  const config = useMemo(() => ({
    source: src,
    onBeforeSave: () => false, // Prevent default download
    onSave: async (imageInfo: any) => {
      if (!user) return;
      
      try {
        // Convert the edited image to a File object
        const response = await fetch(imageInfo.imageBase64);
        const blob = await response.blob();
        const file = new File([blob], 'edited_image.png', { type: 'image/png' });

        // Upload to Supabase
        const newUrl = await uploadNotebookImage(user.id, file);
        onSave(newUrl);
      } catch (error) {
        console.error('Failed to save edited image:', error);
        alert('Failed to save the edited image. Please try again.');
      }
    },
    annotationsCommon: {
      fill: '#ff0000',
    },
    Text: { text: 'Type here...' },
    theme: {
      palette: {
        'bg-primary': '#111827',
        'bg-secondary': '#1f2937',
        'accent-primary': '#3b82f6',
        'accent-primary-hover': '#2563eb',
        'text-primary': '#f3f4f6',
        'text-secondary': '#9ca3af',
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
      }
    },
    tabsIds: [
      'Adjust',
      'Annotate',
      'Finetune',
      'Filters',
      'Watermark',
    ],
    defaultTabId: 'Annotate',
  }), [src, user, onSave]);

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

        <div className="flex-1 w-full h-full relative">
          {user && (
            <FilerobotImageEditor
              {...config}
            />
          )}
        </div>
      </div>
    </div>
  );
};
