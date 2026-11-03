import { describe, expect, it } from 'vitest';
import { planDateRange } from './service.js';
import { WeatherError } from './types.js';

const today = '2026-11-03';

describe('planDateRange', () => {
  it('uses the forecast API for this week', () => {
    expect(planDateRange('2026-11-03', '2026-11-09', today)).toEqual([
      { source: 'forecast', startDate: '2026-11-03', endDate: '2026-11-09' },
    ]);
  });

  it('uses the forecast API for the recent past (up to 92 days)', () => {
    expect(planDateRange('2026-08-03', '2026-08-10', today)).toEqual([
      { source: 'forecast', startDate: '2026-08-03', endDate: '2026-08-10' },
    ]);
  });

  it('uses the archive API for older periods', () => {
    expect(planDateRange('2025-01-01', '2025-01-31', today)).toEqual([
      { source: 'archive', startDate: '2025-01-01', endDate: '2025-01-31' },
    ]);
  });

  it('splits a period straddling both APIs', () => {
    expect(planDateRange('2026-07-25', '2026-08-05', today)).toEqual([
      { source: 'archive', startDate: '2026-07-25', endDate: '2026-08-02' },
      { source: 'forecast', startDate: '2026-08-03', endDate: '2026-08-05' },
    ]);
  });

  it('accepts the 16th forecast day and rejects the 17th', () => {
    expect(planDateRange('2026-11-18', '2026-11-18', today)).toHaveLength(1);
    expect(() => planDateRange('2026-11-10', '2026-11-19', today)).toThrow(WeatherError);
  });

  it('rejects dates before 1940 and inverted ranges', () => {
    expect(() => planDateRange('1939-12-31', '1940-01-05', today)).toThrow(/1940-01-01/);
    expect(() => planDateRange('2026-11-05', '2026-11-01', today)).toThrow(/after/);
  });
});
