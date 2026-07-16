// ============================================================
// Deterministic geography question builder (NO LLM).
// ============================================================

import type { Question } from '@/lib/types';
import mapCodesJson from '@/data/map-codes.json';
import {
  getCountriesInRegions,
  pickDistractors,
  shuffle,
} from './countries';
import type {
  CountryRecord,
  GeographyConfig,
  GeographyType,
} from './types';

const MAP_CODES = new Set(mapCodesJson as string[]);

function mappable(pool: CountryRecord[]): CountryRecord[] {
  return pool.filter((c) => MAP_CODES.has(c.code));
}

function withCapital(pool: CountryRecord[]): CountryRecord[] {
  return pool.filter((c) => Boolean(c.capital));
}

function withCurrency(pool: CountryRecord[]): CountryRecord[] {
  return pool.filter((c) => c.currencies.length > 0);
}

function fourOptions(
  correctLabel: string,
  distractorLabels: string[],
): [string, string, string, string] {
  const opts = shuffle([correctLabel, ...distractorLabels]).slice(0, 4);
  while (opts.length < 4) opts.push(correctLabel + opts.length);
  return opts as [string, string, string, string];
}

function baseAccepted(name: string, official?: string): string[] {
  const out = [name];
  if (official && official !== name) out.push(official);
  return out;
}

function buildMapQuestion(
  country: CountryRecord,
  pool: CountryRecord[],
  mcMode: boolean,
  scopeCodes: string[],
): Question {
  const forceMc = !mcMode; // map ID always has options when MC off
  const distractors = pickDistractors(pool, country, 3);
  const options = fourOptions(
    country.name,
    distractors.map((d) => d.name),
  );
  return {
    // Stem is identical for all map IDs — uniqueness is map_country / answer.
    question: 'Which country is highlighted on the map?',
    options: mcMode || forceMc ? options : undefined,
    correct_answer: country.name,
    accepted_answers: baseAccepted(country.name, country.official),
    force_mc: forceMc || undefined,
    map_country: country.code,
    map_scope: scopeCodes,
  };
}

/** Dedupe key — question text alone is not unique for map / flag-ID stems. */
function questionIdentity(q: Question): string {
  if (q.map_country) return `map:${q.map_country.toUpperCase()}`;
  if (q.image_url) return `img:${q.image_url}`;
  if (q.options_as_flags && q.correct_answer) {
    return `flag-opt:${String(q.correct_answer).toUpperCase()}`;
  }
  const stem = q.question.trim().toLowerCase();
  const ans = String(q.correct_answer ?? '').trim().toLowerCase();
  return `${stem}|${ans}`;
}

function buildCapitalOf(
  country: CountryRecord,
  pool: CountryRecord[],
  mcMode: boolean,
): Question {
  const capital = country.capital!;
  const distractors = pickDistractors(withCapital(pool), country, 3);
  const options = fourOptions(
    capital,
    distractors.map((d) => d.capital!),
  );
  return {
    question: `What is the capital of ${country.name}?`,
    options: mcMode ? options : undefined,
    correct_answer: capital,
    accepted_answers: [capital],
  };
}

function buildCountryOfCapital(
  country: CountryRecord,
  pool: CountryRecord[],
  mcMode: boolean,
): Question {
  const capital = country.capital!;
  const distractors = pickDistractors(withCapital(pool), country, 3);
  const options = fourOptions(
    country.name,
    distractors.map((d) => d.name),
  );
  return {
    question: `${capital} is the capital of which country?`,
    options: mcMode ? options : undefined,
    correct_answer: country.name,
    accepted_answers: baseAccepted(country.name, country.official),
  };
}

function buildCurrency(
  country: CountryRecord,
  pool: CountryRecord[],
  mcMode: boolean,
): Question {
  const cur = country.currencies[0]!;
  const label = cur.name;
  // Prefer distractors with different currency names
  const others = shuffle(
    withCurrency(pool).filter(
      (c) => c.code !== country.code && c.currencies[0]?.name !== label,
    ),
  ).slice(0, 3);
  const options = fourOptions(
    label,
    others.map((d) => d.currencies[0]!.name),
  );
  return {
    question: `What is the currency of ${country.name}?`,
    options: mcMode ? options : undefined,
    correct_answer: label,
    accepted_answers: [label, cur.code, ...(cur.symbol ? [cur.symbol] : [])],
  };
}

