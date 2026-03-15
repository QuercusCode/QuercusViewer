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
  Layers
} from 'lucide-react';

interface Annotation {
  id: string;
  type: 'measure' | 'roi';
  points: { x: number, y: number }[];
  result?: string;
  color?: string;
}

interface TiffLayer {
  index: number;
  width: number;
  height: number;
  thumbnail: string | null;
}

interface TiffMetadata {
  fileName: string;
  fileSize: string;
  magic: string;
  layers: number;
  activeLayer: number;
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
  const [layers, setLayers] = useState<TiffLayer[]>([]);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<{ x: number, y: number }[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalBufferRef = useRef<ArrayBuffer | null>(null);

  // Helper to load UTIF.js dynamically (Singleton Pattern)
  const loadUTIF = () => {
    if ((window as any).UTIF) return Promise.resolve();
    if (utifLoadPromise) return utifLoadPromise;

    utifLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      // Use a specific version for stability
      script.src = "https://cdn.jsdelivr.net/npm/utif@1.1.0/UTIF.js";
      script.async = true;
      script.onload = () => {
        console.log("[TIFF] UTIF.js v1.1.0 loaded");
        resolve();
      };
      script.onerror = () => {
        utifLoadPromise = null;
        reject(new Error("Decoder library failed to load. Check internet connection."));
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
      localSrcLength: localSrc?.length || 0,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Diagnostic Report copied. Please paste it in the chat!");
  };

  // Generate Thumbnails for all layers to allow manual selection
  const exploreLayers = async (buffer: ArrayBuffer) => {
    const UTIF = (window as any).UTIF;
    const ifds = UTIF.decode(buffer);
    const discovered: TiffLayer[] = [];

    for (let i = 0; i < ifds.length; i++) {
      const ifd = ifds[i];
      let thumb = null;
      try {
        // Only generate thumbs for potentially displayable layers
        if (ifd.width > 0 && ifd.height > 0) {
          UTIF.decodeImage(buffer, ifd);
          const rgba = UTIF.toRGBA8(ifd);
          const canvas = document.createElement('canvas');
          const maxThumb = 80;
          const ratio = Math.min(maxThumb / ifd.width, maxThumb / ifd.height);
          canvas.width = ifd.width * ratio;
          canvas.height = ifd.height * ratio;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = ifd.width;
            tempCanvas.height = ifd.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
              const imgData = tempCtx.createImageData(ifd.width, ifd.height);
              imgData.data.set(new Uint8ClampedArray(rgba));
              tempCtx.putImageData(imgData, 0, 0);
              ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
              thumb = canvas.toDataURL('image/jpeg', 0.6);
            }
          }
        }
      } catch (e) {
        console.warn(`[TIFF] Thumb fail for layer ${i}`, e);
      }
      discovered.push({ index: i, width: ifd.width, height: ifd.height, thumbnail: thumb });
    }
    return discovered;
  };

  const decodeSpecificLayer = async (buffer: ArrayBuffer, layerIndex: number, onStep: (step: string) => void) => {
    onStep(`Decoding Layer #${layerIndex}`);
    const UTIF = (window as any).UTIF;
    const ifds = UTIF.decode(buffer);
    const targetIFD = ifds[layerIndex];
    
    if (!targetIFD) throw new Error("Layer index out of bounds");
    
    UTIF.decodeImage(buffer, targetIFD);
    onStep("Normalizing Pixels");
    let rgba = UTIF.toRGBA8(targetIFD);

    const MAX_DIM = 2048;
    let scale = 1;
    if (targetIFD.width > MAX_DIM || targetIFD.height > MAX_DIM) {
      scale = Math.min(MAX_DIM / targetIFD.width, MAX_DIM / targetIFD.height);
    }

    onStep("Rendering Surface");
    const canvas = document.createElement('canvas');
    canvas.width = targetIFD.width * scale;
    canvas.height = targetIFD.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas initialization failed");

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetIFD.width;
    tempCanvas.height = targetIFD.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const imgData = tempCtx.createImageData(targetIFD.width, targetIFD.height);
      imgData.data.set(new Uint8ClampedArray(rgba));
      tempCtx.putImageData(imgData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
    }
    
    onStep("Finalizing Sync");
    // Use JPEG for performance on large scientific previews
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    
    // VERIFICATION: Is the Data URL actually populated?
    if (dataUrl.length < 100) {
      throw new Error(`Generated Data URL is suspiciously small (${dataUrl.length} chars). Decoder might be producing empty frames.`);
    }

    return { 
      dataUrl, 
      width: targetIFD.width, 
      height: targetIFD.height 
    };
  };

