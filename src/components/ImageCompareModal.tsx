/**
 * Image Compare Modal Component
 * Slider comparison to show before/after upscale results
 * Optimized for both desktop and mobile touch
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal } from './Modal';
import { DownloadIcon, ZoomInIcon, ZoomOutIcon } from './Icons';

interface ImageCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  onDownload?: (image: string, filename: string) => void;
}

export const ImageCompareModal: React.FC<ImageCompareModalProps> = ({
  isOpen,
  onClose,
  beforeImage,
  afterImage,
  beforeLabel = 'Trước',
  afterLabel = 'Sau',
  onDownload,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side' | 'toggle'>('slider');
  const [showAfter, setShowAfter] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate position from client coordinates
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  }, [isDragging, updatePosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers - optimized for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    updatePosition(e.touches[0].clientX);
  }, [isDragging, updatePosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse/touch up handler for when cursor leaves the element
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalUp);
      window.addEventListener('touchend', handleGlobalUp);
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [isDragging]);

  // Click anywhere on container to move slider (tap to position)
  const handleContainerClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) {
      updatePosition(e.touches[0].clientX);
    } else {
      updatePosition(e.clientX);
    }
  }, [updatePosition]);

  const handleDownload = (image: string, type: 'before' | 'after') => {
    if (onDownload) {
      onDownload(image, `${type}-upscale.png`);
    } else {
      const link = document.createElement('a');
      link.href = image;
      link.download = `${type}-upscale.png`;
      link.click();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="So sánh kết quả" maxWidth="max-w-5xl">
      <div className="space-y-4">
        {/* View Mode Tabs */}
        <div className="flex gap-2 justify-center flex-wrap">
          {[
            { mode: 'slider', label: 'Kéo so sánh' },
            { mode: 'side-by-side', label: 'Cạnh nhau' },
            { mode: 'toggle', label: 'Chuyển đổi' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700/50 text-dark-300 hover:text-white active:bg-dark-600'
              }`}
              onClick={() => setViewMode(mode as typeof viewMode)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white active:bg-dark-600 disabled:opacity-50"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            disabled={zoom <= 0.5}
          >
            <ZoomOutIcon size={18} />
          </button>
          <span className="text-sm text-dark-400 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white active:bg-dark-600 disabled:opacity-50"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            disabled={zoom >= 3}
          >
            <ZoomInIcon size={18} />
          </button>
        </div>

        {/* Compare Container */}
        <div className="relative bg-dark-900 rounded-xl overflow-hidden" style={{ height: '55vh' }}>
          {viewMode === 'slider' && (
            <div
              ref={containerRef}
              className="relative w-full h-full select-none overflow-hidden"
              style={{ touchAction: 'none' }} // Prevent browser touch gestures
              onClick={handleContainerClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* After Image (Full) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src={afterImage}
                  alt="After"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  draggable={false}
                />
              </div>

              {/* Before Image (Clipped) */}
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={beforeImage}
                  alt="Before"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  draggable={false}
                />
              </div>

              {/* Slider Line - larger touch target */}
              <div
                className="absolute top-0 bottom-0 w-8 flex items-center justify-center cursor-ew-resize z-10"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                {/* Visible line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" />

                {/* Slider Handle - larger for touch */}
                <div className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-dark-300">
                  <div className="flex gap-1">
                    <div className="w-0.5 h-5 bg-dark-500 rounded-full" />
                    <div className="w-0.5 h-5 bg-dark-500 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-black/70 rounded text-xs text-white pointer-events-none">
                {beforeLabel}
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 rounded text-xs text-white pointer-events-none">
                {afterLabel}
              </div>

              {/* Instruction hint for mobile */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-xs text-white/70 pointer-events-none md:hidden">
                Kéo hoặc chạm để so sánh
              </div>
            </div>
          )}

          {viewMode === 'side-by-side' && (
            <div className="flex h-full flex-col md:flex-row">
              <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-dark-700">
                <div className="px-3 py-2 bg-dark-800/80 text-sm text-center text-dark-300">
                  {beforeLabel}
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-2">
                  <img
                    src={beforeImage}
                    alt="Before"
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-2 bg-dark-800/80 text-sm text-center text-dark-300">
                  {afterLabel}
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-2">
                  <img
                    src={afterImage}
                    alt="After"
                    className="max-w-full max-h-full object-contain"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'toggle' && (
            <div className="relative w-full h-full">
              <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4">
                <img
                  src={showAfter ? afterImage : beforeImage}
                  alt={showAfter ? 'After' : 'Before'}
                  className="max-w-full max-h-full object-contain transition-opacity duration-300"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                />
              </div>
              <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/70 rounded-lg text-sm text-white">
                {showAfter ? afterLabel : beforeLabel}
              </div>
              <button
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 rounded-xl text-white font-medium transition-all"
                onClick={() => setShowAfter(!showAfter)}
              >
                Xem {showAfter ? beforeLabel : afterLabel}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            className="btn-secondary text-sm"
            onClick={() => handleDownload(beforeImage, 'before')}
          >
            <DownloadIcon size={16} />
            Tải {beforeLabel}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => handleDownload(afterImage, 'after')}
          >
            <DownloadIcon size={16} />
            Tải {afterLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
