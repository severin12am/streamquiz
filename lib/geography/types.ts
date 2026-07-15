// ============================================================
// Geography quiz types (web). English-only labels for now.
// ============================================================

export const GEOGRAPHY_REGIONS = [
  'Europe',
  'Asia',
  'Africa',
  'North America',
  'South America',
  'Oceania',
] as const;

export type GeographyRegion = (typeof GEOGRAPHY_REGIONS)[number];

/** Selectable question modes in the Geography modal. */
export const GEOGRAPHY_TYPES = [
  'map',
  'capital_of',
  'country_of_capital',
  'currency',
  'flag_of',
  'country_of_flag',
  'eliminate',
] as const;

export type GeographyType = (typeof GEOGRAPHY_TYPES)[number];

export const GEOGRAPHY_TYPE_LABELS: Record<GeographyType, string> = {
  map: 'Map — name the highlighted country',
  capital_of: 'Capitals — what is the capital of …?',
  country_of_capital: 'Capitals — … is the capital of?',
  currency: 'Currencies',
  flag_of: 'Flags — what is the flag of …?',
  country_of_flag: 'Flags — this flag belongs to?',
  eliminate: 'Eliminate — clear every country in the region',
};

export interface GeographyConfig {
  /** At least one type. Eliminate is exclusive (no mix with others). */
  types: GeographyType[];
  /** Empty = all regions. */
  regions: GeographyRegion[];
}

export interface CountryRecord {
  code: string;
  name: string;
  official: string;
  capital: string | null;
  region: GeographyRegion;
  currencies: { code: string; name: string; symbol: string }[];
  flagPng: string;
  flagSvg: string;
}

/** Topic wire format: Geography|<types>|<regions|World> */
export const GEO_TOPIC_PREFIX = 'Geography|';

export function isGeographyTopic(topic: string): boolean {
  return topic.startsWith(GEO_TOPIC_PREFIX) || topic === 'Geography';
}

export function encodeGeographyTopic(config: GeographyConfig): string {
  const types = config.types.join(',');
  const regions = config.regions.length > 0 ? config.regions.join(',') : 'World';
  return `${GEO_TOPIC_PREFIX}${types}|${regions}`;
}

export function parseGeographyTopic(topic: string): GeographyConfig | null {
  if (!topic.startsWith(GEO_TOPIC_PREFIX)) return null;
  const rest = topic.slice(GEO_TOPIC_PREFIX.length);
  const [typesRaw, regionsRaw] = rest.split('|');
  if (!typesRaw) return null;

  const types = typesRaw
    .split(',')
    .map((t) => t.trim())
    .filter((t): t is GeographyType =>
      (GEOGRAPHY_TYPES as readonly string[]).includes(t),
    );

  if (types.length === 0) return null;

  const regions =
    !regionsRaw || regionsRaw === 'World'
      ? []
      : regionsRaw
          .split(',')
          .map((r) => r.trim())
          .filter((r): r is GeographyRegion =>
            (GEOGRAPHY_REGIONS as readonly string[]).includes(r),
          );

  return { types, regions };
}

/** Short label for TopicPill / browse (EN). */
export function displayGeographyTopic(topic: string): string {
  const cfg = parseGeographyTopic(topic);
  if (!cfg) return topic;
  if (cfg.types.includes('eliminate')) {
    const r = cfg.regions.length ? cfg.regions.join(', ') : 'World';
    return `Geography · Eliminate · ${r}`;
  }
  const typeBits = cfg.types
    .map((t) => {
      if (t === 'map') return 'Map';
      if (t === 'capital_of' || t === 'country_of_capital') return 'Capitals';
      if (t === 'currency') return 'Currencies';
      if (t === 'flag_of' || t === 'country_of_flag') return 'Flags';
      return t;
    })
    .filter((v, i, a) => a.indexOf(v) === i);
  const r = cfg.regions.length ? cfg.regions.join(', ') : 'World';
  return `Geography · ${typeBits.join(', ')} · ${r}`;
}
