/**
 * LayerMask Pro 2.0 - Main Application Component
 * AI-Powered Image Editor with Virtual Try-On
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Components
import { Toolbar } from './components/Toolbar';
import { LayerList } from './components/LayerList';
import { ToastContainer } from './components/Toast';
import { LoadingModal, ConfirmModal } from './components/Modal';
import { AITryOnModal, TryOnOptions } from './components/AITryOnModal';
import { UpscaleModal, UpscaleOptions } from './components/UpscaleModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { MobileToolbar } from './components/MobileToolbar';
import { ImageCompareModal } from './components/ImageCompareModal';
import { APISettingsModal } from './components/APISettingsModal';
import { CloudSettingsModal } from './components/CloudSettingsModal';

// Cloud Storage
import {
  handleDropboxCallback,
  uploadToDropbox,
  getAutoUploadSettings,
  isDropboxConnected,
} from './api/dropbox';

// Hooks
import { useToast } from './hooks/useToast';
import { useHistory } from './hooks/useHistory';
import { useKeyboard } from './hooks/useKeyboard';

// Utils
import {
  loadImageFromFile,
  loadImageFromBase64,
  createLayerMask,
  composeLayers,
  downloadCanvas,
  createThumbnail,
  drawBrushStroke,
  interpolatePoints,
  canvasToBase64,
  applyMaskToLayer,
} from './utils/canvas';
import {
  loadFaceModels,
  detectSingleFace,
  calculateFaceAlignment,
  createInvertedFaceMask,
  isFaceApiAvailable,
} from './utils/face';

// API
import { initGemini, geminiTryOn, isGeminiConfigured } from './api/gemini';
import { initOpenAI, openaiTryOn, isOpenAIConfigured } from './api/openai';
import { initReplicate, replicateUpscale, isReplicateConfigured } from './api/replicate';

// Types
import type { Layer, ToolType, BrushSettings, ViewTransform } from './types';

const App: React.FC = () => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State - Layers
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // State - Tools
  const [activeTool, setActiveTool] = useState<ToolType>('TRANSFORM');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 50,
    hardness: 0.8,
    mode: 'ERASE',
    opacity: 1,
    flow: 1,
  });

  // State - View
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ x: 0, y: 0, scale: 1 });
  const [isComparing, setIsComparing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });

  // State - Interaction
  const [isPainting, setIsPainting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointer, setLastPointer] = useState({ x: 0, y: 0 });
  const [lastClientPos, setLastClientPos] = useState({ x: 0, y: 0 }); // Raw client position for panning
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, layerX: 0, layerY: 0 });

  // State - Pinch-to-zoom for mobile
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [lastPinchCenter, setLastPinchCenter] = useState({ x: 0, y: 0 });

  // State - Modals
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [showUpscaleModal, setShowUpscaleModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showConfirmNew, setShowConfirmNew] = useState(false);
  const [pendingNewProjectFile, setPendingNewProjectFile] = useState<File | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareImages, setCompareImages] = useState<{ before: string; after: string } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  // State - Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  // Hooks
  const { toasts, showToast, dismissToast } = useToast();
  const { saveState, undo, redo, canUndo, canRedo, clearHistory } = useHistory();

  // Get selected layer
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  // Initialize API keys from localStorage or env
  useEffect(() => {
    const geminiKey = localStorage.getItem('gemini_api_key');
    const openaiKey = localStorage.getItem('openai_api_key');
    const replicateKey = localStorage.getItem('replicate_api_key');
    if (geminiKey) initGemini(geminiKey);
    if (openaiKey) initOpenAI(openaiKey);
    if (replicateKey) initReplicate(replicateKey);
    // Also try to init from env variables
    initReplicate();
  }, []);

  // Handle Dropbox OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      // Remove code from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Exchange code for token
      handleDropboxCallback(code)
        .then(() => {
          showToast({ type: 'success', message: 'Dropbox connected successfully!' });
        })
        .catch((err) => {
          showToast({ type: 'error', message: err.message || 'Failed to connect Dropbox' });
        });
    }
  }, [showToast]);

  // Store previous layer count to detect when new layer is added
  const prevLayerCountRef = React.useRef(0);

  // Auto-fit when new layer is added (especially important on mobile)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    // Only auto-fit when layer count increases (new layer added)
    if (isMobile && layers.length > prevLayerCountRef.current && layers.length > 0) {
      const container = containerRef.current;
      if (!container) return;

      // Calculate bounding box of all visible layers
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const layer of layers) {
        if (!layer.visible || !layer.image) continue;
        const layerRight = layer.x + layer.image.width * layer.scale;
        const layerBottom = layer.y + layer.image.height * layer.scale;
        minX = Math.min(minX, layer.x);
        minY = Math.min(minY, layer.y);
        maxX = Math.max(maxX, layerRight);
        maxY = Math.max(maxY, layerBottom);
      }

      if (minX === Infinity) return; // No visible layers

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const rect = container.getBoundingClientRect();
      const padding = 16;

      const scaleX = (rect.width - padding * 2) / contentWidth;
      const scaleY = (rect.height - padding * 2) / contentHeight;
      const scale = Math.min(scaleX, scaleY, 2);

      // Center the content
      const x = (rect.width - contentWidth * scale) / 2 - minX * scale;
      const y = (rect.height - contentHeight * scale) / 2 - minY * scale;
      setViewTransform({ x, y, scale });
    }
    prevLayerCountRef.current = layers.length;
  }, [layers]);

  // Canvas rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, rect.width, rect.height);
    drawCheckerboard(ctx, rect.width, rect.height);

    ctx.save();
    ctx.translate(viewTransform.x, viewTransform.y);
    ctx.scale(viewTransform.scale, viewTransform.scale);

    // Draw layers
    const layersToDraw = isComparing ? layers.filter(l => l.type === 'BASE') : layers;

    for (const layer of layersToDraw) {
      if (!layer.visible || !layer.image) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;

      const centerX = layer.x + (layer.image.width * layer.scale) / 2;
      const centerY = layer.y + (layer.image.height * layer.scale) / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);

      if (layer.mask && layer.type === 'OVERLAY') {
        const temp = document.createElement('canvas');
        temp.width = layer.image.width;
        temp.height = layer.image.height;
        const tempCtx = temp.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(layer.image, 0, 0);
          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.drawImage(layer.mask, 0, 0);
          ctx.drawImage(temp, layer.x, layer.y, layer.image.width * layer.scale, layer.image.height * layer.scale);
        }
      } else {
        ctx.drawImage(layer.image, layer.x, layer.y, layer.image.width * layer.scale, layer.image.height * layer.scale);
      }

      ctx.restore();
    }

    // Draw selection outline
    if (selectedLayer?.image && activeTool === 'TRANSFORM') {
      ctx.save();
      const centerX = selectedLayer.x + (selectedLayer.image.width * selectedLayer.scale) / 2;
      const centerY = selectedLayer.y + (selectedLayer.image.height * selectedLayer.scale) / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((selectedLayer.rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2 / viewTransform.scale;
      ctx.setLineDash([5 / viewTransform.scale, 5 / viewTransform.scale]);
      ctx.strokeRect(selectedLayer.x, selectedLayer.y, selectedLayer.image.width * selectedLayer.scale, selectedLayer.image.height * selectedLayer.scale);
      ctx.restore();
    }

    ctx.restore();
  }, [layers, selectedLayer, viewTransform, activeTool, isComparing]);

  // Render loop
  useEffect(() => {
    let animationId: number;
    const animate = () => {
      renderCanvas();
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationId);
  }, [renderCanvas]);

  // Layer management
  const createNewProject = useCallback(async (file: File) => {
    try {
      setIsProcessing(true);
      setProcessingMessage('Loading image...');
      const image = await loadImageFromFile(file);
      setCanvasSize({ width: image.width, height: image.height });

      const baseLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: 'Background',
        type: 'BASE',
        image,
        mask: null,
        x: 0, y: 0,
        width: image.width,
        height: image.height,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        blendMode: 'source-over',
        thumbnail: createThumbnail(image),
      };

      setLayers([baseLayer]);
      setSelectedLayerId(baseLayer.id);
      clearHistory();
      setTimeout(() => fitToScreen(), 100);

      // Auto upload base image to Dropbox if enabled
      const autoUploadSettings = getAutoUploadSettings();
      if (autoUploadSettings.enabled && autoUploadSettings.uploadBase && isDropboxConnected()) {
        setProcessingMessage('Uploading to Dropbox...');
        const imageData = canvasToBase64(image);
        const filename = `base-${Date.now()}.png`;
        const uploadResult = await uploadToDropbox(imageData, filename, autoUploadSettings.folder);
        if (uploadResult.success) {
          showToast({ type: 'success', message: `Project created & uploaded to ${uploadResult.path}` });
        } else {
          showToast({ type: 'success', message: 'Project created (Dropbox upload failed)' });
        }
      } else {
        showToast({ type: 'success', message: 'Project created' });
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to load image' });
    } finally {
      setIsProcessing(false);
    }
  }, [clearHistory, showToast]);

  const handleNewProject = useCallback(async (file: File) => {
    if (layers.length > 0) {
      setPendingNewProjectFile(file);
      setShowConfirmNew(true);
      return;
    }
    await createNewProject(file);
  }, [layers, createNewProject]);

  const handleAddLayer = useCallback(async (file: File) => {
    if (layers.length === 0) {
      showToast({ type: 'warning', message: 'Please create a project first' });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingMessage('Adding layer...');
      const image = await loadImageFromFile(file);
      const mask = createLayerMask(image.width, image.height);

      const baseLayer = layers.find((l) => l.type === 'BASE');
      const x = baseLayer ? (baseLayer.width - image.width) / 2 : 0;
      const y = baseLayer ? (baseLayer.height - image.height) / 2 : 0;

      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: `Layer ${layers.length}`,
        type: 'OVERLAY',
        image, mask, x, y,
        width: image.width,
        height: image.height,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        blendMode: 'source-over',
        thumbnail: createThumbnail(image),
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);

      // Auto upload overlay to Dropbox if enabled
      const autoUploadSettings = getAutoUploadSettings();
      if (autoUploadSettings.enabled && autoUploadSettings.uploadOverlay && isDropboxConnected()) {
        setProcessingMessage('Uploading to Dropbox...');
        const imageData = canvasToBase64(image);
        const filename = `overlay-${Date.now()}.png`;
        const uploadResult = await uploadToDropbox(imageData, filename, autoUploadSettings.folder);
        if (uploadResult.success) {
          showToast({ type: 'success', message: `Layer added & uploaded to ${uploadResult.path}` });
        } else {
          showToast({ type: 'success', message: 'Layer added (Dropbox upload failed)' });
        }
      } else {
        showToast({ type: 'success', message: 'Layer added' });
      }
    } catch {
      showToast({ type: 'error', message: 'Failed to add layer' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, showToast]);

  const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
    setLayers((prev) => prev.map((layer) => layer.id === id ? { ...layer, ...updates } : layer));
  }, []);

  const deleteLayer = useCallback((id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer || layer.type === 'BASE') return;
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(layers[0]?.id || null);
    showToast({ type: 'info', message: 'Layer deleted' });
  }, [layers, selectedLayerId, showToast]);

  const reorderLayers = useCallback((fromIndex: number, toIndex: number) => {
    setLayers((prev) => {
      const newLayers = [...prev];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return newLayers;
    });
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    updateLayer(id, { visible: !layers.find((l) => l.id === id)?.visible });
  }, [layers, updateLayer]);

  // Pointer handling
  const getPointerPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - viewTransform.x) / viewTransform.scale,
      y: (e.clientY - rect.top - viewTransform.y) / viewTransform.scale,
    };
  }, [viewTransform]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const pos = getPointerPos(e);
    setLastPointer(pos);
    setLastClientPos({ x: e.clientX, y: e.clientY }); // Save raw position for panning

    if (activeTool === 'HAND' || e.button === 1) {
      setIsPanning(true);
      return;
    }

    if (activeTool === 'BRUSH' && selectedLayer?.mask) {
      setIsPainting(true);
      saveState(selectedLayer);
      paint(pos.x, pos.y);
      return;
    }

    if (activeTool === 'TRANSFORM' && selectedLayer?.image) {
      const layerRight = selectedLayer.x + selectedLayer.image.width * selectedLayer.scale;
      const layerBottom = selectedLayer.y + selectedLayer.image.height * selectedLayer.scale;
      if (pos.x >= selectedLayer.x && pos.x <= layerRight && pos.y >= selectedLayer.y && pos.y <= layerBottom) {
        setIsDragging(true);
        setDragStart({ x: pos.x, y: pos.y, layerX: selectedLayer.x, layerY: selectedLayer.y });
      }
    }
  }, [activeTool, selectedLayer, getPointerPos, saveState]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Don't process pointer move during pinch gesture
    if (isPinching) return;

    const pos = getPointerPos(e);

    if (isPanning) {
      // Use client position delta instead of movementX/Y for better mobile support
      const dx = e.clientX - lastClientPos.x;
      const dy = e.clientY - lastClientPos.y;
      setViewTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastClientPos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isPainting && selectedLayer?.mask) {
      const points = interpolatePoints(lastPointer.x, lastPointer.y, pos.x, pos.y, Math.max(brushSettings.size / 4, 1));
      for (const point of points) paint(point.x, point.y);
    }

    if (isDragging && selectedLayer) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      updateLayer(selectedLayer.id, { x: dragStart.layerX + dx, y: dragStart.layerY + dy });
    }

    setLastPointer(pos);
  }, [isPinching, isPanning, isPainting, isDragging, selectedLayer, lastPointer, lastClientPos, dragStart, brushSettings, getPointerPos, updateLayer]);

  const handlePointerUp = useCallback(() => {
    setIsPainting(false);
    setIsDragging(false);
    setIsPanning(false);
  }, []);

  // Touch handlers for pinch-to-zoom on mobile
  const getTouchDistance = (touches: React.TouchList): number => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: React.TouchList): { x: number; y: number } => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Two finger touch - start pinch
      e.preventDefault();
      setIsPinching(true);
      setIsPanning(false);
      setIsDragging(false);
      setIsPainting(false);
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      setLastPinchDistance(distance);
      setLastPinchCenter(center);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const center = getTouchCenter(e.touches);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate zoom
      const scaleDelta = distance / lastPinchDistance;
      const newScale = Math.min(Math.max(viewTransform.scale * scaleDelta, 0.1), 10);

      // Zoom towards pinch center
      const centerX = center.x - rect.left;
      const centerY = center.y - rect.top;
      const newX = centerX - ((centerX - viewTransform.x) / viewTransform.scale) * newScale;
      const newY = centerY - ((centerY - viewTransform.y) / viewTransform.scale) * newScale;

      // Also pan based on center movement
      const panDx = center.x - lastPinchCenter.x;
      const panDy = center.y - lastPinchCenter.y;

      setViewTransform({
        x: newX + panDx,
        y: newY + panDy,
        scale: newScale,
      });

      setLastPinchDistance(distance);
      setLastPinchCenter(center);
    }
  }, [isPinching, lastPinchDistance, lastPinchCenter, viewTransform]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
  }, []);

  const paint = useCallback((x: number, y: number) => {
    if (!selectedLayer?.mask) return;
    const ctx = selectedLayer.mask.getContext('2d');
    if (!ctx) return;
    const maskX = (x - selectedLayer.x) / selectedLayer.scale;
    const maskY = (y - selectedLayer.y) / selectedLayer.scale;
    const adjustedSize = brushSettings.size / selectedLayer.scale;
    drawBrushStroke(ctx, maskX, maskY, adjustedSize, brushSettings.hardness, brushSettings.mode === 'ERASE');
    setLayers((prev) => [...prev]);
  }, [selectedLayer, brushSettings]);

  // View controls
  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const baseLayer = layers.find((l) => l.type === 'BASE');
    if (!container || !baseLayer?.image) return;

    const rect = container.getBoundingClientRect();
    // Less padding on mobile for better view
    const isMobile = rect.width < 768;
    const padding = isMobile ? 16 : 40;
    const scaleX = (rect.width - padding * 2) / baseLayer.image.width;
    const scaleY = (rect.height - padding * 2) / baseLayer.image.height;
    // Allow scale > 1 on mobile if image is smaller than screen
    const maxScale = isMobile ? 2 : 1;
    const scale = Math.min(scaleX, scaleY, maxScale);
    const x = (rect.width - baseLayer.image.width * scale) / 2;
    const y = (rect.height - baseLayer.image.height * scale) / 2;
    setViewTransform({ x, y, scale });
  }, [layers]);

  const zoomIn = useCallback(() => {
    setViewTransform((prev) => ({ ...prev, scale: Math.min(prev.scale * 1.2, 10) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewTransform((prev) => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.1) }));
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(viewTransform.scale * delta, 0.1), 10);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newX = mouseX - ((mouseX - viewTransform.x) / viewTransform.scale) * newScale;
    const newY = mouseY - ((mouseY - viewTransform.y) / viewTransform.scale) * newScale;
    setViewTransform({ x: newX, y: newY, scale: newScale });
  }, [viewTransform]);

  // AI Features
  const handleAutoAlign = useCallback(async () => {
    if (!isFaceApiAvailable()) {
      showToast({ type: 'error', message: 'Face detection not available' });
      return;
    }

    const baseLayer = layers.find((l) => l.type === 'BASE');
    // Try selected overlay first, then fall back to any overlay
    let overlayLayer = layers.find((l) => l.type === 'OVERLAY' && l.id === selectedLayerId);
    if (!overlayLayer) {
      // Find the last (topmost) overlay layer
      overlayLayer = [...layers].reverse().find((l) => l.type === 'OVERLAY');
    }

    if (!baseLayer?.image) {
      showToast({ type: 'warning', message: 'Cần có ảnh gốc (base layer)' });
      return;
    }

    if (!overlayLayer?.image) {
      showToast({ type: 'warning', message: 'Cần có ảnh overlay để căn chỉnh' });
      return;
    }

    // Auto-select the overlay layer
    if (selectedLayerId !== overlayLayer.id) {
      setSelectedLayerId(overlayLayer.id);
    }

    try {
      setIsProcessing(true);
      setProcessingMessage('Đang tải mô hình nhận diện khuôn mặt...');
      await loadFaceModels();

      setProcessingMessage('Đang phát hiện khuôn mặt...');
      const [baseFace, overlayFace] = await Promise.all([
        detectSingleFace(baseLayer.image),
        detectSingleFace(overlayLayer.image),
      ]);

      if (!baseFace) {
        showToast({ type: 'error', message: 'Không thể phát hiện khuôn mặt trong ảnh gốc' });
        return;
      }

      if (!overlayFace) {
        showToast({ type: 'error', message: 'Không thể phát hiện khuôn mặt trong ảnh overlay' });
        return;
      }

      setProcessingMessage('Đang tính toán vị trí...');
      // Pass base dimensions for minimum coverage calculation (90% coverage)
      const alignment = calculateFaceAlignment(
        baseFace,
        overlayFace,
        overlayLayer.image.width,
        overlayLayer.image.height,
        baseLayer.image.width,
        baseLayer.image.height,
        0.9
      );
      // Use inverted mask: hide overlay's face to reveal base's face underneath
      const faceMask = createInvertedFaceMask(overlayLayer.image.width, overlayLayer.image.height, overlayFace, 0.3, 1.15);

      updateLayer(overlayLayer.id, {
        x: alignment.x,
        y: alignment.y,
        scale: alignment.scale,
        rotation: alignment.rotation,
        mask: faceMask,
      });

      showToast({ type: 'success', message: 'Căn chỉnh khuôn mặt thành công!' });
    } catch (error) {
      console.error('Auto align error:', error);
      showToast({ type: 'error', message: 'Căn chỉnh thất bại. Hãy thử ảnh khác.' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, selectedLayerId, showToast, updateLayer]);

  const handleAITryOn = useCallback(async (options: TryOnOptions) => {
    const baseLayer = layers.find((l) => l.type === 'BASE');
    if (!baseLayer?.image) {
      showToast({ type: 'warning', message: 'Need a base image first' });
      return;
    }

    if (options.provider === 'GEMINI' && !isGeminiConfigured()) {
      showToast({ type: 'error', message: 'Gemini API key not configured' });
      return;
    }
    if (options.provider === 'OPENAI' && !isOpenAIConfigured()) {
      showToast({ type: 'error', message: 'OpenAI API key not configured' });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingMessage('Processing with AI...');

      const personImage = canvasToBase64(baseLayer.image);
      const request = {
        provider: options.provider,
        mode: options.mode,
        personImage,
        clothingImage: options.clothingImage,
        clothingDescription: options.clothingDescription,
        preserveFace: options.preserveFace,
        enhanceQuality: options.enhanceQuality,
      };

      const response = options.provider === 'GEMINI' ? await geminiTryOn(request) : await openaiTryOn(request);

      if (!response.success || !response.resultImage) {
        showToast({ type: 'error', message: response.error || 'AI processing failed' });
        return;
      }

      setProcessingMessage('Loading result...');
      const resultImage = await loadImageFromBase64(response.resultImage);

      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: 'AI Result',
        type: 'AI_GENERATED',
        image: resultImage,
        mask: null,
        x: 0, y: 0,
        width: resultImage.width,
        height: resultImage.height,
        scale: baseLayer.image.width / resultImage.width,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        blendMode: 'source-over',
        thumbnail: createThumbnail(resultImage),
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      showToast({ type: 'success', message: `AI Try-On complete (${Math.round((response.processingTime || 0) / 1000)}s)` });
    } catch (error) {
      console.error('AI Try-On error:', error);
      showToast({ type: 'error', message: 'AI processing failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, showToast]);

  const handleAIUpscale = useCallback(async (options: UpscaleOptions) => {
    if (!isReplicateConfigured()) {
      showToast({ type: 'error', message: 'Replicate API key not configured' });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingMessage(`Upscaling ${options.scale}x... This may take 30-120 seconds`);

      let imageToUpscale: string;

      if (options.mode === 'layer') {
        // Upscale selected layer only (with mask applied - face area removed)
        const selectedLayer = layers.find(l => l.id === selectedLayerId);
        if (!selectedLayer?.image) {
          showToast({ type: 'warning', message: 'No layer selected' });
          return;
        }
        // Apply mask to layer (face area becomes transparent)
        const maskedLayer = applyMaskToLayer(selectedLayer.image, selectedLayer.mask);
        imageToUpscale = canvasToBase64(maskedLayer);
      } else {
        // Upscale full composite
        if (layers.length === 0) {
          showToast({ type: 'warning', message: 'No layers to upscale' });
          return;
        }
        const composite = composeLayers(layers, canvasSize.width, canvasSize.height);
        imageToUpscale = canvasToBase64(composite);
      }

      // Save before image for comparison
      const beforeImage = imageToUpscale;

      const response = await replicateUpscale({
        image: imageToUpscale,
        scale: options.scale,
        enhanceFace: options.enhanceFace,
      });

      if (!response.success || !response.resultImage) {
        showToast({ type: 'error', message: response.error || 'Upscale failed' });
        return;
      }

      // Create new layer with upscaled image
      const upscaledImage = await loadImageFromBase64(response.resultImage);
      const newLayer: Layer = {
        id: `layer-${Date.now()}`,
        name: `Upscaled ${options.scale}x`,
        type: 'AI_GENERATED',
        image: upscaledImage,
        mask: null,
        x: 0,
        y: 0,
        width: upscaledImage.width,
        height: upscaledImage.height,
        scale: 1,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        blendMode: 'source-over',
        thumbnail: createThumbnail(upscaledImage),
      };

      setLayers(prev => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);

      // Show comparison modal
      setCompareImages({
        before: beforeImage,
        after: response.resultImage,
      });
      setShowCompareModal(true);

      // Auto upload to Dropbox if enabled
      const autoUploadSettings = getAutoUploadSettings();
      if (autoUploadSettings.enabled && autoUploadSettings.uploadUpscale && isDropboxConnected()) {
        setProcessingMessage('Uploading to Dropbox...');
        const filename = `upscaled-${options.scale}x-${Date.now()}.png`;
        const uploadResult = await uploadToDropbox(response.resultImage, filename, autoUploadSettings.folder);
        if (uploadResult.success) {
          showToast({ type: 'success', message: `Upscaled & uploaded to ${uploadResult.path}` });
        } else {
          const timeStr = response.processingTime
            ? ` (${(response.processingTime / 1000).toFixed(1)}s)`
            : '';
          showToast({ type: 'success', message: `Upscaled${timeStr} (Dropbox upload failed)` });
        }
      } else {
        const timeStr = response.processingTime
          ? ` (${(response.processingTime / 1000).toFixed(1)}s)`
          : '';
        showToast({ type: 'success', message: `Upscaled to ${options.scale}x successfully${timeStr}` });
      }
    } catch (error) {
      console.error('Upscale error:', error);
      showToast({ type: 'error', message: 'Upscale failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, selectedLayerId, canvasSize, showToast]);

  // Project management
  const handleSaveProject = useCallback(() => {
    const projectData = {
      version: '2.0.0',
      canvasSize,
      layers: layers.map((layer) => ({
        ...layer,
        image: layer.image ? canvasToBase64(layer.image) : null,
        mask: layer.mask ? canvasToBase64(layer.mask) : null,
      })),
      selectedLayerId,
    };

    const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `layermask-project-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', message: 'Project saved' });
  }, [layers, selectedLayerId, canvasSize, showToast]);

  const handleLoadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsProcessing(true);
        setProcessingMessage('Loading project...');
        const text = await file.text();
        const projectData = JSON.parse(text);

        const loadedLayers: Layer[] = [];
        for (const layerData of projectData.layers) {
          const image = layerData.image ? await loadImageFromBase64(layerData.image) : null;
          const mask = layerData.mask ? await loadImageFromBase64(layerData.mask) : null;
          loadedLayers.push({ ...layerData, image, mask });
        }

        setLayers(loadedLayers);
        setSelectedLayerId(projectData.selectedLayerId);
        setCanvasSize(projectData.canvasSize);
        clearHistory();
        setTimeout(fitToScreen, 100);
        showToast({ type: 'success', message: 'Project loaded' });
      } catch {
        showToast({ type: 'error', message: 'Failed to load project' });
      } finally {
        setIsProcessing(false);
      }
    };
    input.click();
  }, [clearHistory, fitToScreen, showToast]);

  const handleExport = useCallback(async () => {
    if (layers.length === 0) {
      showToast({ type: 'warning', message: 'Nothing to export' });
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingMessage('Exporting...');

      // Calculate the actual bounds of all visible layers
      const visibleLayers = layers.filter(l => l.visible && l.image);
      let maxWidth = canvasSize.width;
      let maxHeight = canvasSize.height;

      for (const layer of visibleLayers) {
        if (layer.image) {
          const layerWidth = layer.x + (layer.width || layer.image.width) * layer.scale;
          const layerHeight = layer.y + (layer.height || layer.image.height) * layer.scale;
          maxWidth = Math.max(maxWidth, layerWidth, layer.image.width * layer.scale);
          maxHeight = Math.max(maxHeight, layerHeight, layer.image.height * layer.scale);
        }
      }

      // Use the largest dimensions for export
      const exportWidth = Math.ceil(maxWidth);
      const exportHeight = Math.ceil(maxHeight);

      const composite = composeLayers(
        layers.map((l) => ({
          image: l.image,
          mask: l.mask,
          x: l.x,
          y: l.y,
          scale: l.scale,
          rotation: l.rotation,
          opacity: l.opacity,
          visible: l.visible,
          blendMode: l.blendMode,
        })),
        exportWidth,
        exportHeight
      );

      const filename = `layermask-export-${Date.now()}.png`;
      await downloadCanvas(composite, filename);

      // Auto upload to Dropbox if enabled
      const autoUploadSettings = getAutoUploadSettings();
      if (autoUploadSettings.enabled && autoUploadSettings.uploadExport && isDropboxConnected()) {
        setProcessingMessage('Uploading to Dropbox...');
        const imageData = canvasToBase64(composite);
        const uploadResult = await uploadToDropbox(imageData, filename, autoUploadSettings.folder);
        if (uploadResult.success) {
          showToast({ type: 'success', message: `Exported & uploaded to ${uploadResult.path}` });
        } else {
          console.error('Dropbox upload failed:', uploadResult.error);
          showToast({ type: 'warning', message: `Exported (Dropbox: ${uploadResult.error || 'upload failed'})` });
        }
      } else {
        showToast({ type: 'success', message: 'Image exported' });
      }
    } catch {
      showToast({ type: 'error', message: 'Export failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, canvasSize, showToast]);

  // Upload current canvas to Dropbox
  const handleUploadToCloud = useCallback(async () => {
    if (layers.length === 0) {
      showToast({ type: 'warning', message: 'Nothing to upload' });
      return;
    }

    if (!isDropboxConnected()) {
      showToast({ type: 'warning', message: 'Please connect Dropbox first' });
      return;
    }

    try {
      setIsProcessing(true);
      const settings = getAutoUploadSettings();
      const timestamp = Date.now();
      const uploadResults: string[] = [];
      let uploadFailed = false;

      // Find different layer types
      const baseLayer = layers.find(l => l.type === 'BASE' && l.image);
      const upscaleLayer = layers.find(l => l.type === 'AI_GENERATED' && l.image);
      const overlayLayers = layers.filter(l => l.type === 'OVERLAY' && l.image);

      // Logic: If upscale exists -> upload base + upscale
      //        If no upscale -> upload base + overlays
      const hasUpscale = !!upscaleLayer;

      // 1. Upload base image
      if (baseLayer?.image) {
        setProcessingMessage('Uploading base image...');
        const imageData = canvasToBase64(baseLayer.image);
        const filename = `base-${timestamp}.png`;
        const result = await uploadToDropbox(imageData, filename, settings.folder);
        if (result.success) {
          uploadResults.push('base');
        } else {
          uploadFailed = true;
        }
      }

      // 2. If has upscale -> upload upscale, else upload overlays
      if (hasUpscale && upscaleLayer?.image) {
        setProcessingMessage('Uploading upscaled image...');
        const imageData = canvasToBase64(upscaleLayer.image);
        const filename = `upscaled-${timestamp}.png`;
        const result = await uploadToDropbox(imageData, filename, settings.folder);
        if (result.success) {
          uploadResults.push('upscaled');
        } else {
          uploadFailed = true;
        }
      } else if (!hasUpscale && overlayLayers.length > 0) {
        // Upload all overlay layers
        for (let i = 0; i < overlayLayers.length; i++) {
          const layer = overlayLayers[i];
          if (layer.image) {
            setProcessingMessage(`Uploading overlay ${i + 1}/${overlayLayers.length}...`);
            const imageData = canvasToBase64(layer.image);
            const filename = `overlay-${i + 1}-${timestamp}.png`;
            const result = await uploadToDropbox(imageData, filename, settings.folder);
            if (result.success) {
              uploadResults.push(`overlay-${i + 1}`);
            } else {
              uploadFailed = true;
            }
          }
        }
      }

      // Show result
      if (uploadResults.length > 0) {
        const msg = uploadFailed
          ? `Uploaded ${uploadResults.length} images (some failed)`
          : `Uploaded ${uploadResults.length} images: ${uploadResults.join(', ')}`;
        showToast({ type: uploadFailed ? 'warning' : 'success', message: msg });
      } else {
        showToast({ type: 'error', message: 'No images uploaded' });
      }
    } catch {
      showToast({ type: 'error', message: 'Upload failed' });
    } finally {
      setIsProcessing(false);
    }
  }, [layers, showToast]);

  // Keyboard shortcuts
  useKeyboard({
    onUndo: () => undo(layers, setLayers),
    onRedo: () => redo(layers, setLayers),
    onBrushTool: () => setActiveTool('BRUSH'),
    onTransformTool: () => setActiveTool('TRANSFORM'),
    onHandTool: () => setActiveTool('HAND'),
    onEraserMode: () => setBrushSettings((prev) => ({ ...prev, mode: 'ERASE' })),
    onRestoreMode: () => setBrushSettings((prev) => ({ ...prev, mode: 'RESTORE' })),
    onBrushSizeDecrease: () => setBrushSettings((prev) => ({ ...prev, size: Math.max(prev.size - 10, 1) })),
    onBrushSizeIncrease: () => setBrushSettings((prev) => ({ ...prev, size: Math.min(prev.size + 10, 200) })),
    onSave: handleSaveProject,
    onOpen: handleLoadProject,
    onExport: handleExport,
    onFitToScreen: fitToScreen,
    onZoom100: () => setViewTransform((prev) => ({ ...prev, scale: 1 })),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onDelete: () => selectedLayerId && deleteLayer(selectedLayerId),
    onEscape: () => setSelectedLayerId(null),
  });

  return (
    <div className="h-screen flex bg-dark-900 overflow-hidden">
      {/* Toolbar - Desktop */}
      <div className="hidden lg:block">
        <Toolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          brushSettings={brushSettings}
          onBrushSettingsChange={(settings) => setBrushSettings((prev) => ({ ...prev, ...settings }))}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => undo(layers, setLayers)}
          onRedo={() => redo(layers, setLayers)}
          zoom={viewTransform.scale}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitToScreen={fitToScreen}
          onToggleCompare={() => setIsComparing(!isComparing)}
          isComparing={isComparing}
          selectedLayerOpacity={selectedLayer?.opacity || 1}
          selectedLayerRotation={selectedLayer?.rotation || 0}
          selectedLayerScale={selectedLayer?.scale || 1}
          onOpacityChange={(v) => selectedLayerId && updateLayer(selectedLayerId, { opacity: v })}
          onRotationChange={(v) => selectedLayerId && updateLayer(selectedLayerId, { rotation: v })}
          onScaleChange={(v) => selectedLayerId && updateLayer(selectedLayerId, { scale: v })}
          hasSelectedLayer={!!selectedLayer}
          onAutoAlign={handleAutoAlign}
          onAITryOn={() => setShowTryOnModal(true)}
          onAIUpscale={() => setShowUpscaleModal(true)}
          isProcessing={isProcessing}
          onNewProject={handleNewProject}
          onAddLayer={handleAddLayer}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
          onExport={handleExport}
          onUploadToCloud={handleUploadToCloud}
          isCloudConnected={isDropboxConnected()}
          onShowShortcuts={() => setShowShortcutsModal(true)}
          onShowSettings={() => setShowSettingsModal(true)}
          onShowCloud={() => setShowCloudModal(true)}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={containerRef} className="flex-1 canvas-container" onWheel={handleWheel}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{
              cursor: activeTool === 'HAND' ? 'grab' : activeTool === 'BRUSH' ? 'crosshair' : 'default',
              touchAction: 'none', // Prevent browser gestures on mobile
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      </div>

      {/* Layer Panel - Desktop */}
      <div className="hidden lg:block w-64 glass-panel-sm m-2 ml-0 overflow-hidden">
        <LayerList
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onToggleVisibility={toggleLayerVisibility}
          onDeleteLayer={deleteLayer}
          onReorderLayer={reorderLayers}
          onAddLayer={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleAddLayer(file);
            };
            input.click();
          }}
        />
      </div>

      {/* Modals */}
      <LoadingModal isOpen={isProcessing} message={processingMessage} />

      <AITryOnModal
        isOpen={showTryOnModal}
        onClose={() => setShowTryOnModal(false)}
        onSubmit={handleAITryOn}
        personImagePreview={layers.find((l) => l.type === 'BASE')?.thumbnail}
      />

      <UpscaleModal
        isOpen={showUpscaleModal}
        onClose={() => setShowUpscaleModal(false)}
        onSubmit={handleAIUpscale}
        imagePreview={selectedLayer?.thumbnail}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      <APISettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <CloudSettingsModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
      />

      {compareImages && (
        <ImageCompareModal
          isOpen={showCompareModal}
          onClose={() => {
            setShowCompareModal(false);
            setCompareImages(null);
          }}
          beforeImage={compareImages.before}
          afterImage={compareImages.after}
          beforeLabel="Gốc"
          afterLabel="Đã Upscale"
        />
      )}

      <ConfirmModal
        isOpen={showConfirmNew}
        onClose={() => {
          setShowConfirmNew(false);
          setPendingNewProjectFile(null);
        }}
        onConfirm={() => {
          if (pendingNewProjectFile) {
            createNewProject(pendingNewProjectFile);
          }
          setShowConfirmNew(false);
          setPendingNewProjectFile(null);
        }}
        title="New Project"
        message="This will clear the current project. Continue?"
        confirmText="Yes, start new"
        cancelText="Cancel"
        danger
      />

      {/* Mobile Toolbar */}
      <MobileToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        brushSettings={brushSettings}
        onBrushSettingsChange={(settings) => setBrushSettings((prev) => ({ ...prev, ...settings }))}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={() => undo(layers, setLayers)}
        onRedo={() => redo(layers, setLayers)}
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onToggleVisibility={toggleLayerVisibility}
        onDeleteLayer={deleteLayer}
        onAddLayer={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleAddLayer(file);
          };
          input.click();
        }}
        onAutoAlign={handleAutoAlign}
        onAITryOn={() => setShowTryOnModal(true)}
        onAIUpscale={() => setShowUpscaleModal(true)}
        onExport={handleExport}
        onSaveProject={handleSaveProject}
        onLoadProject={handleLoadProject}
        onNewProject={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleNewProject(file);
          };
          input.click();
        }}
        isProcessing={isProcessing}
        onShowSettings={() => setShowSettingsModal(true)}
        onShowCloud={() => setShowCloudModal(true)}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

// Helper function
function drawCheckerboard(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = 10;
  const colors = ['#1e293b', '#0f172a'];
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const colorIndex = ((x / size) + (y / size)) % 2;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, size, size);
    }
  }
}

export default App;
