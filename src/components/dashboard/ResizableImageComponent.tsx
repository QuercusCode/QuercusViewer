import React, { useRef, useState, useEffect, Suspense, lazy } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Pencil, Maximize2 } from 'lucide-react';
// Lazy load the editor to prevent it from crashing the main bundle load
const ImageEditorModal = lazy(() => import('./ImageEditorModal').then(module => ({ default: module.ImageEditorModal })));

const ResizableImageComponent: React.FC<NodeViewProps> = ({ node, updateAttributes, selected }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = node.attrs.src;
    img.onload = () => {
      // Image loaded
    };
  }, [node.attrs.src]);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsResizing(true);

    const startX = event.clientX;
    const startWidth = containerRef.current?.offsetWidth || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const currentX = moveEvent.clientX;
      const diffX = currentX - startX;
      let newWidth = startWidth + diffX;
      
      // Limit minimum width
      newWidth = Math.max(newWidth, 100);
      
      // Removed parent container width constraint to allow bigger images

      updateAttributes({ width: `${newWidth}px` });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <NodeViewWrapper className={`inline-block relative group my-4 ${selected ? 'outline outline-2 outline-blue-500 rounded-lg' : ''}`}>
      <div 
        ref={containerRef}
        className="relative"
        style={{ width: node.attrs.width || '100%', height: 'auto' }}
      >
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          title={node.attrs.title}
          className="rounded-lg border border-[var(--border-main)] shadow-sm w-full h-auto block"
        />

        {/* Action Overlay */}
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowEditor(true)}
            className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm border border-white/10 transition-colors"
            title="Edit Image"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 rounded-tl-lg rounded-br-lg text-white ${isResizing ? 'opacity-100' : ''}`}
        >
          <Maximize2 className="w-3.5 h-3.5 rotate-90" />
        </div>
      </div>

      {showEditor && (
        <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>}>
          <ImageEditorModal
            src={node.attrs.src}
            onSave={(newUrl: string) => {
              updateAttributes({ src: newUrl });
              setShowEditor(false);
            }}
            onClose={() => setShowEditor(false)}
          />
        </Suspense>
      )}
    </NodeViewWrapper>
  );
};

export default ResizableImageComponent;
