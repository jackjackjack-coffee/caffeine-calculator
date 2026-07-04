// The recognition cascade: one snap, stop at the first confident result.
//   1. barcode  -> Open Food Facts
//   2. vision   -> Cloudflare Worker (/analyze) running Gemini
//   3. crossCheck against the seed reference table to fill / validate
//
// Network calls use the global `fetch`, so tests can mock it.

import Constants from 'expo-constants';
import type { AnalysisResult } from './types';
import { caffeineFor, findByKeyword } from './reference';

/** Public URL of the deployed worker's /analyze endpoint (from app.json extra). */
export function analyzeUrl(): string {
  const url = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.analyzeApiUrl;
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing expo.extra.analyzeApiUrl in app.json');
  }
  return url;
}

/**
 * fetch with a hard timeout — a hung request would otherwise leave the
 * camera screen on "analyzing…" forever. (Manual AbortController rather
 * than AbortSignal.timeout: Hermes doesn't guarantee the static helper.)
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const BARCODE_TIMEOUT_MS = 8_000;
const VISION_TIMEOUT_MS = 30_000;

/** Open Food Facts stores nutriment caffeine in grams; normalise to mg. */
export function extractCaffeineMg(product: { nutriments?: Record<string, unknown> }): number | null {
  const n = product?.nutriments ?? {};
  const candidates = [n.caffeine_serving, n.caffeine_value, n.caffeine_100g, n.caffeine];
  for (const c of candidates) {
    const num = typeof c === 'string' ? parseFloat(c) : (c as number);
    if (typeof num === 'number' && !Number.isNaN(num) && num > 0) {
      // OFF stores grams; small values (<5) are grams -> mg, larger are already mg.
      return Math.round(num < 5 ? num * 1000 : num);
    }
  }
  return null;
}

/** Step 1: look up a scanned barcode in Open Food Facts. */
export async function lookupBarcode(barcode: string): Promise<AnalysisResult | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode
  )}.json?fields=product_name,nutriments`;
  const res = await fetchWithTimeout(url, {}, BARCODE_TIMEOUT_MS);
  if (!res.ok) return null;
  const json = (await res.json()) as { status?: number; product?: Record<string, any> };
  const product = json.product;
  if (!product) return null;
  const mg = extractCaffeineMg(product);
  if (mg == null) return null;
  return {
    caffeine_mg: mg,
    confidence: 0.9,
    method: 'barcode',
    product_name: (product.product_name as string) || 'Scanned product',
    source: 'Open Food Facts',
  };
}

/** Optional shared secret matching the worker's APP_KEY (empty = not used). */
function analyzeAppKey(): string | null {
  const key = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.analyzeApiKey;
  return typeof key === 'string' && key.length > 0 ? key : null;
}

/** Step 2: send the photo to the worker for label OCR / recognition / estimate. */
export async function analyzeImage(base64: string): Promise<AnalysisResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const appKey = analyzeAppKey();
  if (appKey) headers['X-App-Key'] = appKey;
  const res = await fetchWithTimeout(
    analyzeUrl(),
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ image_base64: base64 }),
    },
    VISION_TIMEOUT_MS
  );
  if (!res.ok) {
    throw new Error(`Analyze request failed (${res.status})`);
  }
  return (await res.json()) as AnalysisResult;
}

/** Step 3: enrich/validate a vision result using the reference table. */
export function crossCheck(result: AnalysisResult): AnalysisResult {
  // A printed label reading is already the strongest signal.
  if (result.method === 'label_ocr' && result.caffeine_mg > 0) return result;

  const ref = result.product_name ? findByKeyword(result.product_name) : undefined;
  if (!ref) return result;

  const resolved = caffeineFor(ref);
  // Model produced a number: keep it, but note the corroborating reference.
  if (result.caffeine_mg > 0) {
    return { ...result, source: result.source ?? `Reference: ${ref.name.en}` };
  }
  // Model recognised a product but read no number: fill from the table.
  return {
    ...result,
    caffeine_mg: resolved.caffeine_mg,
    serving_ml: result.serving_ml ?? resolved.serving_ml ?? null,
    source: `Reference: ${ref.name.en}`,
  };
}

export interface CascadeInput {
  base64?: string;
  barcode?: string;
}

/** Orchestrates the full cascade and returns the best available result. */
export async function runCascade(input: CascadeInput): Promise<AnalysisResult> {
  if (input.barcode) {
    try {
      const byBarcode = await lookupBarcode(input.barcode);
      if (byBarcode) return byBarcode;
    } catch {
      // network/lookup failure -> fall through to vision
    }
  }
  if (input.base64) {
    const visioned = await analyzeImage(input.base64);
    return crossCheck(visioned);
  }
  throw new Error('No barcode match and no image provided to analyse.');
}
