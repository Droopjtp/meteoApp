import { randomUUID } from 'node:crypto';
import type { DailyVariable, Granularity, WeatherVariable } from '@meteo/shared';
import { addDays, diffDays, maxDate, minDate, todayIn } from './dates.js';
import { fetchSeries, geocode } from './openMeteo.js';
import {
  type Dataset,
  type Location,
  type SeriesData,
  WeatherError,
  type WeatherSource,
} from './types.js';
import { DERIVED_DAILY, SECONDS_TO_HOURS, variableInfo } from './variables.js';

export const ARCHIVE_START = '1940-01-01';
export const FORECAST_DAYS_AHEAD = 15; // today + 15 = 16 days of forecast
/** The forecast API serves ~92 past days; older dates go to the archive API. */
export const FORECAST_PAST_DAYS = 92;
export const MAX_HOURLY_DAYS = 16;
export const MAX_DAILY_DAYS = 366;

export interface WeatherRequest {
  location: string;
  countryCode?: string;
  startDate: string;
  endDate: string;
  granularity: Granularity;
  variables: WeatherVariable[];
}

export interface DateRangePart {
  source: WeatherSource;
  startDate: string;
  endDate: string;
}

/**
 * Validates the requested period against what Open-Meteo serves, then splits it between
 * the archive API (older than ~92 days) and the forecast API (recent past + 16 days ahead).
 */
export function planDateRange(startDate: string, endDate: string, today: string): DateRangePart[] {
  const lastForecastDay = addDays(today, FORECAST_DAYS_AHEAD);
  if (startDate > endDate) {
    throw new WeatherError(
      'invalid_request',
      `start_date (${startDate}) is after end_date (${endDate}).`,
    );
  }
  if (startDate > lastForecastDay || endDate > lastForecastDay) {
    throw new WeatherError(
      'date_out_of_range',
      `Forecasts only go up to 16 days ahead: the last available day is ${lastForecastDay}.`,
    );
  }
  if (startDate < ARCHIVE_START) {
    throw new WeatherError('date_out_of_range', `Historical data starts on ${ARCHIVE_START}.`);
  }

  const firstForecastDay = addDays(today, -FORECAST_PAST_DAYS);
  const parts: DateRangePart[] = [];
  if (startDate < firstForecastDay) {
    parts.push({
      source: 'archive',
      startDate,
      endDate: minDate(endDate, addDays(firstForecastDay, -1)),
    });
  }
  if (endDate >= firstForecastDay) {
    parts.push({ source: 'forecast', startDate: maxDate(startDate, firstForecastDay), endDate });
  }
  return parts;
}

function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function concatParts(parts: SeriesData[], variables: string[]): SeriesData {
  return {
    time: parts.flatMap((p) => p.time),
    values: Object.fromEntries(variables.map((v) => [v, parts.flatMap((p) => p.values[v] ?? [])])),
    units: Object.assign({}, ...parts.map((p) => p.units)),
  };
}

export async function getWeather(request: WeatherRequest, now = new Date()): Promise<Dataset> {
  const notes: string[] = [];

  const location: Location | null = await geocode(request.location, request.countryCode);
  if (!location) {
    throw new WeatherError(
      'location_not_found',
      `No place found for "${request.location}"${request.countryCode ? ` in ${request.countryCode}` : ''}. Try another spelling or a nearby city.`,
    );
  }

  const today = todayIn(location.timezone, now);
  const parts = planDateRange(request.startDate, request.endDate, today);
  const days = diffDays(request.startDate, request.endDate) + 1;

  let granularity = request.granularity;
  if (granularity === 'hourly' && days > MAX_HOURLY_DAYS) {
    granularity = 'daily';
    notes.push(`Hourly data is limited to ${MAX_HOURLY_DAYS} days: switched to daily data.`);
  }
  if (days > MAX_DAILY_DAYS) {
    throw new WeatherError(
      'invalid_request',
      `The period is limited to ${MAX_DAILY_DAYS} days per request (${days} requested). Narrow it down.`,
    );
  }

  const variables = request.variables.filter((v) => variableInfo(granularity, v));
  const rejected = request.variables.filter((v) => !variableInfo(granularity, v));
  if (rejected.length > 0) {
    notes.push(`Ignored variables not available as ${granularity} data: ${rejected.join(', ')}.`);
  }
  if (variables.length === 0) {
    throw new WeatherError(
      'invalid_request',
      `None of the requested variables exist as ${granularity} data: ${rejected.join(', ')}.`,
    );
  }

  const derived = variables.filter((v): v is DailyVariable => v in DERIVED_DAILY);
  const fetched = [
    ...new Set([
      ...variables.filter((v) => !(v in DERIVED_DAILY)),
      ...(derived.length > 0 ? ['temperature_2m_mean'] : []),
    ]),
  ];

  const series = concatParts(
    await Promise.all(
      parts.map((part) =>
        fetchSeries(part.source, {
          location,
          startDate: part.startDate,
          endDate: part.endDate,
          granularity,
          // Forecast-only variables come back as nulls from the archive.
          variables: fetched.filter(
            (v) =>
              part.source === 'forecast' ||
              !variableInfo(granularity, v as WeatherVariable)?.forecastOnly,
          ),
        }),
      ),
    ),
    fetched,
  );

  const values: Dataset['values'] = {};
  const units: Dataset['units'] = {};
  for (const variable of variables) {
    const toValue = DERIVED_DAILY[variable as DailyVariable];
    if (toValue) {
      values[variable] = (series.values.temperature_2m_mean ?? []).map((t) =>
        t === null ? null : round(toValue(t)),
      );
      units[variable] = '°C·j';
    } else if (SECONDS_TO_HOURS.has(variable)) {
      values[variable] = (series.values[variable] ?? []).map((s) =>
        s === null ? null : round(s / 3600),
      );
      units[variable] = 'h';
    } else {
      values[variable] = (series.values[variable] ?? []).map(round);
      units[variable] = series.units[variable] ?? '';
    }
    if (values[variable]?.every((v) => v === null)) {
      notes.push(`No data for ${variable} over this period.`);
    }
  }

  if (parts.some((p) => p.source === 'archive') && request.endDate > addDays(today, -5)) {
    notes.push('Reanalysis data for the last ~5 days may be incomplete.');
  }
  if (derived.length > 0) {
    notes.push('Degree days use base 18 °C on the daily mean temperature.');
  }

  return {
    id: randomUUID(),
    location,
    granularity,
    startDate: request.startDate,
    endDate: request.endDate,
    sources: parts.map((p) => p.source),
    time: series.time,
    values,
    units,
    notes,
  };
}