  // Switch Layer Manually
  const handleLayerSwitch = async (index: number) => {
    if (!originalBufferRef.current) return;
    setIsDecoding(true);
    setDecodingStep(`Switching to Layer ${index}...`);
    try {
      const { dataUrl } = await decodeSpecificLayer(originalBufferRef.current, index, setDecodingStep);
      setLocalSrc(dataUrl);
      updateAttributes({ src: dataUrl });
      setMetadata(prev => prev ? { ...prev, activeLayer: index } : null);
    } catch (err: any) {
      setImageLoadError(`Layer Switch Failed: ${err.message}`);
    } finally {
      setIsDecoding(false);
      setDecodingStep("");
    }
  };

  // Main Processing Flow
  const processTiff = async (buffer: ArrayBuffer, fileName: string, onStep: (step: string) => void) => {
    onStep("Starting Decoder");
    await loadUTIF();
    
    const view = new DataView(buffer);
    const magic = view.getUint32(0, false).toString(16).toUpperCase();
    const isBigTiff = magic === '49492B00' || magic === '4D4D002B';
    
    onStep("Profiling Anatomy");
    const discoveredLayers = await exploreLayers(buffer);
    setLayers(discoveredLayers);

    // Auto-select largest layer
    const best = [...discoveredLayers].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    
    setMetadata({
      fileName,
      fileSize: (buffer.byteLength / 1024 / 1024).toFixed(2) + " MB",
      magic: magic.startsWith('4949') ? "LE" : "BE",
      layers: discoveredLayers.length,
      activeLayer: best.index,
      isBigTiff
    });

    const { dataUrl } = await decodeSpecificLayer(buffer, best.index, onStep);
    return dataUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTiff = file.name.toLowerCase().endsWith('.tif') || file.name.toLowerCase().endsWith('.tiff');

    setImageLoadError(null);
    setMetadata(null);
    setLocalSrc(null);
    setLayers([]);
    
    if (isTiff) {
      setIsDecoding(true);
      setDecodingStep("Preparing Buffer");
      try {
        const buffer = await file.arrayBuffer();
        originalBufferRef.current = buffer;
        const dataUrl = await processTiff(buffer, file.name, setDecodingStep);
        setLocalSrc(dataUrl);
        updateAttributes({ src: dataUrl });
      } catch (err: any) {
        setImageLoadError(`Decoding Failure: ${err.message}`);
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

  // Annotation/Drawing Logic (Unchanged but included for completeness)
  const getNormalizedPoint = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x, y };
  };

  const calculateMeanIntensity = useCallback((roi: Annotation) => {
    if (!imageRef.current || !imageRef.current.complete) return '0.0';
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
      const data = ctx.getImageData(x, y, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      return (sum / (data.length / 4)).toFixed(1);
    } catch { return '0.0'; }
  }, []);

  const calculateDistance = useCallback((points: { x: number, y: number }[]) => {
    const p1 = points[0];
    const p2 = points[1];
    if (!p1 || !p2) return '0.0 px';
    const distPx = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    if (calibration.ratio > 0) return (distPx * calibration.ratio).toFixed(1) + ' µm';
    return distPx.toFixed(1) + ' px';
  }, [calibration]);

  const startDrawing = (e: React.MouseEvent) => {
    if (activeTool === 'select' || (!localSrc && !src) || imageLoadError || isDecoding) return;
    setIsDrawing(true);
    setCurrentPoints([getNormalizedPoint(e)]);
  };

  const drawMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    setCurrentPoints(prev => [prev[0], getNormalizedPoint(e)]);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPoints.length < 2) return;

