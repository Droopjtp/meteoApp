import type { ChartSpec, ResolvedChart, WeatherVariable } from '@meteo/shared';
import type { Dataset } from '../weather/types.js';
import { variableInfo } from '../weather/variables.js';

/** Invalid chart spec, returned to the LLM as a tool error so it can fix the call. */
export class ChartSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChartSpecError';
  }
}

const MAX_UNITS = 3;

export function resolveChart(
  id: string,
  spec: ChartSpec,
  datasets: Map<string, Dataset>,
): ResolvedChart {
  const resolved = spec.series.map((series) => {
    const dataset = datasets.get(series.datasetId);
    if (!dataset) {
      throw new ChartSpecError(
        `Unknown datasetId "${series.datasetId}". Use a datasetId returned by get_weather (call it again if needed).`,
      );
    }
    const values = dataset.values[series.variable];
    if (!values) {
      throw new ChartSpecError(
        `Dataset ${series.datasetId} has no "${series.variable}". Available: ${Object.keys(dataset.values).join(', ')}.`,
      );
    }
    return { series, dataset, values };
  });

  const granularities = new Set(resolved.map((r) => r.dataset.granularity));
  if (granularities.size > 1) {
    throw new ChartSpecError(
      'All series of a chart must share the same granularity (hourly or daily).',
    );
  }

  // Each unit gets its own panel: beyond three, the chart stops being readable.
  const units = new Set(resolved.map((r) => r.dataset.units[r.series.variable] ?? ''));
  if (units.size > MAX_UNITS) {
    throw new ChartSpecError(
      `A chart can show at most ${MAX_UNITS} units (got ${[...units].join(', ')}). Split it into several charts.`,
    );
  }
  const locations = new Set(resolved.map((r) => r.dataset.location.name));

  const series = resolved.map(({ series, dataset }, index) => {
    const unit = dataset.units[series.variable] ?? '';
    const variableLabel =
      variableInfo(dataset.granularity, series.variable as WeatherVariable)?.label ??
      series.variable;
    return {
      key: `s${index}`,
      label:
        series.label ??
        (locations.size > 1 ? `${variableLabel} – ${dataset.location.name}` : variableLabel),
      unit,
      type: series.type ?? spec.type,
    };
  });

  // Datasets can cover different periods: align them on the union of their time steps.
  const rows = new Map<string, Record<string, string | number | null>>();
  resolved.forEach(({ dataset, values }, index) => {
    dataset.time.forEach((time, i) => {
      const row = rows.get(time) ?? { time };
      row[`s${index}`] = values[i] ?? null;
      rows.set(time, row);
    });
  });
  const points = [...rows.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));

  const [granularity] = granularities;
  return {
    id,
    title: spec.title,
    type: spec.type,
    granularity: granularity ?? 'daily',
    series,
    points,
  };
}
