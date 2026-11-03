import type { Granularity } from '@meteo/shared';

export type WeatherSource = 'forecast' | 'archive';

export interface Location {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface SeriesData {
  time: string[];
  values: Record<string, (number | null)[]>;
  units: Record<string, string>;
}

export interface Dataset extends SeriesData {
  id: string;
  location: Location;
  granularity: Granularity;
  startDate: string;
  endDate: string;
  sources: WeatherSource[];
  notes: string[];
}

export type WeatherErrorCode =
  'location_not_found' | 'date_out_of_range' | 'invalid_request' | 'upstream_error';

/** Expected failures, returned to the LLM as tool errors so it can explain them or retry. */
export class WeatherError extends Error {
  constructor(
    readonly code: WeatherErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'WeatherError';
  }
}
