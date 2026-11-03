import { z } from 'zod';

export const granularitySchema = z.enum(['hourly', 'daily']);
export type Granularity = z.infer<typeof granularitySchema>;

/** Hourly variables, named as in Open-Meteo. */
export const hourlyVariableSchema = z.enum([
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'precipitation_probability',
  'rain',
  'snowfall',
  'cloud_cover',
  'wind_speed_10m',
  'wind_gusts_10m',
  'shortwave_radiation',
  'pressure_msl',
]);

/** Daily variables, named as in Open-Meteo, plus degree days computed from the daily mean temperature. */
export const dailyVariableSchema = z.enum([
  'temperature_2m_max',
  'temperature_2m_min',
  'temperature_2m_mean',
  'apparent_temperature_mean',
  'precipitation_sum',
  'precipitation_probability_max',
  'rain_sum',
  'snowfall_sum',
  'precipitation_hours',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'shortwave_radiation_sum',
  'sunshine_duration',
  'relative_humidity_2m_mean',
  'cloud_cover_mean',
  'heating_degree_days',
  'cooling_degree_days',
]);

export const weatherVariableSchema = z.union([hourlyVariableSchema, dailyVariableSchema]);

export type HourlyVariable = z.infer<typeof hourlyVariableSchema>;
export type DailyVariable = z.infer<typeof dailyVariableSchema>;
export type WeatherVariable = z.infer<typeof weatherVariableSchema>;
