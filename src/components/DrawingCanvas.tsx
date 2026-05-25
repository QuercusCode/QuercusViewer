import React, { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
    isActive: boolean;
    color: string;
    brushSize?: number;
    clearTrigger?: any; // changing this clears the canvas
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
    isActive,
    color,
    brushSize = 3,
    clearTrigger
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Handle resizing to match container size and preserve drawing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;

        const updateSize = () => {
            const rect = parent.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Save drawing to temporary canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx && canvas.width > 0 && canvas.height > 0) {
                tempCtx.drawImage(canvas, 0, 0);
            }

            canvas.width = rect.width;
            canvas.height = rect.height;

            const ctx = canvas.getContext('2d');
            if (ctx && tempCanvas.width > 0 && tempCanvas.height > 0) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.drawImage(tempCanvas, 0, 0, rect.width, rect.height);
            }
        };

        updateSize();
        
        // Use a ResizeObserver for robust layout changes
        const resizeObserver = new ResizeObserver(() => {
            updateSize();
        });
        resizeObserver.observe(parent);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    // Clear canvas when trigger changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [clearTrigger]);

    const getContext = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = color;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
        return ctx;
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;
        
        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isActive) return;
        const coords = getCoordinates(e);
        if (!coords) return;
        setIsDrawing(true);
        lastPos.current = coords;
    };

    const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !isActive) return;
        const coords = getCoordinates(e);
        if (!coords) return;
        const ctx = getContext();
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            lastPos.current = coords;
        }
    };

    const handleEnd = () => {
        setIsDrawing(false);
    };

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full z-[35] transition-opacity duration-300 ${isActive ? 'pointer-events-auto cursor-crosshair opacity-100' : 'pointer-events-none opacity-40'}`}
            style={{ touchAction: 'none' }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
        />
    );
};
