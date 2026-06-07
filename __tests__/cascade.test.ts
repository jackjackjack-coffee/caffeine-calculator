import { crossCheck, extractCaffeineMg, lookupBarcode, runCascade } from '../lib/cascade';
import type { AnalysisResult } from '../lib/types';

describe('extractCaffeineMg', () => {
  it('converts grams to mg for small values', () => {
    expect(extractCaffeineMg({ nutriments: { caffeine_serving: 0.08 } })).toBe(80);
  });
  it('parses string values', () => {
    expect(extractCaffeineMg({ nutriments: { caffeine_100g: '0.032' } })).toBe(32);
  });
  it('treats large values as already-mg', () => {
    expect(extractCaffeineMg({ nutriments: { caffeine_serving: 150 } })).toBe(150);
  });
  it('returns null when absent', () => {
    expect(extractCaffeineMg({ nutriments: {} })).toBeNull();
  });
});

describe('crossCheck', () => {
  it('keeps a label OCR reading untouched', () => {
    const r: AnalysisResult = {
      caffeine_mg: 120,
      confidence: 0.95,
      method: 'label_ocr',
      product_name: 'Some energy drink',
    };
    expect(crossCheck(r)).toEqual(r);
  });

  it('fills caffeine from the reference table when the model read no number', () => {
    const r: AnalysisResult = {
      caffeine_mg: 0,
      confidence: 0.5,
      method: 'product_recognition',
      product_name: 'Starbucks Americano',
    };
    const out = crossCheck(r);
    expect(out.caffeine_mg).toBeGreaterThan(0);
    expect(out.source).toContain('Reference');
  });

  it('keeps a model-provided number but annotates the source', () => {
    const r: AnalysisResult = {
      caffeine_mg: 90,
      confidence: 0.6,
      method: 'product_recognition',
      product_name: 'drip coffee',
    };
    const out = crossCheck(r);
    expect(out.caffeine_mg).toBe(90);
    expect(out.source).toContain('Reference');
  });
});

describe('barcode lookup', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns a barcode result when Open Food Facts has caffeine', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: { product_name: 'Test Cola', nutriments: { caffeine_serving: 0.034 } },
      }),
    }) as unknown as typeof fetch;

    const result = await lookupBarcode('1234567890123');
    expect(result).not.toBeNull();
    expect(result!.method).toBe('barcode');
    expect(result!.caffeine_mg).toBe(34);
    expect(result!.product_name).toBe('Test Cola');
  });

  it('runCascade returns the barcode hit without calling vision', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: { product_name: 'Monster', nutriments: { caffeine_serving: 0.16 } },
      }),
    }) as unknown as typeof fetch;

    const result = await runCascade({ barcode: '5060337500005', base64: 'fake' });
    expect(result.method).toBe('barcode');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
