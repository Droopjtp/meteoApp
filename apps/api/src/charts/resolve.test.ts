import { describe, expect, it } from 'vitest';
import type { Dataset } from '../weather/types.js';
import { ChartSpecError, resolveChart } from './resolve.js';

function dataset(
  id: string,
  city: string,
  time: string[],
  values: Dataset['values'],
  units: Dataset['units'],
): Dataset {
  return {
    id,
    location: { name: city, latitude: 0, longitude: 0, timezone: 'Europe/Paris' },
    granularity: 'daily',
    startDate: time[0] ?? '',
    endDate: time.at(-1) ?? '',
    sources: ['forecast'],
    time,
    values,
    units,
    notes: [],
  };
}

const paris = dataset(
  'p',
  'Paris',
  ['2026-11-01', '2026-11-02'],
  { precipitation_sum: [1, 2], temperature_2m_max: [10, 11] },
  { precipitation_sum: 'mm', temperature_2m_max: '°C' },
);
const marseille = dataset(
  'm',
  'Marseille',
  ['2026-11-02', '2026-11-03'],
  { precipitation_sum: [0, 5] },
  { precipitation_sum: 'mm' },
);
const datasets = new Map([
  ['p', paris],
  ['m', marseille],
]);

describe('resolveChart', () => {
  it('merges datasets on the union of their time steps and labels by location', () => {
    const chart = resolveChart(
      'c1',
      {
        title: 'Pluie',
        type: 'bar',
        series: [
          { datasetId: 'p', variable: 'precipitation_sum' },
          { datasetId: 'm', variable: 'precipitation_sum' },
        ],
      },
      datasets,
    );

    expect(chart.series.map((s) => s.label)).toEqual([
      'Précipitations – Paris',
      'Précipitations – Marseille',
    ]);
    expect(chart.points).toEqual([
      { time: '2026-11-01', s0: 1 },
      { time: '2026-11-02', s0: 2, s1: 0 },
      { time: '2026-11-03', s1: 5 },
    ]);
  });

  it('keeps the chart type unless a series overrides it', () => {
    const chart = resolveChart(
      'c2',
      {
        title: 'Paris',
        type: 'line',
        series: [
          { datasetId: 'p', variable: 'temperature_2m_max' },
          { datasetId: 'p', variable: 'precipitation_sum', type: 'bar' },
        ],
      },
      datasets,
    );

    expect(chart.series.map((s) => [s.unit, s.type])).toEqual([
      ['°C', 'line'],
      ['mm', 'bar'],
    ]);
  });

  it('reports unknown datasets and variables to the LLM', () => {
    expect(() =>
      resolveChart(
        'c3',
        { title: 't', type: 'line', series: [{ datasetId: 'x', variable: 'a' }] },
        datasets,
      ),
    ).toThrow(ChartSpecError);
    expect(() =>
      resolveChart(
        'c4',
        { title: 't', type: 'line', series: [{ datasetId: 'm', variable: 'temperature_2m_max' }] },
        datasets,
      ),
    ).toThrow(/Available: precipitation_sum/);
  });
});
