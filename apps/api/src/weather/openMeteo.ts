import type { Granularity } from '@meteo/shared';
import { z } from 'zod';
import { TtlCache } from './cache.js';
import { type Location, type SeriesData, WeatherError, type WeatherSource } from './types.js';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const SOURCE_URLS: Record<WeatherSource, string> = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  archive: 'https://archive-api.open-meteo.com/v1/archive',
};

const MINUTE = 60_000;
// Forecasts are refreshed hourly upstream; archives barely change.
const TTL_MS: Record<WeatherSource | 'geocoding', number> = {
  forecast: 15 * MINUTE,
  archive: 6 * 60 * MINUTE,
  geocoding: 24 * 60 * MINUTE,
};
const REQUEST_TIMEOUT_MS = 10_000;

const cache = new TtlCache<unknown>(500);

async function fetchJson(url: string, ttlMs: number): Promise<unknown> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new WeatherError('upstream_error', `Open-Meteo is unreachable: ${String(error)}`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const reason = z.object({ reason: z.string() }).safeParse(body);
    throw new WeatherError(
      'upstream_error',
      `Open-Meteo error (${response.status}): ${reason.success ? reason.data.reason : 'unknown'}`,
    );
  }
  cache.set(url, body, ttlMs);
  return body;
}

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        timezone: z.string().optional(),
      }),
    )
    .optional(),
});

export async function geocode(name: string, countryCode?: string): Promise<Location | null> {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({
    name,
    count: '10',
    language: 'fr',
    format: 'json',
  }).toString();

  const { results = [] } = geocodingSchema.parse(await fetchJson(url.toString(), TTL_MS.geocoding));
  const match = countryCode
    ? results.find((r) => r.country_code?.toUpperCase() === countryCode.toUpperCase())
    : results[0];
  if (!match) return null;

  return {
    name: match.name,
    country: match.country,
    admin1: match.admin1,
    latitude: match.latitude,
    longitude: match.longitude,
    timezone: match.timezone ?? 'UTC',
  };
}

const seriesSchema = z
  .object({
    time: z.array(z.string()),
    // Null on the archive's most recent days (not consolidated yet) or for unsupported variables.
  })
  .catchall(z.array(z.number().nullable()));

const weatherResponseSchema = z.object({
  hourly: seriesSchema.optional(),
  hourly_units: z.record(z.string(), z.string()).optional(),
  daily: seriesSchema.optional(),
  daily_units: z.record(z.string(), z.string()).optional(),
});

export async function fetchSeries(
  source: WeatherSource,
  params: {
    location: Location;
    startDate: string;
    endDate: string;
    granularity: Granularity;
    variables: string[];
  },
): Promise<SeriesData> {
  const { location, startDate, endDate, granularity, variables } = params;
  const url = new URL(SOURCE_URLS[source]);
  url.search = new URLSearchParams({
    latitude: location.latitude.toFixed(4),
    longitude: location.longitude.toFixed(4),
    timezone: location.timezone,
    start_date: startDate,
    end_date: endDate,
    [granularity]: variables.join(','),
  }).toString();

  const body = weatherResponseSchema.parse(await fetchJson(url.toString(), TTL_MS[source]));
  const series = body[granularity];
  if (!series) throw new WeatherError('upstream_error', 'Open-Meteo returned no data.');

  const { time, ...rest } = series;
  const units = (granularity === 'hourly' ? body.hourly_units : body.daily_units) ?? {};
  const values: SeriesData['values'] = {};
  for (const variable of variables) {
    values[variable] = (rest[variable] as (number | null)[] | undefined) ?? time.map(() => null);
  }
  return { time, values, units };
}
