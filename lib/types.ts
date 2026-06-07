// Shared domain types for the Caffeine Calculator app and worker.

export type RecognitionMethod =
  | 'barcode'
  | 'label_ocr'
  | 'product_recognition'
  | 'estimate'
  | 'manual';

/** Structured result of analysing one snap (returned by the worker / cascade). */
export interface AnalysisResult {
  caffeine_mg: number;
  /** 0..1 — how sure we are about the number. */
  confidence: number;
  method: RecognitionMethod;
  product_name: string;
  serving_ml?: number | null;
  /** Raw text the model read off a label, if any. */
  source_text?: string | null;
  /** Human-readable provenance, e.g. "Label", "Open Food Facts", "Reference table". */
  source?: string | null;
}

export interface DrinkSize {
  label: string;
  ml: number;
  caffeine_mg: number;
}

export interface DrinkReference {
  id: string;
  name: { en: string; ko: string };
  category: string;
  brand?: string;
  region?: string;
  serving_ml?: number;
  caffeine_mg?: number;
  per_100ml?: number;
  range_per_100ml?: [number, number];
  sizes?: DrinkSize[];
  keywords: string[];
  source: string;
  last_verified: string;
}

export interface IntakeEntry {
  id: number;
  caffeine_mg: number;
  product_name: string;
  method: RecognitionMethod;
  /** epoch milliseconds */
  consumed_at: number;
}

export type Locale = 'en' | 'ko';

export interface UserProfile {
  weight_kg: number;
  age: number;
  is_pregnant: boolean;
  /** Personal caffeine half-life, hours (default 5). */
  half_life_hours: number;
  locale: Locale;
}
