
import React, { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onEnd: (dataUrl: string | null) => void;
  disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onEnd, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(ratio, ratio);
  }, []);

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in event) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Blue 900 for clearer signature
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    e.preventDefault();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasSignature(true);
    if (canvasRef.current) {
      onEnd(canvasRef.current.toDataURL());
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
    onEnd(null);
  };

  return (
    // Note: Signature pad stays with a light background to ensure the signature (image) is always high contrast for reports
    <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-100 overflow-hidden touch-none transition-colors">
      <canvas
        ref={canvasRef}
        className="w-full h-32 cursor-crosshair block"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      {!hasSignature && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-[10px] font-black uppercase tracking-widest">
          Firma táctil del Supervisor
        </div>
      )}
      <button
        type="button"
        onClick={clear}
        disabled={disabled}
        className="absolute top-2 right-2 p-2 bg-gray-100 hover:bg-gray-200 dark:hover:bg-gray-300 rounded-xl text-gray-600 transition-colors shadow-sm"
        title="Borrar Firma"
      >
        <Eraser size={16} />
      </button>
    </div>
  );
};

export default SignaturePad;