function buildFlagOf(
  country: CountryRecord,
  pool: CountryRecord[],
): Question {
  // Always MC — options are flag images (ISO codes)
  const distractors = pickDistractors(pool, country, 3);
  const codes = shuffle([
    country.code,
    ...distractors.map((d) => d.code),
  ]).slice(0, 4) as [string, string, string, string];
  return {
    question: `Which is the flag of ${country.name}?`,
    options: codes,
    correct_answer: country.code,
    force_mc: true,
    options_as_flags: true,
  };
}

function buildCountryOfFlag(
  country: CountryRecord,
  pool: CountryRecord[],
): Question {
  const distractors = pickDistractors(pool, country, 3);
  const options = fourOptions(
    country.name,
    distractors.map((d) => d.name),
  );
  return {
    question: 'This flag belongs to which country?',
    options,
    correct_answer: country.name,
    accepted_answers: baseAccepted(country.name, country.official),
    force_mc: true,
    image_url: country.flagPng,
  };
}

type Builder = (
  country: CountryRecord,
  pool: CountryRecord[],
  mcMode: boolean,
  scopeCodes: string[],
) => Question | null;

const BUILDERS: Record<GeographyType, Builder> = {
  map: (c, pool, mc, scope) =>
    MAP_CODES.has(c.code) ? buildMapQuestion(c, pool, mc, scope) : null,
  capital_of: (c, pool, mc) =>
    c.capital ? buildCapitalOf(c, pool, mc) : null,
  country_of_capital: (c, pool, mc) =>
    c.capital ? buildCountryOfCapital(c, pool, mc) : null,
  currency: (c, pool, mc) =>
    c.currencies.length ? buildCurrency(c, pool, mc) : null,
  flag_of: (c, pool) => buildFlagOf(c, pool),
  country_of_flag: (c, pool) => buildCountryOfFlag(c, pool),
  eliminate: (c, pool, mc, scope) =>
    MAP_CODES.has(c.code) ? buildMapQuestion(c, pool, mc, scope) : null,
};

/**
 * Build geography questions from curated data (no AI).
 * - Eliminate: one map question per mappable country in region(s); ignores count.
 * - Other types: `count` questions, cycling randomly across selected types.
 */
export function generateGeographyQuestions(
  config: GeographyConfig,
  mcMode: boolean,
  count: number,
  previousQuestions: string[] = [],
): Question[] {
  const pool = getCountriesInRegions(config.regions);
  if (pool.length < 4) {
    throw new Error('Not enough countries in the selected region(s).');
  }

  const scopeCodes = mappable(pool).map((c) => c.code);
  // previous_questions from session history are stems only — ignore them for
  // map/flag-ID (identical stems). Still useful for capital/currency text.
  const seenStems = new Set(previousQuestions.map((q) => q.trim().toLowerCase()));
  const seenIds = new Set<string>();

  // Eliminate is exclusive: clear the whole region (mappable only).
  if (config.types.includes('eliminate')) {
    const targets = shuffle(mappable(pool));
    if (targets.length < 3) {
      throw new Error(
        'Not enough countries with map data in the selected region(s) for Eliminate.',
      );
    }
    const out: Question[] = [];
    for (const c of targets) {
      const q = BUILDERS.eliminate(c, pool, mcMode, scopeCodes);
      if (q) out.push(q);
    }
    return out;
  }

  const types = config.types.filter((t) => t !== 'eliminate');
  if (types.length === 0) {
    throw new Error('Select at least one geography question type.');
  }

  const target = Math.min(Math.max(count, 3), 20);
  const out: Question[] = [];
  let guard = 0;

  while (out.length < target && guard < target * 40) {
    guard++;
    const type = types[Math.floor(Math.random() * types.length)]!;
    let candidates = pool;
    if (type === 'map') candidates = mappable(pool);
    if (type === 'capital_of' || type === 'country_of_capital') {
      candidates = withCapital(pool);
    }
    if (type === 'currency') candidates = withCurrency(pool);
    if (candidates.length < 4) continue;

    const country = candidates[Math.floor(Math.random() * candidates.length)]!;
    const q = BUILDERS[type](country, pool, mcMode, scopeCodes);
    if (!q) continue;

    const id = questionIdentity(q);
    if (seenIds.has(id)) continue;

    // Text-only types: also skip stems already used this session.
    const stemShared =
      type === 'map' || type === 'country_of_flag';
    if (!stemShared && seenStems.has(q.question.trim().toLowerCase())) continue;

    seenIds.add(id);
    if (!stemShared) seenStems.add(q.question.trim().toLowerCase());
    out.push(q);
  }

  if (out.length < 3) {
    throw new Error('Could not build enough geography questions. Try different types or regions.');
  }

  return out.slice(0, target);
}
