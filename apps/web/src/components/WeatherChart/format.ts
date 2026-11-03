import type { Granularity } from '@meteo/shared';

const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});
const shortDayFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const hourFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });

// Open-Meteo times are local to the place, without offset: parse them as local wall-clock time.
const toDate = (time: string) => new Date(time.length === 10 ? `${time}T00:00:00` : time);

// Hours are read from the string, not from a Date: the browser's timezone (and its DST
// changes) may differ from the place's, which would shift the hours.
const hourOf = (time: string) => Number(time.slice(11, 13));

export const isMidnight = (time: string) => time.length > 10 && hourOf(time) === 0;

/** Hours between two hourly ticks, so labels never overlap whatever the period. */
function hourlyStep(dayCount: number): number {
  if (dayCount <= 2) return 6;
  if (dayCount <= 5) return 12;
  if (dayCount <= 8) return 24;
  return 48;
}

/**
 * Explicit hourly ticks aligned on midnight: the axis always shows which day it is,
 * instead of letting the chart library pick arbitrary hours.
 */
export function hourlyTicks(times: string[]): string[] {
  const step = hourlyStep(times.length / 24);
  if (step <= 24) return times.filter((time) => hourOf(time) % step === 0);
  // Every other midnight, counted from the first day.
  return times.filter(isMidnight).filter((_, index) => index % (step / 24) === 0);
}

export function formatTick(time: string, granularity: Granularity, pointCount: number): string {
  if (granularity === 'hourly') {
    if (!isMidnight(time)) return `${hourOf(time)}h`;
    const date = toDate(time.slice(0, 10));
    return pointCount <= 5 * 24 ? dayFormat.format(date) : shortDayFormat.format(date);
  }
  return pointCount > 14 ? shortDayFormat.format(toDate(time)) : dayFormat.format(toDate(time));
}

export function formatTooltipTime(time: string, granularity: Granularity): string {
  return granularity === 'hourly'
    ? hourFormat.format(toDate(time))
    : dayFormat.format(toDate(time));
}

export function formatValue(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined
    ? '–'
    : `${numberFormat.format(value)} ${unit}`.trim();
}

// Axis ticks can be fractional steps (0.15, 0.45): keep two decimals so they stay exact.
const axisFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function formatAxisValue(value: number): string {
  return axisFormat.format(value);
}
