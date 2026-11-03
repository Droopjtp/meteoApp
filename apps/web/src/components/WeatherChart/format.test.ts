import { describe, expect, it } from 'vitest';
import { formatTick, hourlyTicks } from './format';

function hours(firstDay: string, dayCount: number): string[] {
  const start = Date.parse(`${firstDay}T00:00:00Z`);
  return Array.from({ length: dayCount * 24 }, (_, i) =>
    new Date(start + i * 3_600_000).toISOString().slice(0, 16),
  );
}

describe('hourlyTicks', () => {
  it('ticks every 6 hours over 2 days, starting at midnight', () => {
    expect(hourlyTicks(hours('2026-11-03', 2)).map((t) => t.slice(5))).toEqual([
      '11-03T00:00',
      '11-03T06:00',
      '11-03T12:00',
      '11-03T18:00',
      '11-04T00:00',
      '11-04T06:00',
      '11-04T12:00',
      '11-04T18:00',
    ]);
  });

  it('keeps only midnights over a week, every other midnight beyond', () => {
    expect(hourlyTicks(hours('2026-11-03', 7))).toHaveLength(7);
    expect(hourlyTicks(hours('2026-11-03', 16)).map((t) => t.slice(8, 10))).toEqual([
      '03',
      '05',
      '07',
      '09',
      '11',
      '13',
      '15',
      '17',
    ]);
  });
});

describe('formatTick', () => {
  it('shows the date at midnight and the hour otherwise', () => {
    expect(formatTick('2026-11-04T00:00', 'hourly', 48)).toBe('mer. 4 nov.');
    expect(formatTick('2026-11-04T06:00', 'hourly', 48)).toBe('6h');
    expect(formatTick('2026-11-04T00:00', 'hourly', 16 * 24)).toBe('4 nov.');
  });
});
