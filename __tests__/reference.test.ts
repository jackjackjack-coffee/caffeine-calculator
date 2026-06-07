import { caffeineFor, findByKeyword, getDrink } from '../lib/reference';

describe('reference table', () => {
  it('finds a branded drink by keyword', () => {
    const d = findByKeyword('a Starbucks Americano, tall');
    expect(d?.id).toBe('starbucks-kr-americano');
  });

  it('matches Korean keywords', () => {
    const d = findByKeyword('핫식스 마셨어요');
    expect(d?.id).toBe('hot6');
  });

  it('returns undefined for an unknown drink', () => {
    expect(findByKeyword('unicorn frappe xyz')).toBeUndefined();
  });

  it('resolves a single-value drink', () => {
    const drip = getDrink('drip-coffee')!;
    expect(caffeineFor(drip).caffeine_mg).toBe(95);
  });

  it('resolves a requested size and falls back to a default size', () => {
    const sb = getDrink('starbucks-kr-americano')!;
    expect(caffeineFor(sb, 'Tall').caffeine_mg).toBe(150);
    // default (middle) size when none requested
    expect(caffeineFor(sb).caffeine_mg).toBeGreaterThan(0);
  });
});
