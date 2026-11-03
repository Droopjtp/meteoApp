import type { WeatherVariable } from '@meteo/shared';
import type { Dataset } from './types.js';
import { variableInfo } from './variables.js';

/** Above this many points, only statistics are sent to the LLM (the chart gets the full data). */
const MAX_INLINE_POINTS = 31;

/**
 * Compact view of a dataset for the LLM: enough to comment on the data,
 * without spending tokens on hundreds of points.
 */
export function summarizeDataset(dataset: Dataset) {
  const variables = Object.fromEntries(
    Object.entries(dataset.values).map(([variable, values]) => {
      const info = variableInfo(dataset.granularity, variable as WeatherVariable);
      const present = values
        .map((value, i) => ({ value, time: dataset.time[i] }))
        .filter((p): p is { value: number; time: string } => p.value !== null);

      if (present.length === 0) return [variable, { unit: dataset.units[variable], noData: true }];

      const min = present.reduce((a, b) => (b.value < a.value ? b : a));
      const max = present.reduce((a, b) => (b.value > a.value ? b : a));
      const sum = present.reduce((acc, p) => acc + p.value, 0);
      return [
        variable,
        {
          label: info?.label,
          unit: dataset.units[variable],
          min,
          max,
          [info?.aggregation === 'sum' ? 'total' : 'mean']:
            Math.round((info?.aggregation === 'sum' ? sum : sum / present.length) * 10) / 10,
        },
      ];
    }),
  );

  return {
    datasetId: dataset.id,
    location: dataset.location,
    granularity: dataset.granularity,
    period: { start: dataset.startDate, end: dataset.endDate },
    sources: dataset.sources,
    pointCount: dataset.time.length,
    variables,
    ...(dataset.time.length <= MAX_INLINE_POINTS
      ? { data: { time: dataset.time, ...dataset.values } }
      : {}),
    ...(dataset.notes.length > 0 ? { notes: dataset.notes } : {}),
  };
}
