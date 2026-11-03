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

export function formatTick(time: string, granularity: Granularity, pointCount: number): string {
  if (granularity === 'hourly') {
    const date = toDate(time);
    return date.getHours() === 0 ? shortDayFormat.format(date) : `${date.getHours()}h`;
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
