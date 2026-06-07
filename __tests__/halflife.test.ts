import {
  ADULT_DAILY_LIMIT_MG,
  PREGNANCY_DAILY_LIMIT_MG,
  caffeineInSystem,
  dailyLimit,
  decayedAmount,
  hoursUntilBelow,
  totalBetween,
} from '../lib/halflife';

const HOUR = 3_600_000;

describe('dailyLimit', () => {
  it('returns the adult limit with a single-dose cap', () => {
    const info = dailyLimit({ age: 30, weight_kg: 70, is_pregnant: false });
    expect(info.dailyLimitMg).toBe(ADULT_DAILY_LIMIT_MG);
    expect(info.singleDoseMg).toBe(200);
    expect(info.basis).toBe('adult');
  });

  it('uses the stricter pregnancy limit regardless of age', () => {
    const info = dailyLimit({ age: 30, weight_kg: 70, is_pregnant: true });
    expect(info.dailyLimitMg).toBe(PREGNANCY_DAILY_LIMIT_MG);
    expect(info.basis).toBe('pregnancy');
  });

  it('computes a weight-based limit for minors (2.5 mg/kg)', () => {
    const info = dailyLimit({ age: 15, weight_kg: 60, is_pregnant: false });
    expect(info.dailyLimitMg).toBe(150);
    expect(info.basis).toBe('minor');
  });
});

describe('decayedAmount', () => {
  it('is unchanged at t=0', () => {
    expect(decayedAmount(100, 0, 5)).toBe(100);
  });
  it('halves after one half-life', () => {
    expect(decayedAmount(100, 5, 5)).toBeCloseTo(50, 5);
  });
  it('quarters after two half-lives', () => {
    expect(decayedAmount(100, 10, 5)).toBeCloseTo(25, 5);
  });
});

describe('caffeineInSystem', () => {
  const now = 1_700_000_000_000;
  it('sums decayed doses and ignores future doses', () => {
    const entries = [
      { caffeine_mg: 100, consumed_at: now - 5 * HOUR }, // -> ~50
      { caffeine_mg: 80, consumed_at: now }, // -> 80
      { caffeine_mg: 40, consumed_at: now + HOUR }, // future -> ignored
    ];
    expect(caffeineInSystem(entries, now, 5)).toBeCloseTo(130, 1);
  });
});

describe('totalBetween', () => {
  const start = 1_700_000_000_000;
  it('includes [start, end) only', () => {
    const entries = [
      { caffeine_mg: 50, consumed_at: start },
      { caffeine_mg: 30, consumed_at: start + HOUR },
      { caffeine_mg: 99, consumed_at: start - 1 },
    ];
    expect(totalBetween(entries, start, start + 2 * HOUR)).toBe(80);
  });
});

describe('hoursUntilBelow', () => {
  const now = 1_700_000_000_000;
  it('returns ~10h for 200mg to fall below 50mg at a 5h half-life', () => {
    const entries = [{ caffeine_mg: 200, consumed_at: now }];
    expect(hoursUntilBelow(entries, now, 50, 5)).toBeGreaterThanOrEqual(9.8);
    expect(hoursUntilBelow(entries, now, 50, 5)).toBeLessThanOrEqual(10.2);
  });
  it('returns 0 when already below the threshold', () => {
    const entries = [{ caffeine_mg: 10, consumed_at: now }];
    expect(hoursUntilBelow(entries, now, 50, 5)).toBe(0);
  });
});
