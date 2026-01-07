/**
 * Image Compare Modal Component
 * Slider comparison to show before/after upscale results
 */

import React, { useState, useRef, useCallback } from 'react';
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

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    [isDragging]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(percentage);
    },
    []
  );

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
        <div className="flex gap-2 justify-center">
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
                  : 'bg-dark-700/50 text-dark-300 hover:text-white'
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
            className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white disabled:opacity-50"
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            disabled={zoom <= 0.5}
          >
            <ZoomOutIcon size={18} />
          </button>
          <span className="text-sm text-dark-400 w-16 text-center">{Math.round(zoom * 100)}%</span>
          <button
            className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white disabled:opacity-50"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            disabled={zoom >= 3}
          >
            <ZoomInIcon size={18} />
          </button>
        </div>

        {/* Compare Container */}
        <div className="relative bg-dark-900 rounded-xl overflow-hidden" style={{ height: '60vh' }}>
          {viewMode === 'slider' && (
            <div
              ref={containerRef}
              className="relative w-full h-full cursor-ew-resize select-none overflow-auto"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={handleTouchMove}
            >
              {/* After Image (Full) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src={afterImage}
                  alt="After"
                  className="max-w-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  draggable={false}
                />
              </div>

              {/* Before Image (Clipped) */}
              <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={beforeImage}
                  alt="Before"
                  className="max-w-none"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  draggable={false}
                />
              </div>

              {/* Slider Line */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
                style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                {/* Slider Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <div className="flex gap-0.5">
                    <div className="w-0.5 h-4 bg-dark-600 rounded-full" />
                    <div className="w-0.5 h-4 bg-dark-600 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/60 rounded-lg text-sm text-white">
                {beforeLabel}
              </div>
              <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 rounded-lg text-sm text-white">
                {afterLabel}
              </div>
            </div>
          )}

          {viewMode === 'side-by-side' && (
            <div className="flex h-full">
              <div className="flex-1 flex flex-col border-r border-dark-700">
                <div className="px-3 py-2 bg-dark-800/80 text-sm text-center text-dark-300">
                  {beforeLabel}
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                  <img
                    src={beforeImage}
                    alt="Before"
                    className="max-w-none"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                  />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-2 bg-dark-800/80 text-sm text-center text-dark-300">
                  {afterLabel}
                </div>
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                  <img
                    src={afterImage}
                    alt="After"
                    className="max-w-none"
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
                  className="max-w-none transition-opacity duration-300"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                />
              </div>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded-lg text-sm text-white">
                {showAfter ? afterLabel : beforeLabel}
              </div>
              <button
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-xl text-white font-medium transition-all"
                onClick={() => setShowAfter(!showAfter)}
              >
                Xem {showAfter ? beforeLabel : afterLabel}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            className="btn-secondary"
            onClick={() => handleDownload(beforeImage, 'before')}
          >
            <DownloadIcon size={16} />
            Tải {beforeLabel}
          </button>
          <button
            className="btn-primary"
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
