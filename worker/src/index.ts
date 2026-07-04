// Cloudflare Worker: POST /analyze { image_base64 } -> AnalysisResult JSON.
// Holds the Gemini API key as a secret; the mobile app never sees it.

import { analyze } from './vision';
import type { VisionEnv } from './types';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-App-Key',
  'Access-Control-Max-Age': '86400',
};

// A 0.5-quality phone JPEG is well under 2 MB; base64 inflates ~4/3.
// Anything past this is not a legitimate app capture.
const MAX_BODY_BYTES = 8 * 1024 * 1024;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export default {
  async fetch(request: Request, env: VisionEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({ ok: true, service: 'caffeine-analyze' });
    }

    if (url.pathname === '/analyze' && request.method === 'POST') {
      // Optional shared app secret: set `wrangler secret put APP_KEY` and ship
      // the same value in the app to shut out third-party callers entirely.
      if (env.APP_KEY && request.headers.get('X-App-Key') !== env.APP_KEY) {
        return json({ error: 'Unauthorized' }, 401);
      }

      // Optional per-client rate limit (Workers rate limiting binding).
      if (env.ANALYZE_LIMITER) {
        const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
        try {
          const { success } = await env.ANALYZE_LIMITER.limit({ key: ip });
          if (!success) {
            return json({ error: 'Too many requests, slow down' }, 429);
          }
        } catch {
          // A limiter outage must not take the API down with it.
        }
      }

      const declared = Number(request.headers.get('Content-Length') ?? 0);
      if (declared > MAX_BODY_BYTES) {
        return json({ error: 'Image too large' }, 413);
      }

      let payload: { image_base64?: string };
      try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return json({ error: 'Image too large' }, 413);
        }
        payload = JSON.parse(raw) as { image_base64?: string };
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      const base64 = stripDataUrl(payload.image_base64);
      if (!base64) {
        return json({ error: 'Missing image_base64' }, 400);
      }

      try {
        const result = await analyze(base64, env);
        return json(result);
      } catch (err) {
        // Log the detail (may contain upstream diagnostics) server-side only;
        // clients get a stable, generic message.
        console.error('analyze failed:', err instanceof Error ? err.message : err);
        return json({ error: 'Analysis failed, please retry' }, 502);
      }
    }

    return json({ error: 'Not found' }, 404);
  },
};

/** Accept either a raw base64 string or a data URL (data:image/jpeg;base64,...). */
function stripDataUrl(input?: string): string | null {
  if (!input) return null;
  const comma = input.indexOf(',');
  if (input.startsWith('data:') && comma !== -1) {
    return input.slice(comma + 1);
  }
  return input;
}
