// Provider-agnostic vision adapter. v1 implements Google Gemini (free tier).
// To add Anthropic Claude later, implement analyzeWithClaude and branch on
// env.VISION_PROVIDER — the rest of the worker/app stays unchanged.

import type { AnalysisResult, RecognitionMethod, VisionEnv } from './types';

const PROMPT = `You are a caffeine estimator. Look at the photo of a drink (or its label/packaging) and report the caffeine for the serving shown.

Decide the method, in this priority order:
1. "label_ocr": a caffeine amount is printed on the label (e.g. Korean "총 카페인 함량 100mg", "카페인 함량", or "caffeine 80mg"). Read the exact number. Put the literal text you read in source_text. Use high confidence (0.9-1.0).
2. "product_recognition": no printed number, but you recognize the specific branded drink (e.g. a Starbucks Tall Americano, Red Bull 250ml). Estimate caffeine for that product/size. Medium-high confidence (0.6-0.85).
3. "estimate": you can only tell the drink type and rough size (e.g. "a latte", "a cup of drip coffee"). Estimate from typical values. Lower confidence (0.3-0.6).

Rules:
- caffeine_mg is the total caffeine in milligrams for the serving depicted.
- If you truly cannot tell, return method "estimate", a best-guess number, and low confidence.
- serving_ml: the drink volume in mL if known, else omit.
- product_name: a short human name for the drink.
Respond ONLY with the structured JSON.`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    caffeine_mg: { type: 'number' },
    confidence: { type: 'number' },
    method: { type: 'string', enum: ['label_ocr', 'product_recognition', 'estimate'] },
    product_name: { type: 'string' },
    serving_ml: { type: 'number' },
    source_text: { type: 'string' },
  },
  required: ['caffeine_mg', 'confidence', 'method', 'product_name'],
} as const;

/** Entry point: dispatch to the configured provider. */
export async function analyze(base64: string, env: VisionEnv): Promise<AnalysisResult> {
  const provider = env.VISION_PROVIDER ?? 'gemini';
  switch (provider) {
    case 'gemini':
      return analyzeWithGemini(base64, env);
    // case 'claude': return analyzeWithClaude(base64, env); // future
    default:
      throw new Error(`Unknown VISION_PROVIDER: ${provider}`);
  }
}

async function analyzeWithGemini(base64: string, env: VisionEnv): Promise<AnalysisResult> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  const model = env.GEMINI_MODEL ?? 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gemini error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');

  const parsed = JSON.parse(text) as Partial<AnalysisResult>;
  return normalize(parsed);
}

/** Clamp/validate the model output into a safe AnalysisResult. */
function normalize(p: Partial<AnalysisResult>): AnalysisResult {
  const method: RecognitionMethod =
    p.method === 'label_ocr' || p.method === 'product_recognition' ? p.method : 'estimate';
  const caffeine = Number(p.caffeine_mg);
  const confidence = Number(p.confidence);
  return {
    caffeine_mg: Number.isFinite(caffeine) ? Math.max(0, Math.round(caffeine)) : 0,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.3,
    method,
    product_name: (p.product_name || 'Unknown drink').toString().slice(0, 120),
    serving_ml: p.serving_ml != null ? Number(p.serving_ml) : null,
    source_text: p.source_text ? p.source_text.toString().slice(0, 300) : null,
    source: method === 'label_ocr' ? 'Label' : method === 'product_recognition' ? 'Recognized' : 'Estimate',
  };
}
