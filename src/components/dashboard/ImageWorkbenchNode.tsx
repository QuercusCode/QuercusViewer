import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { 
  Ruler, 
  Maximize, 
  MousePointer2, 
  Trash2, 
  Target, 
  Upload,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'measure' | 'roi';
  points: { x: number, y: number }[];
  result?: string;
  color?: string;
}

// Global script load promise to prevent multiple injections
let utifLoadPromise: Promise<void> | null = null;

export const ImageWorkbenchNode: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const { src, annotations, calibration } = node.attrs;
  const [activeTool, setActiveTool] = useState<'select' | 'calibrate' | 'measure' | 'roi'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodingStep, setDecodingStep] = useState<string>('');
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to load UTIF.js dynamically (Singleton Pattern)
  const loadUTIF = () => {
    if ((window as any).UTIF) return Promise.resolve();
    if (utifLoadPromise) return utifLoadPromise;

    utifLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/utif@1.1.0/UTIF.js";
      script.async = true;
      script.onload = () => {
        console.log("[TIFF] UTIF.js loaded successfully");
        resolve();
      };
      script.onerror = () => {
        utifLoadPromise = null;
        reject(new Error("Failed to load TIFF decoder library. Check your internet connection."));
      };
      document.body.appendChild(script);
    });
    return utifLoadPromise;
  };

  // Convert TIFF ArrayBuffer to browser-readable PNG/JPEG Data URL
  const processTiff = async (buffer: ArrayBuffer, onStep: (step: string) => void) => {
    onStep("Loading Decoder");
    console.log("[TIFF] Starting decoding, input size:", (buffer.byteLength / 1024).toFixed(1), "KB");
    await loadUTIF();
    const UTIF = (window as any).UTIF;
    
    try {
      onStep("Analyzing Structure");
      const ifds = UTIF.decode(buffer);
      console.log("[TIFF] IFDs found:", ifds.length);
      
      if (!ifds || ifds.length === 0) {
        throw new Error("The TIFF file appears to be empty or corrupted (no IFDs found).");
      }

      // Find the "best" IFD. For scientific images, this is usually the one with the largest dimensions.
      onStep("Identifying Best Layer");
      const sortedIFDs = [...ifds].sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height));
      const targetIFD = sortedIFDs[0];

      if (!targetIFD.width || !targetIFD.height) {
        console.error("[TIFF] Invalid IFD data:", targetIFD);
        throw new Error(`Invalid TIFF structure: Width=${targetIFD.width}, Height=${targetIFD.height}`);
      }

      console.log("[TIFF] Target Image Dimensions:", targetIFD.width, "x", targetIFD.height);
      onStep(`Decoding Pixels (${targetIFD.width}x${targetIFD.height})`);
      UTIF.decodeImage(buffer, targetIFD);
      
      onStep("Converting Color Space");
      let rgba = UTIF.toRGBA8(targetIFD);
      console.log("[TIFF] RGBA conversion complete, buffer length:", rgba.length);

      // --- ADAPTIVE DOWNSCALING ---
      const MAX_DIMENSION = 2560; 
      let scale = 1;
      if (targetIFD.width > MAX_DIMENSION || targetIFD.height > MAX_DIMENSION) {
        scale = Math.min(MAX_DIMENSION / targetIFD.width, MAX_DIMENSION / targetIFD.height);
      }

      const canvas = document.createElement('canvas');
      const finalWidth = Math.floor(targetIFD.width * scale);
      const finalHeight = Math.floor(targetIFD.height * scale);
      
      canvas.width = finalWidth;
      canvas.height = finalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not initialize conversion canvas (likely browser memory limit).");

      if (scale < 1) {
        onStep(`Applying Adaptive Scale (${Math.floor(scale*100)}%)`);
        console.log("[TIFF] Scaling down image:", scale.toFixed(2), "x ->", finalWidth, "x", finalHeight);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetIFD.width;
        tempCanvas.height = targetIFD.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error("Could not initialize temporary scaling canvas.");
        
        const imgData = tempCtx.createImageData(targetIFD.width, targetIFD.height);
        imgData.data.set(new Uint8ClampedArray(rgba));
        tempCtx.putImageData(imgData, 0, 0);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tempCanvas, 0, 0, finalWidth, finalHeight);
      } else {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        imgData.data.set(new Uint8ClampedArray(rgba));
        ctx.putImageData(imgData, 0, 0);
      }
      
      onStep("Finalizing Preview");
      rgba = null;
      
      const type = (finalWidth * finalHeight > 1000000) ? 'image/jpeg' : 'image/png';
      const quality = type === 'image/jpeg' ? 0.85 : undefined;
      
      const dataUrl = canvas.toDataURL(type, quality);
      console.log("[TIFF] Success, data URL length:", (dataUrl.length / 1024).toFixed(1), "KB");
      return dataUrl;
    } catch (error: unknown) {
      console.error("[TIFF] Critical Processing Error:", error);
      throw error;
    }
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isTiff = fileName.endsWith('.tif') || fileName.endsWith('.tiff');

    setImageLoadError(null);
    setLocalSrc(null);
    
    if (isTiff) {
      setIsDecoding(true);
      setDecodingStep("Initializing");
      console.log("[TIFF] Upload Request:", fileName, `(${ (file.size / 1024 / 1024).toFixed(2) } MB)`);
      try {
        const buffer = await file.arrayBuffer();
        const dataUrl = await processTiff(buffer, setDecodingStep);
        console.log("[TIFF] Rendering locally...");
        setLocalSrc(dataUrl);
        updateAttributes({ src: dataUrl });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown decoding error';
        console.error("[TIFF] Failed to process upload:", msg);
        setImageLoadError(`TIFF Processing Failed: ${msg}. Try a different file or export as PNG/JPG.`);
      } finally {
        setIsDecoding(false);
        setDecodingStep("");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        setLocalSrc(res);
        updateAttributes({ src: res });
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert Canvas Coordinates to Normalized (0-100)
  const getNormalizedPoint = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  // Intensity Analysis Logic
  const calculateMeanIntensity = useCallback((roi: Annotation) => {
    if (!imageRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) return '0.0';
    const img = imageRef.current;
    
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '0.0';
    ctx.drawImage(img, 0, 0);

    const p1 = roi.points[0];
    const p2 = roi.points[1];

    const x = Math.min(p1.x, p2.x) * (img.naturalWidth / 100);
    const y = Math.min(p1.y, p2.y) * (img.naturalHeight / 100);
    const w = Math.abs(p1.x - p2.x) * (img.naturalWidth / 100);
    const h = Math.abs(p1.y - p2.y) * (img.naturalHeight / 100);

    if (w < 1 || h < 1) return '0.0';

    try {
      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;
      let totalLuminance = 0;

      for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        totalLuminance += luminance;
      }

      const mean = totalLuminance / (data.length / 4);
      return mean.toFixed(1);
    } catch (err) {
      console.warn('Intensity calculation failed:', err);
      return 'N/A';
    }
  }, []);

  // Measurement Logic
  const calculateDistance = useCallback((points: { x: number, y: number }[]) => {
    const p1 = points[0];
    const p2 = points[1];
    if (!p1 || !p2) return '0.0 px';
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const distPx = Math.sqrt(dx * dx + dy * dy);
    
    if (calibration.ratio > 0) {
      return (distPx * calibration.ratio).toFixed(1) + ' µm';
    }
    return distPx.toFixed(1) + ' px';
  }, [calibration]);

  // Drawing Events
  const startDrawing = (e: React.MouseEvent) => {
    if (activeTool === 'select' || (!localSrc && !src) || imageLoadError || isDecoding) return;
    setIsDrawing(true);
    const p = getNormalizedPoint(e);
    setCurrentPoints([p]);
  };

  const drawMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const p = getNormalizedPoint(e);
    setCurrentPoints(prev => [prev[0], p]);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }

    if (activeTool === 'calibrate') {
      const umStr = window.prompt('Enter real-world length (µm) for this line:', '100');
      const um = parseFloat(umStr || '0');
      if (!isNaN(um) && um > 0) {
        const dx = currentPoints[0].x - currentPoints[1].x;
        const dy = currentPoints[0].y - currentPoints[1].y;
        const pxDist = Math.sqrt(dx * dx + dy * dy);
        updateAttributes({
          calibration: { px: pxDist, um: um, ratio: um / pxDist }
        });
      }
    } else if (activeTool === 'measure' || activeTool === 'roi') {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: activeTool,
        points: [...currentPoints],
        color: activeTool === 'roi' ? '#10b981' : '#3b82f6'
      };

      if (activeTool === 'roi') {
        newAnnotation.result = calculateMeanIntensity(newAnnotation);
      } else {
        newAnnotation.result = calculateDistance(newAnnotation.points);
      }

      updateAttributes({
        annotations: [...annotations, newAnnotation]
      });
    }

    setCurrentPoints([]);
  };

  const clearAnnotations = () => {
    if (window.confirm('Clear all measurements and calibrations?')) {
      updateAttributes({ annotations: [], calibration: { px: 0, um: 0, ratio: 1 } });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      annotations.forEach((anno: Annotation) => {
        if (!anno.points || anno.points.length < 2) return;
        const p1 = { x: (anno.points[0].x / 100) * w, y: (anno.points[0].y / 100) * h };
        const p2 = { x: (anno.points[1].x / 100) * w, y: (anno.points[1].y / 100) * h };

        ctx.strokeStyle = anno.color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        if (anno.type === 'measure') {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p1.x, p1.y, 4, 0, Math.PI * 2);
          ctx.arc(p2.x, p2.y, 4, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
          ctx.font = '12px Inter, system-ui';
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          const text = anno.result || '';
          const tw = ctx.measureText(text).width;
          ctx.fillRect((p1.x + p2.x) / 2 - tw / 2 - 5, (p1.y + p2.y) / 2 - 10, tw + 10, 20);
          ctx.fillStyle = '#fff';
          ctx.fillText(text, (p1.x + p2.x) / 2 - tw / 2, (p1.y + p2.y) / 2 + 4);
        } else if (anno.type === 'roi') {
          const rx = Math.min(p1.x, p2.x);
          const ry = Math.min(p1.y, p2.y);
          const rw = Math.abs(p1.x - p2.x);
          const rh = Math.abs(p1.y - p2.y);
          ctx.strokeRect(rx, ry, rw, rh);
          ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
          ctx.fillRect(rx, ry, rw, rh);
          ctx.fillStyle = 'rgba(0,0,0,0.8)';
          const text = `Mean: ${anno.result}`;
          const tw = ctx.measureText(text).width;
          ctx.fillRect(rx, ry - 22, tw + 10, 20);
          ctx.fillStyle = '#10b981';
          ctx.fillText(text, rx + 5, ry - 8);
        }
      });

      if (isDrawing && currentPoints.length === 2) {
        const p1 = { x: (currentPoints[0].x / 100) * w, y: (currentPoints[0].y / 100) * h };
        const p2 = { x: (currentPoints[1].x / 100) * w, y: (currentPoints[1].y / 100) * h };
        ctx.strokeStyle = activeTool === 'roi' ? '#10b981' : '#3b82f6';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        if (activeTool === 'roi') {
          ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
        } else {
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
      requestAnimationFrame(render);
    };

    const animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [annotations, isDrawing, currentPoints, activeTool]);

  return (
    <NodeViewWrapper className="image-workbench-container my-8 relative group">
      <div 
        ref={containerRef}
        className="relative bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl min-h-[400px] flex items-center justify-center cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={drawMove}
        onMouseUp={endDrawing}
      >
        {localSrc || src ? (
          <>
            <img 
              ref={imageRef}
              src={localSrc || src} 
              alt="Scientific Sample" 
              className="max-w-full h-auto select-none pointer-events-none"
              onError={() => setImageLoadError("Browser failed to render the decoded binary. This can happen with massive files or corrupt streams.")}
            />
            {imageLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30 p-10 text-center">
                <div className="p-4 bg-red-500/20 text-red-500 rounded-2xl mb-6 shadow-glow-red">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-white font-bold mb-3 text-lg tracking-tight">TIFF Rendering Error</h3>
                <p className="text-neutral-400 text-xs max-w-sm leading-relaxed mb-8">{imageLoadError}</p>
                
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Try Different File
                </button>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reload App
                </button>
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/5 flex items-center gap-2 text-neutral-500">
                  <Info className="w-3 h-3" />
                  <span className="text-[10px] italic">Check the browser console for exact error details</span>
                </div>
              </div>
            )}
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
            />
            {isDecoding && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl z-40">
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-white text-xs font-bold uppercase tracking-[0.2em] animate-pulse">
                   {decodingStep || "Decoding Data"}
                </p>
                <div className="flex flex-col items-center mt-3 text-neutral-500 text-[10px] space-y-1">
                  <span>Converting high bit-depth TIFF to visual preview</span>
                  <span>Applying adaptive scaling for workbench stability</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div 
            className="flex flex-col items-center gap-4 text-neutral-500 hover:text-blue-400 transition-all cursor-pointer p-12 text-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-24 h-24 rounded-3xl bg-neutral-800 flex items-center justify-center border-2 border-dashed border-neutral-700 group-hover:border-blue-500/50 shadow-inner group-hover:scale-105 transition-all duration-300 relative overflow-hidden">
               <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Upload className="w-10 h-10 group-hover:translate-y--2 transition-transform" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-200">Scientific Image Workbench</p>
              <p className="text-xs text-neutral-500 mt-2 max-w-xs leading-relaxed">
                Drag and drop your samples here. Supports raw <span className="text-blue-400/80 font-mono">.tif</span>, <span className="text-blue-400/80 font-mono">.tiff</span>, PNG, and JPEG.
              </p>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        {(localSrc || src) && !isDecoding && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-black/80 backdrop-blur-lg border border-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2 shadow-2xl z-30">
            <ToolButton 
              active={activeTool === 'select'} 
              onClick={() => setActiveTool('select')} 
              icon={<MousePointer2 className="w-4 h-4" />} 
              label="Select" 
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <ToolButton 
              active={activeTool === 'calibrate'} 
              onClick={() => setActiveTool('calibrate')} 
              icon={<Maximize className="w-4 h-4 text-emerald-400" />} 
              label="Calibrate Scale" 
            />
            <ToolButton 
              active={activeTool === 'measure'} 
              onClick={() => setActiveTool('measure')} 
              icon={<Ruler className="w-4 h-4 text-blue-400" />} 
              label="Measure distance" 
            />
            <ToolButton 
              active={activeTool === 'roi'} 
              onClick={() => setActiveTool('roi')} 
              icon={<Target className="w-4 h-4 text-indigo-400" />} 
              label="ROI Intensity" 
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <ToolButton 
              active={false} 
              onClick={clearAnnotations} 
              icon={<Trash2 className="w-4 h-4 text-red-400" />} 
              label="Clear all" 
            />
            <ToolButton 
              active={false} 
              onClick={() => fileInputRef.current?.click()} 
              icon={<Upload className="w-4 h-4 text-neutral-400" />} 
              label="Change Image" 
            />
          </div>
        )}

        {/* STATUS BAR */}
        {(localSrc || src) && !imageLoadError && !isDecoding && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-lg border border-white/10 rounded-full text-[10px] font-mono text-neutral-300 pointer-events-auto shadow-lg">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${calibration.ratio > 0 ? 'bg-emerald-500 shadow-glow-emerald' : 'bg-amber-500 shadow-glow-amber'}`} />
                <span className="tracking-tight uppercase">{calibration.ratio > 0 ? `Scale: 1px = ${calibration.ratio.toFixed(2)}µm` : 'Uncalibrated'}</span>
              </div>
              <div className="w-px h-4 bg-white/15" />
              <div className="flex items-center gap-1.5 opacity-80">
                <Target className="w-3 h-3 text-blue-400" />
                <span>{annotations.length} Annotations</span>
              </div>
            </div>
            
            {calibration.ratio > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                <div className="w-8 h-[2px] bg-white/80 rounded-full" />
                <span className="text-[10px] text-white font-mono font-bold tracking-widest">{calibration.um} µm</span>
              </div>
            )}
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*,.tif,.tiff" 
        onChange={handleImageUpload} 
      />
    </NodeViewWrapper>
  );
};

const ToolButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    title={label}
    className={`p-2.5 rounded-xl flex items-center justify-center transition-all duration-200 ${
      active 
        ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] ring-1 ring-blue-500/40' 
        : 'text-neutral-400 hover:bg-white/10 hover:text-white'
    }`}
  >
    {icon}
  </button>
);
