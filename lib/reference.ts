// Loads and queries the seed caffeine reference table (data/caffeine_reference.json).
// Pure logic — safe to unit-test.

import referenceData from '../data/caffeine_reference.json';
import type { DrinkReference, Locale } from './types';

const drinks = referenceData.drinks as DrinkReference[];

export function allDrinks(): DrinkReference[] {
  return drinks;
}

export function getDrink(id: string): DrinkReference | undefined {
  return drinks.find((d) => d.id === id);
}

export function localizedName(d: DrinkReference, locale: Locale): string {
  return d.name[locale] ?? d.name.en;
}

/**
 * Best-effort match of a free-text product name (e.g. from the vision model)
 * against the reference table keywords. Case-insensitive, substring either way.
 * Scores by number + length of matching keywords so a specific brand match
 * ("Starbucks Americano") beats a generic one that shares one word ("americano").
 */
export function findByKeyword(query: string): DrinkReference | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase();
  let best: DrinkReference | undefined;
  let bestScore = 0;
  for (const d of drinks) {
    let matches = 0;
    let longest = 0;
    for (const k of d.keywords) {
      const kw = k.toLowerCase();
      if (q.includes(kw) || kw.includes(q)) {
        matches += 1;
        longest = Math.max(longest, kw.length);
      }
    }
    if (matches === 0) continue;
    const score = matches * 100 + longest;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export interface ResolvedCaffeine {
  caffeine_mg: number;
  serving_ml?: number;
  sizeLabel?: string;
}

/**
 * Resolve a caffeine value for a reference entry. For multi-size entries,
 * picks the requested size, else a sensible middle/default size.
 */
export function caffeineFor(d: DrinkReference, sizeLabel?: string): ResolvedCaffeine {
  if (d.sizes && d.sizes.length > 0) {
    const chosen = sizeLabel
      ? d.sizes.find((s) => s.label.toLowerCase() === sizeLabel.toLowerCase())
      : undefined;
    const size = chosen ?? d.sizes[Math.floor(d.sizes.length / 2)];
    return { caffeine_mg: size.caffeine_mg, serving_ml: size.ml, sizeLabel: size.label };
  }
  return { caffeine_mg: d.caffeine_mg ?? 0, serving_ml: d.serving_ml };
}