    if (activeTool === 'calibrate') {
      const umStr = window.prompt('Real length (µm):', '100');
      const um = parseFloat(umStr || '0');
      if (um > 0) {
        const pxDist = Math.sqrt(Math.pow(currentPoints[0].x - currentPoints[1].x, 2) + Math.pow(currentPoints[0].y - currentPoints[1].y, 2));
        updateAttributes({ calibration: { px: pxDist, um: um, ratio: um / pxDist } });
      }
    } else {
      const newAnno: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: activeTool as 'measure' | 'roi',
        points: [...currentPoints],
        color: activeTool === 'roi' ? '#10b981' : '#3b82f6',
        result: activeTool === 'roi' ? calculateMeanIntensity({ id: '', type: 'roi', points: currentPoints }) : calculateDistance(currentPoints)
      };
      updateAttributes({ annotations: [...annotations, newAnno] });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      annotations.forEach((anno: Annotation) => {
        const p1 = { x: (anno.points[0].x / 100) * w, y: (anno.points[0].y / 100) * h };
        const p2 = { x: (anno.points[1].x / 100) * w, y: (anno.points[1].y / 100) * h };
        ctx.strokeStyle = anno.color || '#3b82f6';
        ctx.lineWidth = 2;
        if (anno.type === 'measure') {
          ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          ctx.font = '12px Inter'; ctx.fillStyle = 'black'; ctx.fillRect((p1.x+p2.x)/2 - 20, (p1.y+p2.y)/2 - 10, 40, 20);
          ctx.fillStyle = 'white'; ctx.fillText(anno.result || '', (p1.x+p2.x)/2 - 15, (p1.y+p2.y)/2 + 5);
        } else {
          ctx.strokeRect(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.abs(p1.x-p2.x), Math.abs(p1.y-p2.y));
          ctx.fillStyle = 'white'; ctx.fillText(`Mean: ${anno.result}`, Math.min(p1.x,p2.x), Math.min(p1.y,p2.y)-10);
        }
      });
      if (isDrawing && currentPoints.length === 2) {
        ctx.setLineDash([5, 5]);
        const p1 = { x: (currentPoints[0].x / 100) * w, y: (currentPoints[0].y / 100) * h };
        const p2 = { x: (currentPoints[1].x / 100) * w, y: (currentPoints[1].y / 100) * h };
        ctx.strokeRect(Math.min(p1.x,p2.x), Math.min(p1.y,p2.y), Math.abs(p1.x-p2.x), Math.abs(p1.y-p2.y));
      }
      requestAnimationFrame(render);
    };
    render();
  }, [annotations, isDrawing, currentPoints]);

  return (
    <NodeViewWrapper className="image-workbench my-10 relative">
      <div 
        ref={containerRef}
        className="relative bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden min-h-[500px] flex items-center justify-center shadow-inner"
        onMouseDown={startDrawing}
        onMouseMove={drawMove}
        onMouseUp={endDrawing}
      >
        {localSrc || src ? (
          <>
            <img 
              ref={imageRef}
              src={localSrc || src} 
              className="max-w-full h-auto cursor-crosshair select-none"
              onError={() => setImageLoadError("Browser blocked or failed image buffer render.")}
            />
            {imageLoadError && (
              <div className="absolute inset-0 bg-neutral-900/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center z-50">
                <AlertCircle className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-2">Display Breach</h3>
                <p className="text-neutral-400 text-sm max-w-sm mb-10">{imageLoadError}</p>
                <div className="flex gap-4">
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-blue-600 rounded-xl text-white font-bold text-xs uppercase tracking-widest">Retry</button>
                  <button onClick={copyDebugReport} className="px-6 py-3 bg-white/10 rounded-xl text-white font-bold text-xs uppercase tracking-widest">Diagnostic Report</button>
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
          </>
        ) : (
          <div 
            className="flex flex-col items-center gap-6 p-20 cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-32 h-32 rounded-[3.5rem] bg-neutral-900 border-2 border-dashed border-neutral-800 flex items-center justify-center group-hover:border-blue-500/50 transition-all duration-500">
              <Upload className="w-12 h-12 text-neutral-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-center">
              <h4 className="text-white text-lg font-bold">Scientific Repository</h4>
              <p className="text-neutral-500 text-xs mt-2 uppercase tracking-widest font-mono">Accepts Raw TIFF / PNG / JPG</p>
            </div>
          </div>
        )}

        {/* LOADING & LAYER EXPLORER OVERLAY */}
        {isDecoding && (
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl z-40 flex flex-col items-center justify-center p-10">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-10" />
            <h4 className="text-blue-500 font-mono text-xs uppercase tracking-[0.4em] animate-pulse mb-8">{decodingStep}</h4>
            
            {metadata && (
              <div className="w-full max-w-md bg-neutral-900/50 rounded-3xl p-6 border border-white/5 space-y-4">
                <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500 tracking-widest">
                  <span>Layers Detected</span>
                  <span className="text-blue-500">{layers.length}</span>
                </div>
                
                {/* LAYER PICKER */}
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide py-2">
                  {layers.map((l, i) => (
                    <button 
                      key={i}
                      onClick={() => handleLayerSwitch(i)}
                      className={`flex-shrink-0 w-20 h-24 rounded-2xl border-2 transition-all p-1 flex flex-col items-center justify-between ${metadata.activeLayer === i ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                    >
                      <div className="w-full aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        {l.thumbnail ? <img src={l.thumbnail} className="w-full h-full object-cover" /> : <Layers className="w-4 h-4 text-neutral-800" />}
                      </div>
                      <span className="text-[9px] font-mono text-neutral-500">L-{i}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-[10px] font-mono">
                  <div className="text-neutral-500">FORMAT: <span className="text-neutral-300">{metadata.magic} {metadata.isBigTiff ? '(BIG)' : ''}</span></div>
                  <div className="text-neutral-500">DIM: <span className="text-neutral-300">{layers[metadata.activeLayer]?.width}x{layers[metadata.activeLayer]?.height}</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKBENCH TOOLS */}
        {(localSrc || src) && !isDecoding && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-neutral-900/80 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0">
            <ToolIcon active={activeTool === 'select'} onClick={() => setActiveTool('select')} icon={<MousePointer2 className="w-4 h-4" />} />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolIcon active={activeTool === 'calibrate'} onClick={() => setActiveTool('calibrate')} icon={<Maximize className="w-4 h-4" />} />
            <ToolIcon active={activeTool === 'measure'} onClick={() => setActiveTool('measure')} icon={<Ruler className="w-4 h-4" />} />
            <ToolIcon active={activeTool === 'roi'} onClick={() => setActiveTool('roi')} icon={<Target className="w-4 h-4 text-emerald-400" />} />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolIcon active={false} onClick={() => updateAttributes({ annotations: [], localSrc: null })} icon={<Trash2 className="w-4 h-4 text-red-500" />} />
            <ToolIcon active={false} onClick={() => fileInputRef.current?.click()} icon={<Upload className="w-4 h-4 text-neutral-400" />} />
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} className="hidden" accept=".tif,.tiff,image/*" onChange={handleImageUpload} />
    </NodeViewWrapper>
  );
};

const ToolIcon = ({ active, onClick, icon }: any) => (
  <button 
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    className={`p-3 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white shadow-glow-blue' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}
  >
    {icon}
  </button>
);
