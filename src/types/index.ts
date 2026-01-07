// ==================== TYPES ====================
export type LayerType = 'BASE' | 'OVERLAY' | 'AI_GENERATED';

export type ToolType = 'SELECT' | 'TRANSFORM' | 'BRUSH' | 'ERASER' | 'HAND' | 'ZOOM';

export type BrushMode = 'ERASE' | 'RESTORE';

export type AIProvider = 'GEMINI' | 'OPENAI';

export type TryOnMode = 'VIRTUAL_TRYON' | 'AI_GENERATE' | 'SEGMENT_REPLACE';

// ==================== INTERFACES ====================
export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  image: HTMLCanvasElement | null;
  mask: HTMLCanvasElement | null;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blendMode: GlobalCompositeOperation;
  thumbnail?: string;
}

export interface BrushSettings {
  size: number;
  hardness: number;
  mode: BrushMode;
  opacity: number;
  flow: number;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}

export interface HistoryItem {
  layerId: string;
  maskData: ImageData;
}

export interface ProjectState {
  layers: Layer[];
  selectedLayerId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  version: string;
}

export interface AITryOnRequest {
  provider: AIProvider;
  mode: TryOnMode;
  personImage: string;         // Base64
  clothingImage?: string;      // Base64 (for VIRTUAL_TRYON)
  clothingDescription?: string; // Text (for AI_GENERATE)
  preserveFace?: boolean;
  enhanceQuality?: boolean;
}

export interface AITryOnResponse {
  success: boolean;
  resultImage?: string;        // Base64
  error?: string;
  processingTime?: number;
}

export interface UpscaleRequest {
  image: string;               // Base64
  scale: 2 | 4 | 8 | 10;
  enhanceFace?: boolean;
}

export interface UpscaleResponse {
  success: boolean;
  resultImage?: string;
  error?: string;
}

export interface FaceDetectionResult {
  x: number;
  y: number;
  width: number;
  height: number;
  landmarks?: FaceLandmarks;
  angle: number;
}

export interface FaceLandmarks {
  leftEye: Point;
  rightEye: Point;
  nose: Point;
  leftMouth: Point;
  rightMouth: Point;
  jawLine: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface FaceAlignment {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

// ==================== UI TYPES ====================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export type Theme = 'dark' | 'light';

export interface AppSettings {
  theme: Theme;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  autoSave: boolean;
  preferredAIProvider: AIProvider;
}

// ==================== CONTEXT TYPES ====================
export interface AppContextType {
  // Layers
  layers: Layer[];
  selectedLayerId: string | null;
  setSelectedLayerId: (id: string | null) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  removeLayer: (id: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Tools
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  brushSettings: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  // View
  viewTransform: ViewTransform;
  setViewTransform: (transform: ViewTransform) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Canvas
  canvasWidth: number;
  canvasHeight: number;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Toast
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
}
