// Pure caffeine math: official daily limits + first-order (half-life) decay.
// No React Native / Expo imports here so it is trivially unit-testable.

import type { IntakeEntry, UserProfile } from './types';

export const ADULT_DAILY_LIMIT_MG = 400;
export const ADULT_SINGLE_DOSE_MG = 200;
export const PREGNANCY_DAILY_LIMIT_MG = 200; // stricter of EFSA(200)/식약처(300)
export const MINOR_MG_PER_KG = 2.5; // 식약처; EFSA uses 3
export const DEFAULT_HALF_LIFE_HOURS = 5;

const MS_PER_HOUR = 3_600_000;

export type LimitBasis = 'adult' | 'pregnancy' | 'minor';

export interface LimitInfo {
  dailyLimitMg: number;
  /** null when no official single-dose cap is defined for this group. */
  singleDoseMg: number | null;
  basis: LimitBasis;
}

/** Official daily caffeine limit for a profile (the app's source of truth). */
export function dailyLimit(
  profile: Pick<UserProfile, 'age' | 'weight_kg' | 'is_pregnant'>
): LimitInfo {
  if (profile.is_pregnant) {
    return { dailyLimitMg: PREGNANCY_DAILY_LIMIT_MG, singleDoseMg: null, basis: 'pregnancy' };
  }
  if (profile.age < 18) {
    return {
      dailyLimitMg: Math.round(MINOR_MG_PER_KG * profile.weight_kg),
      singleDoseMg: null,
      basis: 'minor',
    };
  }
  return { dailyLimitMg: ADULT_DAILY_LIMIT_MG, singleDoseMg: ADULT_SINGLE_DOSE_MG, basis: 'adult' };
}

/** Remaining amount of a single dose after `elapsedHours` (first-order decay). */
export function decayedAmount(originalMg: number, elapsedHours: number, halfLifeHours: number): number {
  if (elapsedHours <= 0) return originalMg;
  if (halfLifeHours <= 0) return originalMg;
  return originalMg * Math.pow(0.5, elapsedHours / halfLifeHours);
}

/** Total caffeine still circulating at time `atMs`, summed over all past doses. */
export function caffeineInSystem(
  entries: Pick<IntakeEntry, 'caffeine_mg' | 'consumed_at'>[],
  atMs: number,
  halfLifeHours: number
): number {
  return entries.reduce((sum, e) => {
    const elapsedHours = (atMs - e.consumed_at) / MS_PER_HOUR;
    if (elapsedHours < 0) return sum; // future dose, ignore
    return sum + decayedAmount(e.caffeine_mg, elapsedHours, halfLifeHours);
  }, 0);
}

/** Sum of intake whose timestamp falls within [startMs, endMs). */
export function totalBetween(
  entries: Pick<IntakeEntry, 'caffeine_mg' | 'consumed_at'>[],
  startMs: number,
  endMs: number
): number {
  return entries.reduce(
    (sum, e) => (e.consumed_at >= startMs && e.consumed_at < endMs ? sum + e.caffeine_mg : sum),
    0
  );
}

export interface DecayPoint {
  /** epoch ms */
  t: number;
  mg: number;
}

/** Projected "caffeine in your system" curve from now into the future. */
export function decayCurve(
  entries: Pick<IntakeEntry, 'caffeine_mg' | 'consumed_at'>[],
  fromMs: number,
  hoursAhead: number,
  stepMinutes: number,
  halfLifeHours: number
): DecayPoint[] {
  const points: DecayPoint[] = [];
  const stepMs = stepMinutes * 60_000;
  const endMs = fromMs + hoursAhead * MS_PER_HOUR;
  for (let t = fromMs; t <= endMs; t += stepMs) {
    points.push({ t, mg: caffeineInSystem(entries, t, halfLifeHours) });
  }
  return points;
}

/**
 * Hours from `fromMs` until circulating caffeine drops below `thresholdMg`.
 * Returns 0 if already below. Useful for a "safe to sleep" estimate.
 */
export function hoursUntilBelow(
  entries: Pick<IntakeEntry, 'caffeine_mg' | 'consumed_at'>[],
  fromMs: number,
  thresholdMg: number,
  halfLifeHours: number
): number {
  let current = caffeineInSystem(entries, fromMs, halfLifeHours);
  if (current <= thresholdMg) return 0;
  // Closed-form would require per-dose handling; step forward in 5-min increments.
  const stepHours = 5 / 60;
  let hours = 0;
  const maxHours = 48;
  while (hours < maxHours) {
    hours += stepHours;
    current = caffeineInSystem(entries, fromMs + hours * MS_PER_HOUR, halfLifeHours);
    if (current <= thresholdMg) break;
  }
  return Math.round(hours * 10) / 10;
}
