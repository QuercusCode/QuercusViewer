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
  Info,
  Copy,
  ChevronRight,
  Database
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'measure' | 'roi';
  points: { x: number, y: number }[];
  result?: string;
  color?: string;
}

interface TiffMetadata {
  fileName: string;
  fileSize: string;
  magic: string;
  layers: number;
  bestLayer: string;
  isBigTiff: boolean;
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
  const [metadata, setMetadata] = useState<TiffMetadata | null>(null);
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

  const copyDebugReport = () => {
    const report = {
      browser: navigator.userAgent,
      metadata: metadata,
      error: imageLoadError,
      srcLength: src?.length || 0,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Debug report copied to clipboard! Please paste it in the chat.");
  };

  // Convert TIFF ArrayBuffer to browser-readable PNG/JPEG Data URL
  const processTiff = async (buffer: ArrayBuffer, fileName: string, onStep: (step: string) => void) => {
    onStep("Loading Decoder Core");
    await loadUTIF();
    const UTIF = (window as any).UTIF;
    
    try {
      // MAGIC NUMBER CHECK
      const view = new DataView(buffer);
      const magic = view.getUint32(0, false).toString(16).toUpperCase();
      const isBigTiff = magic === '49492B00' || magic === '4D4D002B';
      const order = magic.startsWith('4949') ? 'Little Endian' : 'Big Endian';
      
      console.log(`[TIFF] Magic: ${magic} (${order}), BigTIFF: ${isBigTiff}`);
      
      onStep("Analyzing File Structure");
      const ifds = UTIF.decode(buffer);
      
      if (!ifds || ifds.length === 0) {
        throw new Error(`Decoder returned 0 image layers. This usually happens with BigTIFF or unsupported scientific compressions. Magic: ${magic}`);
      }

      onStep("Selecting Science Layer");
      const sortedIFDs = [...ifds].sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height));
      const targetIFD = sortedIFDs[0];

      setMetadata({
        fileName,
        fileSize: (buffer.byteLength / 1024 / 1024).toFixed(2) + " MB",
        magic: `${magic} (${order})`,
        layers: ifds.length,
        bestLayer: `${targetIFD.width}x${targetIFD.height}`,
        isBigTiff
      });

      if (!targetIFD.width || !targetIFD.height) {
        throw new Error(`Detected layer has zero dimensions. IFD Count: ${ifds.length}`);
      }

      onStep(`Decoding ${targetIFD.width}x${targetIFD.height} Pixels`);
      UTIF.decodeImage(buffer, targetIFD);
      
      onStep("Normalizing Color Space");
      let rgba = UTIF.toRGBA8(targetIFD);

      onStep("Preparing Workbench Canvas");
      const MAX_DIMENSION = 2048; 
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
      if (!ctx) throw new Error("Browser Canvas limit reached.");

      if (scale < 1) {
        onStep("Applying Adaptive Scale");
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = targetIFD.width;
        tempCanvas.height = targetIFD.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          const imgData = tempCtx.createImageData(targetIFD.width, targetIFD.height);
          imgData.data.set(new Uint8ClampedArray(rgba));
          tempCtx.putImageData(imgData, 0, 0);
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempCanvas, 0, 0, finalWidth, finalHeight);
        }
      } else {
        const imgData = ctx.createImageData(canvas.width, canvas.height);
        imgData.data.set(new Uint8ClampedArray(rgba));
        ctx.putImageData(imgData, 0, 0);
      }
      
      onStep("Syncing to Notebook");
      rgba = null;
      
      const type = (finalWidth * finalHeight > 800000) ? 'image/jpeg' : 'image/png';
      const dataUrl = canvas.toDataURL(type, 0.85);
      return dataUrl;
    } catch (error: any) {
      console.error("[TIFF] Critical Failure:", error);
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
    setMetadata(null);
    setLocalSrc(null);
    
    if (isTiff) {
      setIsDecoding(true);
      setDecodingStep("Readying");
      try {
        const buffer = await file.arrayBuffer();
        const dataUrl = await processTiff(buffer, file.name, setDecodingStep);
        setLocalSrc(dataUrl);
        updateAttributes({ src: dataUrl });
      } catch (err: any) {
        setImageLoadError(`Critical Decoding Failure: ${err.message || 'Unknown error'}`);
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
        className="relative bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden shadow-2xl min-h-[450px] flex items-center justify-center cursor-crosshair"
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
              onError={() => setImageLoadError("Browser failed to render the decoded binary. This can happen with massive files or strict CSP settings.")}
            />
            {imageLoadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl z-30 p-10 text-center">
                <div className="p-4 bg-red-500/20 text-red-500 rounded-2xl mb-6 shadow-glow-red animate-pulse">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <h3 className="text-white font-bold mb-3 text-lg tracking-tight uppercase tracking-[0.1em]">Decoding Error</h3>
                <p className="text-neutral-400 text-xs max-w-sm leading-relaxed mb-10 border-b border-white/5 pb-6">{imageLoadError}</p>
                
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Try Another
                </button>
                <button 
                  onClick={copyDebugReport}
                  className="px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-2xl text-xs transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Report
                </button>
                </div>
              </div>
            )}
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
            />
          </>
        ) : (
          <div 
            className="flex flex-col items-center gap-6 text-neutral-500 hover:text-blue-400 transition-all cursor-pointer p-16 text-center group/upload"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-28 h-28 rounded-[2.5rem] bg-neutral-800/50 flex items-center justify-center border-2 border-dashed border-neutral-700 group-hover/upload:border-blue-500/50 shadow-inner group-hover/upload:scale-105 transition-all duration-500 relative overflow-hidden backdrop-blur-sm">
               <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover/upload:opacity-100 transition-opacity" />
              <Upload className="w-12 h-12 group-hover/upload:-translate-y-2 transition-transform duration-300" />
            </div>
            <div>
              <p className="text-xl font-bold text-neutral-200 tracking-tight">Workbench Ready</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-neutral-500 justify-center">
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-[10px] font-mono">.tif</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-[10px] font-mono">.tiff</span>
                <span className="px-2 py-0.5 bg-neutral-800 rounded text-[10px] font-mono">.png</span>
              </div>
            </div>
          </div>
        )}

        {/* DEC0DING OVERLAY */}
        {isDecoding && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 backdrop-blur-2xl z-40 p-8">
            <div className="relative w-20 h-20 mb-10">
              <div className="absolute inset-0 border-[3px] border-blue-500/10 rounded-full" />
              <div className="absolute inset-0 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-500/50" />
              </div>
            </div>
            
            <p className="text-white text-[10px] font-bold uppercase tracking-[0.3em] mb-8 text-blue-400">
               {decodingStep || "Initializing Pipeline"}
            </p>

            {/* METADATA INSPECTOR */}
            {metadata && (
              <div className="w-full max-w-xs space-y-2.5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MetaDataRow label="Filename" value={metadata.fileName} />
                <MetaDataRow label="Size" value={metadata.fileSize} />
                <MetaDataRow label="Magic" value={metadata.magic} highlight={metadata.isBigTiff} />
                <MetaDataRow label="Layers" value={metadata.layers} />
                <MetaDataRow label="Main" value={metadata.bestLayer} />
              </div>
            )}
            
            <div className="mt-12 flex items-center gap-2 text-neutral-600 text-[10px] italic">
              <Info className="w-3 h-3" />
              <span>Scientific decoding is hardware accelerated</span>
            </div>
          </div>
        )}

        {/* TOOLBAR */}
        {(localSrc || src) && !isDecoding && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-neutral-950/90 backdrop-blur-2xl border border-white/10 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-y-0 translate-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30">
            <ToolButton 
              active={activeTool === 'select'} 
              onClick={() => setActiveTool('select')} 
              icon={<MousePointer2 className="w-4 h-4" />} 
              label="Select tool" 
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
              label="Intensity Analysis" 
            />
            <div className="w-px h-6 bg-white/10 mx-1" />
            <ToolButton 
              active={false} 
              onClick={clearAnnotations} 
              icon={<Trash2 className="w-4 h-4 text-red-400" />} 
              label="Reset Workbench" 
            />
            <ToolButton 
              active={false} 
              onClick={() => fileInputRef.current?.click()} 
              icon={<Upload className="w-4 h-4 text-neutral-400" />} 
              label="Change Source" 
            />
          </div>
        )}

        {/* STATUS BAR */}
        {(localSrc || src) && !imageLoadError && !isDecoding && (
          <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-neutral-950/90 backdrop-blur-2xl border border-white/10 rounded-full text-[10px] font-mono text-neutral-300 pointer-events-auto shadow-2xl">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full transition-shadow duration-500 ${calibration.ratio > 0 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                <span className="tracking-[0.05em]">{calibration.ratio > 0 ? `SCALE: 1px = ${calibration.ratio.toFixed(2)}µm` : 'UNITS NOT CALIBRATED'}</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2 opacity-70">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>{annotations.length} PERSISTENT OBJECTS</span>
              </div>
            </div>
            
            {calibration.ratio > 0 && (
              <div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl">
                <div className="w-10 h-[2px] bg-white/60 rounded-full" />
                <span className="text-[10px] text-white font-mono font-black tracking-widest">{calibration.um} µm</span>
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

const MetaDataRow: React.FC<{ label: string, value: any, highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-white/5 group/row">
    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">{label}</span>
    <div className="flex items-center gap-1.5 overflow-hidden">
      <ChevronRight className="w-2 h-2 text-neutral-700" />
      <span className={`text-[10px] font-mono truncate max-w-[140px] ${highlight ? 'text-amber-400 font-bold' : 'text-neutral-300'}`}>
        {value}
      </span>
    </div>
  </div>
);

const ToolButton: React.FC<{ active: boolean, onClick: () => void, icon: React.ReactNode, label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    title={label}
    className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 ${
      active 
        ? 'bg-blue-500 text-white shadow-[0_10px_20px_rgba(59,130,246,0.4)] scale-110' 
        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon}
  </button>
);
