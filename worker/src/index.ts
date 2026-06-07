// Cloudflare Worker: POST /analyze { image_base64 } -> AnalysisResult JSON.
// Holds the Gemini API key as a secret; the mobile app never sees it.

import { analyze } from './vision';
import type { VisionEnv } from './types';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
      let payload: { image_base64?: string };
      try {
        payload = (await request.json()) as { image_base64?: string };
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
        const message = err instanceof Error ? err.message : 'Analysis failed';
        return json({ error: message }, 502);
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
