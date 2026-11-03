import type { DailyVariable, Granularity, HourlyVariable, WeatherVariable } from '@meteo/shared';

type Aggregation = 'mean' | 'sum';

interface VariableInfo {
  label: string;
  /** How values combine over a period, for summaries sent to the LLM. */
  aggregation: Aggregation;
  /** Not available in the Historical (archive) API. */
  forecastOnly?: boolean;
}

export const HOURLY_VARIABLES: Record<HourlyVariable, VariableInfo> = {
  temperature_2m: { label: 'Température', aggregation: 'mean' },
  apparent_temperature: { label: 'Température ressentie', aggregation: 'mean' },
  relative_humidity_2m: { label: 'Humidité relative', aggregation: 'mean' },
  precipitation: { label: 'Précipitations', aggregation: 'sum' },
  precipitation_probability: {
    label: 'Probabilité de précipitations',
    aggregation: 'mean',
    forecastOnly: true,
  },
  rain: { label: 'Pluie', aggregation: 'sum' },
  snowfall: { label: 'Neige', aggregation: 'sum' },
  cloud_cover: { label: 'Couverture nuageuse', aggregation: 'mean' },
  wind_speed_10m: { label: 'Vent', aggregation: 'mean' },
  wind_gusts_10m: { label: 'Rafales', aggregation: 'mean' },
  shortwave_radiation: { label: 'Rayonnement solaire', aggregation: 'mean' },
  pressure_msl: { label: 'Pression', aggregation: 'mean' },
};

export const DAILY_VARIABLES: Record<DailyVariable, VariableInfo> = {
  temperature_2m_max: { label: 'Température max', aggregation: 'mean' },
  temperature_2m_min: { label: 'Température min', aggregation: 'mean' },
  temperature_2m_mean: { label: 'Température moyenne', aggregation: 'mean' },
  apparent_temperature_mean: { label: 'Température ressentie moyenne', aggregation: 'mean' },
  precipitation_sum: { label: 'Précipitations', aggregation: 'sum' },
  precipitation_probability_max: {
    label: 'Probabilité de précipitations max',
    aggregation: 'mean',
    forecastOnly: true,
  },
  rain_sum: { label: 'Pluie', aggregation: 'sum' },
  snowfall_sum: { label: 'Neige', aggregation: 'sum' },
  precipitation_hours: { label: 'Heures de précipitations', aggregation: 'sum' },
  wind_speed_10m_max: { label: 'Vent max', aggregation: 'mean' },
  wind_gusts_10m_max: { label: 'Rafales max', aggregation: 'mean' },
  shortwave_radiation_sum: { label: 'Rayonnement solaire', aggregation: 'sum' },
  sunshine_duration: { label: 'Ensoleillement', aggregation: 'sum' },
  relative_humidity_2m_mean: { label: 'Humidité relative moyenne', aggregation: 'mean' },
  cloud_cover_mean: { label: 'Couverture nuageuse moyenne', aggregation: 'mean' },
  heating_degree_days: { label: 'Degrés-jours de chauffage', aggregation: 'sum' },
  cooling_degree_days: { label: 'Degrés-jours de climatisation', aggregation: 'sum' },
};

/** Base temperature (°C) for heating and cooling degree days, applied to the daily mean temperature. */
export const DEGREE_DAYS_BASE = 18;

/** Degree days are derived from the daily mean temperature rather than fetched. */
export const DERIVED_DAILY: Partial<Record<DailyVariable, (meanTemp: number) => number>> = {
  heating_degree_days: (t) => Math.max(0, DEGREE_DAYS_BASE - t),
  cooling_degree_days: (t) => Math.max(0, t - DEGREE_DAYS_BASE),
};

export function variableInfo(
  granularity: Granularity,
  variable: WeatherVariable,
): VariableInfo | undefined {
  const catalog: Record<string, VariableInfo> =
    granularity === 'hourly' ? HOURLY_VARIABLES : DAILY_VARIABLES;
  return catalog[variable];
}

/** Open-Meteo returns seconds for durations: convert to hours, more readable on a chart. */
export const SECONDS_TO_HOURS: ReadonlySet<string> = new Set(['sunshine_duration']);
