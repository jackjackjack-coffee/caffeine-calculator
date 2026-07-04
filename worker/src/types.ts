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

/** Workers rate limiting binding (wrangler.toml [[unsafe.bindings]] type = "ratelimit"). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface VisionEnv {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
  VISION_PROVIDER?: string;
  /** Optional shared secret; when set, /analyze requires X-App-Key to match. */
  APP_KEY?: string;
  /** Optional per-IP rate limiter binding. */
  ANALYZE_LIMITER?: RateLimiter;
}
