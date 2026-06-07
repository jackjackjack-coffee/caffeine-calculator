// Result shape returned by the worker — mirrors the app's AnalysisResult.

export type RecognitionMethod = 'label_ocr' | 'product_recognition' | 'estimate';

export interface AnalysisResult {
  caffeine_mg: number;
  confidence: number; // 0..1
  method: RecognitionMethod;
  product_name: string;
  serving_ml?: number | null;
  source_text?: string | null;
  source?: string | null;
}

export interface VisionEnv {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
  VISION_PROVIDER?: string;
}
