// ============================================================
// Country dataset loader (server / shared). Built from mledoze/countries.
// ============================================================

import countriesJson from '@/data/countries.json';
import type { CountryRecord, GeographyRegion } from './types';

const ALL = countriesJson as CountryRecord[];

export function getAllCountries(): CountryRecord[] {
  return ALL;
}

export function getCountriesInRegions(
  regions: GeographyRegion[],
): CountryRecord[] {
  if (regions.length === 0) return ALL;
  const set = new Set(regions);
  return ALL.filter((c) => set.has(c.region));
}

export function getCountryByCode(code: string): CountryRecord | undefined {
  const upper = code.toUpperCase();
  return ALL.find((c) => c.code === upper);
}

/** Fisher–Yates shuffle (copy). */
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickDistractors(
  pool: CountryRecord[],
  correct: CountryRecord,
  n: number,
): CountryRecord[] {
  const others = shuffle(pool.filter((c) => c.code !== correct.code));
  return others.slice(0, n);
}
