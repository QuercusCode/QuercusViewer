import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Crop, Pencil, Type, Save, 
  ChevronRight, Minus, Plus, Undo2, Redo2
} from 'lucide-react';

interface ImageEditorModalProps {
  src: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}

type EditorStage = 'crop' | 'draw' | 'meta';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ src, onSave, onClose }) => {
  const [stage, setStage] = useState<EditorStage>('crop');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#3b82f6'); // Blue-500
  const [brushSize, setBrushSize] = useState(5);
  
  // Crop State
  const [cropSelection, setCropSelection] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Meta State
  const [fileName, setFileName] = useState('Edited Image');

  // Initialize Canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Calculate responsive dimensions
      const maxWidth = window.innerWidth * 0.7;
      const maxHeight = window.innerHeight * 0.6;
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.drawImage(img, 0, 0, width, height);
        contextRef.current = ctx;
      }

      setCropSelection({
        x: width * 0.1,
        y: height * 0.1,
        width: width * 0.8,
        height: height * 0.8
      });

      // Initialize history
      const dataUrl = canvas.toDataURL();
      setHistory([dataUrl]);
      setHistoryIndex(0);
    };
  }, [src]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(dataUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    loadHistoryAt(newIndex);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    loadHistoryAt(newIndex);
  };

  const loadHistoryAt = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      // If dimensions changed (e.g. after crop), update canvas size
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(index);
    };
  };

  // Drawing Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (stage !== 'draw') return;
    const { x, y } = getCoordinates(e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || stage !== 'draw' || !contextRef.current) return;
    const { x, y } = getCoordinates(e);
    contextRef.current.strokeStyle = brushColor;
    contextRef.current.lineWidth = brushSize;
    contextRef.current.lineTo(x, y);
    contextRef.current.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
    saveHistory();
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Crop Logic
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (stage !== 'crop') return;
    const { x, y } = getCoordinates(e);
    const handleSize = 15;

    // Check corners for resizing
    if (Math.abs(x - cropSelection.x) < handleSize && Math.abs(y - cropSelection.y) < handleSize) {
      setResizeHandle('nw');
    } else if (Math.abs(x - (cropSelection.x + cropSelection.width)) < handleSize && Math.abs(y - cropSelection.y) < handleSize) {
      setResizeHandle('ne');
    } else if (Math.abs(x - cropSelection.x) < handleSize && Math.abs(y - (cropSelection.y + cropSelection.height)) < handleSize) {
      setResizeHandle('sw');
    } else if (Math.abs(x - (cropSelection.x + cropSelection.width)) < handleSize && Math.abs(y - (cropSelection.y + cropSelection.height)) < handleSize) {
      setResizeHandle('se');
    } else if (x >= cropSelection.x && x <= cropSelection.x + cropSelection.width &&
        y >= cropSelection.y && y <= cropSelection.y + cropSelection.height) {
      setIsDraggingCrop(true);
      setDragStart({ x: x - cropSelection.x, y: y - cropSelection.y });
    }
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (stage !== 'crop') return;
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (resizeHandle) {
      let { x: nx, y: ny, width: nw, height: nh } = cropSelection;
      
      switch (resizeHandle) {
        case 'nw':
          nw = (nx + nw) - x;
          nh = (ny + nh) - y;
          nx = x;
          ny = y;
          break;
        case 'ne':
          nw = x - nx;
          nh = (ny + nh) - y;
          ny = y;
          break;
        case 'sw':
          nw = (nx + nw) - x;
          nh = y - ny;
          nx = x;
          break;
        case 'se':
          nw = x - nx;
          nh = y - ny;
          break;
      }

      // Min size constraints and boundary checks
      nw = Math.max(20, Math.min(nw, resizeHandle === 'nw' || resizeHandle === 'sw' ? nx + nw : canvas.width - nx));
      nh = Math.max(20, Math.min(nh, resizeHandle === 'nw' || resizeHandle === 'ne' ? ny + nh : canvas.height - ny));
      
      setCropSelection({ x: nx, y: ny, width: nw, height: nh });
    } else if (isDraggingCrop) {
      let newX = x - dragStart.x;
      let newY = y - dragStart.y;
      
      newX = Math.max(0, Math.min(newX, canvas.width - cropSelection.width));
      newY = Math.max(0, Math.min(newY, canvas.height - cropSelection.height));
      
      setCropSelection((prev: { x: number; y: number; width: number; height: number }) => ({ ...prev, x: newX, y: newY }));
    }
  };

  const applyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cropSelection.width;
    tempCanvas.height = cropSelection.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      tempCtx.drawImage(
        canvas,
        cropSelection.x, cropSelection.y, cropSelection.width, cropSelection.height,
        0, 0, cropSelection.width, cropSelection.height
      );
      
      canvas.width = cropSelection.width;
      canvas.height = cropSelection.height;
      contextRef.current.drawImage(tempCanvas, 0, 0);
      saveHistory(); // Save after crop
      setStage('draw');
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsProcessing(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full h-full max-w-7xl bg-[#0a0a0a] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row relative">
        
        {/* LEFT: Sidebar Toolbar */}
        <div className="w-full md:w-20 bg-[#121212] border-r border-white/5 flex md:flex-col items-center py-4 gap-4 overflow-x-auto md:overflow-visible no-scrollbar">
          <div className="hidden md:flex flex-col items-center mb-6">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-1">
              <Pencil className="w-5 h-5 text-blue-500" />
            </div>
          </div>
          
          <ToolButton 
            active={stage === 'crop'} 
            onClick={() => setStage('crop')} 
            icon={<Crop className="w-5 h-5" />} 
            label="Crop" 
          />
          <ToolButton 
            active={stage === 'draw'} 
            onClick={() => setStage('draw')} 
            icon={<Pencil className="w-5 h-5" />} 
            label="Draw" 
          />
          <ToolButton 
            active={stage === 'meta'} 
            onClick={() => setStage('meta')} 
            icon={<Type className="w-5 h-5" />} 
            label="Info" 
          />

          <ToolbarDivider />

          <ToolButton 
            active={false} 
            onClick={undo} 
            disabled={historyIndex <= 0}
            icon={<Undo2 className="w-5 h-5" />} 
            label="Undo" 
          />
          <ToolButton 
            active={false} 
            onClick={redo} 
            disabled={historyIndex >= history.length - 1}
            icon={<Redo2 className="w-5 h-5" />} 
            label="Redo" 
          />
          
          <div className="flex-1 hidden md:block" />
          
          <button
            onClick={onClose}
            className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
            title="Cancel"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* MIDDLE: Canvas Workspace */}
        <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)] p-6 overflow-hidden">
          <div className="relative group shadow-[0_0_100px_rgba(37,99,235,0.1)] rounded-xl overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              onMouseDown={(e) => {
                if (stage === 'draw') startDrawing(e);
                if (stage === 'crop') handleCropMouseDown(e);
              }}
              onMouseMove={(e) => {
                if (stage === 'draw') draw(e);
                if (stage === 'crop') handleCropMouseMove(e);
              }}
              onMouseUp={() => {
                if (stage === 'draw') endDrawing();
                if (stage === 'crop') {
                  setIsDraggingCrop(false);
                  setResizeHandle(null);
                }
              }}
              onMouseLeave={() => {
                if (stage === 'draw') endDrawing();
                if (stage === 'crop') {
                  setIsDraggingCrop(false);
                  setResizeHandle(null);
                }
              }}
              className="bg-[#121212] rounded-lg max-w-full touch-none shadow-2xl"
            />
            
            {/* Crop Overlay */}
            {stage === 'crop' && (
              <div 
                className="absolute border-2 border-blue-500 shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{
                  left: cropSelection.x,
                  top: cropSelection.y,
                  width: cropSelection.width,
                  height: cropSelection.height
                }}
              >
                <div className="absolute top-0 left-0 -translate-x-1 -translate-y-1 w-3 h-3 bg-blue-500 rounded-full border border-white cursor-nw-resize pointer-events-auto" />
                <div className="absolute top-0 right-0 translate-x-1 -translate-y-1 w-3 h-3 bg-blue-500 rounded-full border border-white cursor-ne-resize pointer-events-auto" />
                <div className="absolute bottom-0 left-0 -translate-x-1 translate-y-1 w-3 h-3 bg-blue-500 rounded-full border border-white cursor-sw-resize pointer-events-auto" />
                <div className="absolute bottom-0 right-0 translate-x-1 translate-y-1 w-3 h-3 bg-blue-500 rounded-full border border-white cursor-se-resize pointer-events-auto" />
              </div>
            )}
          </div>
          
          {/* Zoom/Pan Controls could go here */}
        </div>

        {/* RIGHT: Properties Panel */}
        <div className="w-full md:w-80 bg-[#121212] border-l border-white/5 flex flex-col p-6 animate-in slide-in-from-right duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              {stage === 'crop' && 'Crop & Adjust'}
              {stage === 'draw' && 'Precision Drawing'}
              {stage === 'meta' && 'Image Information'}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">BETA</span>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar">
            {stage === 'crop' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-400 leading-relaxed">
                  Drag the selection box to define your area. Click apply to move to drawing tools.
                </p>
                <div className="pt-4">
                  <button
                    onClick={applyCrop}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.25rem] font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-600/20 group"
                  >
                    <span>Apply Selection</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {stage === 'draw' && (
              <div className="space-y-8">
                {/* Color Palette */}
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 block">Brush Color</label>
                  <div className="grid grid-cols-5 gap-3">
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ffffff', '#8b5cf6', '#ec4899', '#000000', '#64748b', '#fb7185'].map(c => (
                      <button
                        key={c}
                        onClick={() => setBrushColor(c)}
                        className={`w-10 h-10 rounded-xl border-2 transition-all ${brushColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Brush Size */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block">Brush Size</label>
                    <span className="text-xs font-mono text-blue-400">{brushSize}px</span>
                  </div>
                  <div className="flex items-center gap-4 bg-[#1a1a1a] p-3 rounded-2xl border border-white/5">
                    <button onClick={() => setBrushSize(Math.max(1, brushSize - 2))} className="text-gray-400 hover:text-white p-1">
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="flex-1 accent-blue-500 bg-transparent h-1.5"
                    />
                    <button onClick={() => setBrushSize(Math.min(100, brushSize + 2))} className="text-gray-400 hover:text-white p-1">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={() => setStage('meta')}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.25rem] font-bold flex items-center justify-center gap-3 transition-all border border-white/5"
                  >
                    <span>Continue to Info</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {stage === 'meta' && (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 block">File Name</label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                    placeholder="Enter file name..."
                  />
                </div>
                
                <p className="text-xs text-gray-500 leading-relaxed italic">
                  * Changes are saved as a high-quality PNG structure and will replace the current notebook image.
                </p>
              </div>
            )}
          </div>

          {/* SAVE BUTTON */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className={`w-full py-4 rounded-[1.25rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all shadow-2xl ${
                isProcessing 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40'
              }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToolbarDivider = () => (
  <div className="w-10 h-px bg-white/5 my-2 mx-auto" />
);

// UI Helper Components
const ToolButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }> = ({ 
  active, onClick, icon, label, disabled 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all group ${
      active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
        : 'text-gray-500 hover:text-white hover:bg-white/5'
    } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
  >
    {icon}
    <span className={`text-[9px] font-black uppercase tracking-tighter ${active ? 'text-blue-100' : 'text-gray-600 group-hover:text-gray-400'}`}>
      {label}
    </span>
  </button>
);
