import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Crop, Pencil, Type, Save, 
  ChevronRight, Undo2, Redo2,
  Square, Circle, ArrowUpRight, Eraser,
  SlidersHorizontal, Maximize2,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';

interface ImageEditorModalProps {
  src: string;
  onSave: (newUrl: string) => void;
  onClose: () => void;
}

type EditorStage = 'crop' | 'annotate' | 'adjust' | 'meta';
type AnnotateTool = 'brush' | 'eraser' | 'text' | 'rect' | 'circle' | 'arrow';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ src, onSave, onClose }) => {
  const [stage, setStage] = useState<EditorStage>('crop');
  const [annotateTool, setAnnotateTool] = useState<AnnotateTool>('brush');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Canvas Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Drawing & Annotation State
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushSize, setBrushSize] = useState(5);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [canvasStateBeforeShape, setCanvasStateBeforeShape] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontSize, setFontSize] = useState(24);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState<CanvasTextAlign>('left');
  
  // Adjustments State
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [invert, setInvert] = useState(0);
  const [grayscale, setGrayscale] = useState(0);
  
  // Crop State
  const [cropSelection, setCropSelection] = useState({ x: 50, y: 50, width: 200, height: 200 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // History State
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [fileName, setFileName] = useState('edited_image.png');

  // Zoom & Pan State
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Global Keyboard Shield
  useEffect(() => {
    const shield = (e: KeyboardEvent) => {
      // If the target is an input or within our modal, don't stop it
      const target = e.target as HTMLElement;
      const isInsideModal = target?.closest('.image-editor-modal-container');
      
      if (!isInsideModal) {
        e.stopPropagation();
      }
    };

    // Use capture phase to intercept before Tiptap/other listeners
    window.addEventListener('keydown', shield, { capture: true });
    window.addEventListener('keyup', shield, { capture: true });
    window.addEventListener('keypress', shield, { capture: true });

    // Focus management: move focus away from background
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) activeElement.blur();
    
    return () => {
      window.removeEventListener('keydown', shield, { capture: true });
      window.removeEventListener('keyup', shield, { capture: true });
      window.removeEventListener('keypress', shield, { capture: true });
    };
  }, []);

  // Initialize Canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
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
    loadHistoryAt(historyIndex - 1);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    loadHistoryAt(historyIndex + 1);
  };

  const loadHistoryAt = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = history[index];
    img.onload = () => {
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width;
        canvas.height = img.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistoryIndex(index);
    };
  };

  // Helper: Get Canvas Coordinates
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Convert screen coordinates to canvas coordinates
    // We divide by scale because the whole container is scaled
    const x = (clientX - rect.left) / scale;
    const y = (clientY - rect.top) / scale;
    
    return { x, y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (stage !== 'annotate') return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(scale * delta, 5));
    setScale(newScale);
  };

  // Annotation Logic
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (stage !== 'annotate') return;
    
    // Pan with middle mouse button or Alt key
    if (('button' in e && e.button === 1) || ('altKey' in e && e.altKey)) {
      setIsPanning(true);
      const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
      setPanStart({ x: clientX - offset.x, y: clientY - offset.y });
      return;
    }

    const { x, y } = getCoordinates(e);

    if (annotateTool === 'text') {
      setTextPos({ x, y });
      setIsAddingText(true);
      setTextInput('');
      return;
    }

    if (['rect', 'circle', 'arrow'].includes(annotateTool)) {
      setShapeStart({ x, y });
      setCanvasStateBeforeShape(canvasRef.current?.toDataURL() || null);
    } else {
      contextRef.current?.beginPath();
      contextRef.current?.moveTo(x, y);
    }
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (stage !== 'annotate') return;
    
    if (isPanning) {
      const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
      setOffset({
        x: clientX - panStart.x,
        y: clientY - panStart.y
      });
      return;
    }

    if (!isDrawing || !contextRef.current) return;
    const { x, y } = getCoordinates(e);
    const ctx = contextRef.current;

    if (['rect', 'circle', 'arrow'].includes(annotateTool) && canvasStateBeforeShape) {
      // Redraw previous state to clear preview
      const img = new Image();
      img.src = canvasStateBeforeShape;
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);

      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.fillStyle = brushColor + '33'; // Semi-transparent fill

      if (annotateTool === 'rect') {
        ctx.strokeRect(shapeStart!.x, shapeStart!.y, x - shapeStart!.x, y - shapeStart!.y);
      } else if (annotateTool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - shapeStart!.x, 2) + Math.pow(y - shapeStart!.y, 2));
        ctx.beginPath();
        ctx.arc(shapeStart!.x, shapeStart!.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (annotateTool === 'arrow') {
        drawArrow(ctx, shapeStart!.x, shapeStart!.y, x, y);
      }
    } else {
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.globalCompositeOperation = annotateTool === 'eraser' ? 'destination-out' : 'source-over';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  const endDrawing = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (!isDrawing) return;
    contextRef.current?.closePath();
    contextRef.current!.globalCompositeOperation = 'source-over';
    setIsDrawing(false);
    setShapeStart(null);
    setCanvasStateBeforeShape(null);
    saveHistory();
  };

  const finalizeText = () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    
    // Construct font string: "bold italic 24px Arial"
    const styleString = [
      isBold ? 'bold' : '',
      isItalic ? 'italic' : '',
      `${fontSize}px`,
      fontFamily
    ].filter(Boolean).join(' ');

    ctx.font = styleString;
    ctx.fillStyle = brushColor;
    ctx.textAlign = textAlign;
    
    ctx.fillText(textInput, textPos.x, textPos.y);

    if (isUnderline) {
      const metrics = ctx.measureText(textInput);
      const textWidth = metrics.width;
      let startX = textPos.x;
      
      if (textAlign === 'center') startX = textPos.x - textWidth / 2;
      else if (textAlign === 'right') startX = textPos.x - textWidth;
      
      ctx.beginPath();
      ctx.lineWidth = Math.max(1, fontSize / 15);
      ctx.strokeStyle = brushColor;
      ctx.moveTo(startX, textPos.y + fontSize / 4);
      ctx.lineTo(startX + textWidth, textPos.y + fontSize / 4);
      ctx.stroke();
    }

    setIsAddingText(false);
    setTextInput('');
    saveHistory();
  };

  // Crop Logic
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (stage !== 'crop') return;
    const { x, y } = getCoordinates(e);
    const hitArea = 30;
    
    if (Math.abs(x - cropSelection.x) < hitArea && Math.abs(y - cropSelection.y) < hitArea) {
      setResizeHandle('nw');
    } else if (Math.abs(x - (cropSelection.x + cropSelection.width)) < hitArea && Math.abs(y - cropSelection.y) < hitArea) {
      setResizeHandle('ne');
    } else if (Math.abs(x - cropSelection.x) < hitArea && Math.abs(y - (cropSelection.y + cropSelection.height)) < hitArea) {
      setResizeHandle('sw');
    } else if (Math.abs(x - (cropSelection.x + cropSelection.width)) < hitArea && Math.abs(y - (cropSelection.y + cropSelection.height)) < hitArea) {
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
      const minSize = 20;
      switch (resizeHandle) {
        case 'nw':
          nx = Math.max(0, Math.min(x, nx + nw - minSize));
          ny = Math.max(0, Math.min(y, ny + nh - minSize));
          nw = (cropSelection.x + cropSelection.width) - nx;
          nh = (cropSelection.y + cropSelection.height) - ny;
          break;
        case 'ne':
          ny = Math.max(0, Math.min(y, ny + nh - minSize));
          nw = Math.max(minSize, Math.min(x - nx, canvas.width - nx));
          nh = (cropSelection.y + cropSelection.height) - ny;
          break;
        case 'sw':
          nx = Math.max(0, Math.min(x, nx + nw - minSize));
          nw = (cropSelection.x + cropSelection.width) - nx;
          nh = Math.max(minSize, Math.min(y - ny, canvas.height - ny));
          break;
        case 'se':
          nw = Math.max(minSize, Math.min(x - nx, canvas.width - nx));
          nh = Math.max(minSize, Math.min(y - ny, canvas.height - ny));
          break;
      }
      setCropSelection({ x: nx, y: ny, width: nw, height: nh });
    } else if (isDraggingCrop) {
      let newX = Math.max(0, Math.min(x - dragStart.x, canvas.width - cropSelection.width));
      let newY = Math.max(0, Math.min(y - dragStart.y, canvas.height - cropSelection.height));
      setCropSelection(prev => ({ ...prev, x: newX, y: newY }));
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
      saveHistory();
      setStage('annotate');
    }
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;
    
    setIsProcessing(true);
    try {
      // Create a final canvas to apply filters permanently
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        finalCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) invert(${invert}%) grayscale(${grayscale}%)`;
        finalCtx.drawImage(canvas, 0, 0);
        const dataUrl = finalCanvas.toDataURL('image/png');
        onSave(dataUrl);
      }
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in duration-300"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div 
        className="w-full h-full max-w-7xl bg-[#0a0a0a] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row relative image-editor-modal-container"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
        onKeyPress={(e) => e.stopPropagation()}
      >
        <div className="w-full md:w-20 bg-[#121212] border-r border-white/5 flex md:flex-col items-center py-4 gap-4 overflow-x-auto md:overflow-visible no-scrollbar">
          <ToolButton active={stage === 'crop'} onClick={() => setStage('crop')} icon={<Crop className="w-5 h-5" />} label="Crop" />
          <ToolButton active={stage === 'annotate'} onClick={() => setStage('annotate')} icon={<Pencil className="w-5 h-5" />} label="Annotate" />
          <ToolButton active={stage === 'adjust'} onClick={() => setStage('adjust')} icon={<SlidersHorizontal className="w-5 h-5" />} label="Adjust" />
          <ToolButton active={stage === 'meta'} onClick={() => setStage('meta')} icon={<Type className="w-5 h-5" />} label="Info" />
          <ToolbarDivider />
            <ToolButton onClick={undo} disabled={historyIndex <= 0} title="Undo">
              <Undo2 className="w-5 h-5" />
            </ToolButton>
            <ToolButton onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
              <Redo2 className="w-5 h-5" />
            </ToolButton>

            <ToolbarDivider />

            <div className="flex flex-col items-center gap-1 group relative">
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24 h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-blue-500"
              />
              <span className="text-[10px] text-neutral-500 font-mono">{Math.round(scale * 100)}%</span>
            </div>

            <ToolButton onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }} title="Reset Zoom">
              <Maximize2 className="w-4 h-4 opacity-50" />
            </ToolButton>
          <div className="flex-1 hidden md:block" />
          <button onClick={onClose} className="p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_100%)] p-6 overflow-hidden">
            <div 
              className="relative flex-1 bg-[#0a0a0c] flex items-center justify-center p-4 sm:p-8 min-h-0 overflow-hidden"
              onWheel={handleWheel}
            >
              {/* Scale/Pan Wrapper */}
              <div
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={endDrawing}
                  onMouseDownCapture={(e) => { if (stage === 'crop') handleCropMouseDown(e); }}
                  onMouseMoveCapture={(e) => { if (stage === 'crop') handleCropMouseMove(e); }}
                  onMouseUpCapture={() => { setIsDraggingCrop(false); setResizeHandle(null); }}
                  className={`shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white touch-none ${stage === 'crop' ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                  style={{ 
                    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) invert(${invert}%) grayscale(${grayscale}%)`,
                    pointerEvents: 'auto'
                  }}
                />
                
                {isAddingText && (
                  <div className="absolute z-50 flex flex-col gap-3 p-4 bg-[#121212] border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in duration-200" style={{ left: textPos.x, top: textPos.y - 120 }}>
                    {/* Floating Style Toolbar */}
                    <div className="flex items-center gap-1 border-b border-white/5 pb-2 mb-1">
                      <TextStyleButton active={isBold} onClick={() => setIsBold(!isBold)} icon={<Bold className="w-3.5 h-3.5" />} />
                      <TextStyleButton active={isItalic} onClick={() => setIsItalic(!isItalic)} icon={<Italic className="w-3.5 h-3.5" />} />
                      <TextStyleButton active={isUnderline} onClick={() => setIsUnderline(!isUnderline)} icon={<Underline className="w-3.5 h-3.5" />} />
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <TextStyleButton active={textAlign === 'left'} onClick={() => setTextAlign('left')} icon={<AlignLeft className="w-3.5 h-3.5" />} />
                      <TextStyleButton active={textAlign === 'center'} onClick={() => setTextAlign('center')} icon={<AlignCenter className="w-3.5 h-3.5" />} />
                      <TextStyleButton active={textAlign === 'right'} onClick={() => setTextAlign('right')} icon={<AlignRight className="w-3.5 h-3.5" />} />
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] font-bold text-gray-500">Size</span>
                        <input 
                          type="number" 
                          value={fontSize} 
                          onChange={(e) => setFontSize(parseInt(e.target.value))} 
                          className="w-10 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <input 
                        autoFocus 
                        type="text" 
                        value={textInput} 
                        onChange={(e) => setTextInput(e.target.value)} 
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') finalizeText();
                          if (e.key === 'Escape') setIsAddingText(false);
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        onKeyPress={(e) => e.stopPropagation()}
                        className="bg-transparent border-b border-blue-500 text-white outline-none py-1 min-w-[200px] text-lg" 
                        placeholder="Type labels..." 
                        style={{ fontFamily, fontWeight: isBold ? 'bold' : 'normal', fontStyle: isItalic ? 'italic' : 'normal', textDecoration: isUnderline ? 'underline' : 'none', textAlign }}
                      />
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-medium">Hit Enter to place</span>
                        <div className="flex gap-2">
                          <button onClick={() => setIsAddingText(false)} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-xs transition-colors">Cancel</button>
                          <button onClick={finalizeText} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors">Place Text</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {stage === 'crop' && (
                  <div className="absolute border-2 border-blue-500 shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] pointer-events-none"
                       style={{ left: cropSelection.x, top: cropSelection.y, width: cropSelection.width, height: cropSelection.height }}>
                    <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                    <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                    <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                    <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white" />
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="w-full md:w-80 bg-[#121212] border-l border-white/5 flex flex-col p-6 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">
              {stage === 'crop' && 'Crop Image'}
              {stage === 'annotate' && 'Annotate'}
              {stage === 'adjust' && 'Adjust'}
              {stage === 'meta' && 'Info'}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/20">PRO</span>
          </div>

          <div className="flex-1 space-y-8">
            {stage === 'crop' && (
              <div className="space-y-6">
                <p className="text-sm text-gray-400">Drag corners to resize or drag the box to move the selection.</p>
                <button onClick={applyCrop} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                  Next Stage <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {stage === 'annotate' && (
              <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-2">
                    <AnnotateToolButton active={annotateTool === 'brush'} onClick={() => setAnnotateTool('brush')} icon={<Pencil className="w-4 h-4" />} label="Brush" />
                    <AnnotateToolButton active={annotateTool === 'eraser'} onClick={() => setAnnotateTool('eraser')} icon={<Eraser className="w-4 h-4" />} label="Eraser" />
                    <AnnotateToolButton active={annotateTool === 'text'} onClick={() => setAnnotateTool('text')} icon={<Type className="w-4 h-4" />} label="Text" />
                    <AnnotateToolButton active={annotateTool === 'rect'} onClick={() => setAnnotateTool('rect')} icon={<Square className="w-4 h-4" />} label="Box" />
                    <AnnotateToolButton active={annotateTool === 'circle'} onClick={() => setAnnotateTool('circle')} icon={<Circle className="w-4 h-4" />} label="Circle" />
                    <AnnotateToolButton active={annotateTool === 'arrow'} onClick={() => setAnnotateTool('arrow')} icon={<ArrowUpRight className="w-4 h-4" />} label="Arrow" />
                  </div>

                  {annotateTool === 'text' && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <label className="text-xs font-bold text-gray-500 uppercase">Font Family</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Sans', value: 'Inter, sans-serif' },
                          { label: 'Serif', value: 'EB Garamond, serif' },
                          { label: 'Mono', value: 'JetBrains Mono, monospace' },
                          { label: 'Display', value: 'Outfit, sans-serif' }
                        ].map(f => (
                          <button
                            key={f.value}
                            onClick={() => setFontFamily(f.value)}
                            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${fontFamily === f.value ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                            style={{ fontFamily: f.value }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase">Colors</label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 font-mono">Custom</span>
                        <input 
                          type="color" 
                          value={brushColor} 
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="w-5 h-5 rounded-full bg-transparent border-none cursor-pointer p-0 overflow-hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <ColorCategory 
                        label="Essentials" 
                        colors={['#ffffff', '#000000', '#64748b', '#475569', '#334155']} 
                        selectedColor={brushColor} 
                        onSelect={setBrushColor} 
                      />
                      <ColorCategory 
                        label="Vibrant" 
                        colors={['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']} 
                        selectedColor={brushColor} 
                        onSelect={setBrushColor} 
                      />
                      <ColorCategory 
                        label="Professional" 
                        colors={['#dc2626', '#d97706', '#059669', '#2563eb', '#7c3aed']} 
                        selectedColor={brushColor} 
                        onSelect={setBrushColor} 
                      />
                      <ColorCategory 
                        label="Accents" 
                        colors={['#ec4899', '#f97316', '#06b6d4', '#84cc16', '#fb7185']} 
                        selectedColor={brushColor} 
                        onSelect={setBrushColor} 
                      />
                    </div>
                  </div>
                <div>
                  <div className="flex justify-between mb-4"><label className="text-xs font-bold text-gray-500 uppercase">Size</label><span className="text-xs text-blue-400">{brushSize}px</span></div>
                  <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-full accent-blue-500" />
                </div>
                <button onClick={() => setStage('adjust')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">Adjust Image <ChevronRight className="w-4 h-4" /></button>
              </div>
            )}

            {stage === 'adjust' && (
              <div className="space-y-6">
                <AdjustmentSlider label="Brightness" value={brightness} onChange={setBrightness} min={0} max={200} />
                <AdjustmentSlider label="Contrast" value={contrast} onChange={setContrast} min={0} max={200} />
                <AdjustmentSlider label="Saturation" value={saturation} onChange={setSaturation} min={0} max={200} />
                <AdjustmentSlider label="Invert" value={invert} onChange={setInvert} min={0} max={100} />
                <AdjustmentSlider label="Grayscale" value={grayscale} onChange={setGrayscale} min={0} max={100} />
                <button onClick={() => setStage('meta')} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">Finalize <ChevronRight className="w-4 h-4" /></button>
              </div>
            )}

            {stage === 'meta' && (
              <div className="space-y-6">
                <label className="text-xs font-bold text-gray-500 uppercase block">File Name</label>
                <input type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" placeholder="Export name..." />
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-white/5">
            <button onClick={handleSave} disabled={isProcessing} className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${isProcessing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40'}`}>
              {isProcessing ? 'Processing...' : <><Save className="w-5 h-5" /> Save Changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TextStyleButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ active, onClick, icon }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }} 
    onMouseDown={(e) => e.stopPropagation()}
    className={`p-1.5 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
  >
    {icon}
  </button>
);

const ToolbarDivider = () => <div className="w-10 h-px bg-white/5 my-2 mx-auto" />;

const ToolButton: React.FC<{ active?: boolean; onClick: () => void; icon?: React.ReactNode; label?: string; disabled?: boolean; title?: string; children?: React.ReactNode }> = ({ active, onClick, icon, label, disabled, title, children }) => (
  <button onClick={onClick} disabled={disabled} title={title} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'} ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}>
    {icon || children}
    {label && <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>}
  </button>
);

const AnnotateToolButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
    {icon}
    <span className="text-[8px] font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

const AdjustmentSlider: React.FC<{ label: string; value: number; onChange: (v: number) => void; min: number; max: number }> = ({ label, value, onChange, min, max }) => (
  <div>
    <div className="flex justify-between mb-2"><label className="text-[10px] font-bold text-gray-500 uppercase">{label}</label><span className="text-[10px] font-mono text-blue-400">{value}%</span></div>
    <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-blue-500 h-1" />
  </div>
);

const ColorCategory: React.FC<{ label: string; colors: string[]; selectedColor: string; onSelect: (c: string) => void }> = ({ label, colors, selectedColor, onSelect }) => (
  <div className="space-y-2">
    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">{label}</span>
    <div className="grid grid-cols-5 gap-2">
      {colors.map(c => (
        <button 
          key={c} 
          onClick={() => onSelect(c)} 
          className={`w-8 h-8 rounded-lg border-2 transition-all ${selectedColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} 
          style={{ backgroundColor: c }} 
        />
      ))}
    </div>
  </div>
);
