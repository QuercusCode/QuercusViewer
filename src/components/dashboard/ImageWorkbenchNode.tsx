import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { 
  Ruler, 
  Maximize, 
  MousePointer2, 
  Trash2, 
  Target, 
  Upload,
  AlertCircle
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
}

// Global script load promise to prevent multiple injections
let geotiffLoadPromise: Promise<void> | null = null;

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

  // Helper to load GeoTIFF.js dynamically
  const loadGeoTIFF = () => {
    if ((window as any).GeoTIFF) return Promise.resolve();
    if (geotiffLoadPromise) return geotiffLoadPromise;

    geotiffLoadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js";
      script.async = true;
      script.onload = () => {
        console.log("[TIFF] GeoTIFF.js loaded");
        resolve();
      };
      script.onerror = () => {
        geotiffLoadPromise = null;
        reject(new Error("Decoder library (GeoTIFF) failed to load."));
      };
      document.body.appendChild(script);
    });
    return geotiffLoadPromise;
  };

  const copyDebugReport = () => {
    const report = {
      browser: navigator.userAgent,
      metadata: metadata,
      error: imageLoadError,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    alert("Diagnostic Report copied. Note: You can also use the terminal tool in scripts/convert_science_images.py if this still fails.");
  };

  // Convert GeoTIFF image to Data URL
  const convertGeoTiffImage = async (tiff: any, index: number) => {
    const image = await tiff.getImage(index);
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Read RGB data (handles normalization of high bit-depth data)
    const rgb = await image.readRGB();
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context failed");

    const imgData = ctx.createImageData(width, height);
    // readRGB returns a Uint8ClampedArray suitable for canvas
    imgData.data.set(rgb);
    ctx.putImageData(imgData, 0, 0);

    // Apply adaptive scaling if needed
    const MAX_DIM = 2048;
    if (width > MAX_DIM || height > MAX_DIM) {
      const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
      const outCanvas = document.createElement('canvas');
      outCanvas.width = width * scale;
      outCanvas.height = height * scale;
      const outCtx = outCanvas.getContext('2d');
      if (outCtx) {
        outCtx.imageSmoothingEnabled = true;
        outCtx.imageSmoothingQuality = 'high';
        outCtx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height);
        return { dataUrl: outCanvas.toDataURL('image/jpeg', 0.85), width: outCanvas.width, height: outCanvas.height };
      }
    }

    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height };
  };

  const handleLayerSwitch = async (index: number) => {
    if (!originalBufferRef.current) return;
    setIsDecoding(true);
    setDecodingStep(`Switching to Layer ${index}...`);
    try {
      const GeoTIFF = (window as any).GeoTIFF;
      const tiff = await GeoTIFF.fromArrayBuffer(originalBufferRef.current);
      const { dataUrl } = await convertGeoTiffImage(tiff, index);
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

  const processTiff = async (buffer: ArrayBuffer, fileName: string, onStep: (step: string) => void) => {
    onStep("Loading GeoTIFF Engine");
    await loadGeoTIFF();
    const GeoTIFF = (window as any).GeoTIFF;
    
    onStep("Reading File Architecture");
    const tiff = await GeoTIFF.fromArrayBuffer(buffer);
    const imageCount = await tiff.getImageCount();
    
    const discovered: TiffLayer[] = [];
    for (let i = 0; i < Math.min(imageCount, 10); i++) {
      const img = await tiff.getImage(i);
      discovered.push({ index: i, width: img.getWidth(), height: img.getHeight(), thumbnail: null });
    }
    setLayers(discovered);

    // Auto-select largest layer
    const best = [...discovered].sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
    
    setMetadata({
      fileName,
      fileSize: (buffer.byteLength / 1024 / 1024).toFixed(2) + " MB",
      magic: "GeoTIFF",
      layers: imageCount,
      activeLayer: best.index
    });

    onStep("Extracting Scientific Data");
    const { dataUrl } = await convertGeoTiffImage(tiff, best.index);
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
      setDecodingStep("Parsing Bytes...");
      try {
        const buffer = await file.arrayBuffer();
        originalBufferRef.current = buffer;
        const dataUrl = await processTiff(buffer, file.name, setDecodingStep);
        setLocalSrc(dataUrl);
        updateAttributes({ src: dataUrl });
      } catch (err: any) {
        setImageLoadError(`GeoTIFF Error: ${err.message}. Your file might use an unsupported compression. Try converting it to PNG first.`);
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

  // Coordinates mapping
  const getNormalizedPoint = (e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
  };

  const calculateMeanIntensity = useCallback((roi: Annotation) => {
    if (!imageRef.current || !imageRef.current.complete) return '0.0';
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '0.0';
    ctx.drawImage(img, 0, 0);
    const p1 = roi.points[0], p2 = roi.points[1];
    const x = Math.min(p1.x, p2.x) * (img.naturalWidth / 100), y = Math.min(p1.y, p2.y) * (img.naturalHeight / 100);
    const w = Math.abs(p1.x - p2.x) * (img.naturalWidth / 100), h = Math.abs(p1.y - p2.y) * (img.naturalHeight / 100);
    if (w < 1 || h < 1) return '0.0';
    try {
      const data = ctx.getImageData(x, y, w, h).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      return (sum / (data.length / 4)).toFixed(1);
    } catch { return '0.0'; }
  }, []);

  const calculateDistance = useCallback((points: { x: number, y: number }[]) => {
    const p1 = points[0], p2 = points[1];
    if (!p1 || !p2) return '0.0 px';
    const distPx = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    if (calibration.ratio > 0) return (distPx * calibration.ratio).toFixed(1) + ' µm';
    return distPx.toFixed(1) + ' px';
  }, [calibration]);

  const startDrawing = (e: React.MouseEvent) => {
    if (activeTool === 'select' || (!localSrc && !src) || imageLoadError || isDecoding) return;
    setIsDrawing(true); setCurrentPoints([getNormalizedPoint(e)]);
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
      const um = parseFloat(window.prompt('Real length (µm):', '100') || '0');
      if (um > 0) {
        const pxDist = Math.sqrt(Math.pow(currentPoints[0].x - currentPoints[1].x, 2) + Math.pow(currentPoints[0].y - currentPoints[1].y, 2));
        updateAttributes({ calibration: { px: pxDist, um, ratio: um / pxDist } });
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
      const w = canvas.width, h = canvas.height;
      annotations.forEach((anno: Annotation) => {
        const p1 = { x: (anno.points[0].x / 100) * w, y: (anno.points[0].y / 100) * h };
        const p2 = { x: (anno.points[1].x / 100) * w, y: (anno.points[1].y / 100) * h };
        ctx.strokeStyle = anno.color || '#3b82f6'; ctx.lineWidth = 2;
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
        onMouseDown={startDrawing} onMouseMove={drawMove} onMouseUp={endDrawing}
      >
        {localSrc || src ? (
          <>
            <img ref={imageRef} src={localSrc || src} className="max-w-full h-auto cursor-crosshair select-none" onError={() => setImageLoadError("Browser failed image buffer render.")} />
            {imageLoadError && (
              <div className="absolute inset-0 bg-neutral-900/90 flex flex-col items-center justify-center p-10 text-center z-50 backdrop-blur-md">
                <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                <h3 className="text-xl font-bold text-white mb-2">Display Error</h3>
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
          <div className="flex flex-col items-center gap-6 p-20 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
            <div className="w-32 h-32 rounded-[3.5rem] bg-neutral-900 border-2 border-dashed border-neutral-800 flex items-center justify-center group-hover:border-blue-500/50 transition-all duration-500">
              <Upload className="w-12 h-12 text-neutral-600 group-hover:text-blue-500 transition-colors" />
            </div>
            <div className="text-center">
              <h4 className="text-white text-lg font-bold uppercase tracking-widest">Scientific Upload</h4>
              <p className="text-neutral-500 text-[10px] mt-2 tracking-[0.2em]">GeoTIFF / PNG / JPG</p>
            </div>
          </div>
        )}

        {isDecoding && (
          <div className="absolute inset-0 bg-black/95 z-40 flex flex-col items-center justify-center p-10 backdrop-blur-2xl">
            <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-10" />
            <h4 className="text-blue-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-8">{decodingStep}</h4>
            {metadata && (
              <div className="w-full max-w-sm bg-neutral-900/50 rounded-2xl p-6 border border-white/5">
                <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500 mb-4">
                  <span>Detected Layers</span>
                  <span className="text-blue-400">{layers.length}</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide py-1">
                  {layers.map((_, i) => (
                    <button key={i} onClick={() => handleLayerSwitch(i)} className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 transition-all flex items-center justify-center ${metadata.activeLayer === i ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-neutral-600 hover:border-white/20'}`}>
                      <span className="text-[10px]">{i}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {(localSrc || src) && !isDecoding && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-neutral-950/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all">
            <ToolIcon active={activeTool === 'select'} onClick={() => setActiveTool('select')} icon={<MousePointer2 className="w-4 h-4" />} />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolIcon active={activeTool === 'calibrate'} onClick={() => setActiveTool('calibrate')} icon={<Maximize className="w-4 h-4" />} />
            <ToolIcon active={activeTool === 'measure'} onClick={() => setActiveTool('measure')} icon={<Ruler className="w-4 h-4" />} />
            <ToolIcon active={activeTool === 'roi'} onClick={() => setActiveTool('roi')} icon={<Target className="w-4 h-4 text-emerald-400" />} />
            <div className="w-px h-4 bg-white/10 mx-1" />
            <ToolIcon active={false} onClick={() => updateAttributes({ annotations: [], src: null })} icon={<Trash2 className="w-4 h-4 text-red-500" />} />
            <ToolIcon active={false} onClick={() => fileInputRef.current?.click()} icon={<Upload className="w-4 h-4 text-neutral-400" />} />
          </div>
        )}
      </div>
      <input type="file" ref={fileInputRef} className="hidden" accept=".tif,.tiff,image/*" onChange={handleImageUpload} />
    </NodeViewWrapper>
  );
};

const ToolIcon = ({ active, onClick, icon }: any) => (
  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }} className={`p-3 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:bg-white/5 hover:text-white'}`}>{icon}</button>
);
