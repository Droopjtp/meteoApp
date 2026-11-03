import type { ResolvedChart } from '@meteo/shared';
import { memo, useMemo, useRef } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatAxisValue,
  formatTick,
  formatTooltipTime,
  formatValue,
  hourlyTicks,
  isMidnight,
} from './format';
import { useElementWidth } from '../../hooks/useElementWidth';
import { CHART_INK, seriesColor } from './palette';
import styles from './WeatherChart.module.css';

type Series = ResolvedChart['series'][number] & { color: string };

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  series: Series[];
  point?: Record<string, unknown>;
  granularity: ResolvedChart['granularity'];
}

function ChartTooltip({ active, label, series, point, granularity }: TooltipProps) {
  if (!active || label === undefined || !point) return null;
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTime}>{formatTooltipTime(String(label), granularity)}</div>
      {series.map((s) => (
        <div key={s.key} className={styles.tooltipRow}>
          <span className={styles.lineKey} style={{ background: s.color }} />
          <strong className={styles.tooltipValue}>
            {formatValue(point[s.key] as number | null | undefined, s.unit)}
          </strong>
          <span className={styles.tooltipLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

interface TimeTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
  granularity: ResolvedChart['granularity'];
  pointCount: number;
  compact: boolean;
}

/** Midnight ticks carry the date: slightly stronger ink than the hours. */
function TimeTick({ x, y, payload, granularity, pointCount, compact }: TimeTickProps) {
  if (!payload) return null;
  const strong = granularity === 'hourly' && isMidnight(payload.value);
  return (
    <text
      x={x}
      y={y}
      dy={12}
      textAnchor="middle"
      fontSize={12}
      fill={strong ? CHART_INK.secondary : CHART_INK.muted}
      fontWeight={strong ? 600 : 400}
    >
      {formatTick(payload.value, granularity, pointCount, compact)}
    </text>
  );
}

function SeriesMark({ series }: { series: Series }) {
  const common = { dataKey: series.key, name: series.label, isAnimationActive: false };
  switch (series.type) {
    case 'bar':
      return <Bar {...common} fill={series.color} maxBarSize={24} radius={[4, 4, 0, 0]} />;
    case 'area':
      return (
        <Area
          {...common}
          type="monotone"
          stroke={series.color}
          strokeWidth={2}
          fill={series.color}
          fillOpacity={0.1}
          activeDot={{ r: 4, stroke: CHART_INK.surface, strokeWidth: 2 }}
        />
      );
    default:
      return (
        <Line
          {...common}
          type="monotone"
          stroke={series.color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          connectNulls
          activeDot={{ r: 4, stroke: CHART_INK.surface, strokeWidth: 2 }}
        />
      );
  }
}

function Legend({ series }: { series: Series[] }) {
  return (
    <ul className={styles.legend}>
      {series.map((s) => (
        <li key={s.key} className={styles.legendItem}>
          <span
            className={s.type === 'line' ? styles.lineKey : styles.boxKey}
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

function DataTable({ chart, series }: { chart: ResolvedChart; series: Series[] }) {
  return (
    <details className={styles.tableToggle}>
      <summary>Voir les données</summary>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {series.map((s) => (
                <th key={s.key} scope="col">
                  {s.label} ({s.unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.points.map((point) => (
              <tr key={String(point.time)}>
                <th scope="row">{formatTooltipTime(String(point.time), chart.granularity)}</th>
                {series.map((s) => (
                  <td key={s.key}>{formatValue(point[s.key] as number | null, '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * One panel per unit, stacked and sharing the time axis (synchronised crosshair):
 * no dual Y axis, whose two scales would be arbitrary and misleading.
 */
function WeatherChartImpl({ chart }: { chart: ResolvedChart }) {
  const series = useMemo<Series[]>(
    () => chart.series.map((s, index) => ({ ...s, color: seriesColor(index) })),
    [chart.series],
  );
  const panels = useMemo(() => {
    const byUnit = new Map<string, Series[]>();
    for (const s of series) byUnit.set(s.unit, [...(byUnit.get(s.unit) ?? []), s]);
    return [...byUnit.entries()];
  }, [series]);
  const pointsByTime = useMemo(
    () => new Map(chart.points.map((p) => [String(p.time), p])),
    [chart.points],
  );

  // Sized from the chart's own width (sidebar open or not, phone or desktop).
  const figureRef = useRef<HTMLElement>(null);
  const width = useElementWidth(figureRef);
  const compact = width > 0 && width < 480;
  const panelHeight = panels.length > 1 ? (compact ? 150 : 180) : compact ? 220 : 260;
  const pointCount = chart.points.length;
  const hourly = chart.granularity === 'hourly';
  const times = useMemo(() => chart.points.map((p) => String(p.time)), [chart.points]);
  const ticks = useMemo(
    () => (hourly ? hourlyTicks(times, compact) : undefined),
    [hourly, times, compact],
  );
  // Day separators on hourly charts (the first day starts at the left edge).
  const dayStarts = useMemo(
    () => (hourly ? times.filter(isMidnight).slice(1) : []),
    [hourly, times],
  );

  return (
    <figure ref={figureRef} className={styles.figure}>
      <figcaption className={styles.title}>{chart.title}</figcaption>
      {series.length > 1 && <Legend series={series} />}

      {panels.map(([unit, panelSeries], index) => (
        <div key={unit} className={styles.panel}>
          {unit && <div className={styles.panelUnit}>{unit}</div>}
          <ResponsiveContainer width="100%" height={panelHeight}>
            <ComposedChart
              data={chart.points}
              syncId={chart.id}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
              <XAxis
                dataKey="time"
                hide={index < panels.length - 1}
                ticks={ticks}
                interval={hourly ? 0 : 'preserveEnd'}
                tick={(props) => (
                  <TimeTick
                    {...props}
                    granularity={chart.granularity}
                    pointCount={pointCount}
                    compact={compact}
                  />
                )}
                stroke={CHART_INK.axis}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                width={compact ? 36 : 48}
                tick={{ fill: CHART_INK.muted, fontSize: 12 }}
                tickFormatter={formatAxisValue}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ stroke: CHART_INK.axis, strokeWidth: 1 }}
                content={({ active, label }) => (
                  <ChartTooltip
                    active={active}
                    label={label}
                    series={series}
                    point={pointsByTime.get(String(label))}
                    granularity={chart.granularity}
                  />
                )}
              />
              {dayStarts.map((time) => (
                <ReferenceLine key={time} x={time} stroke={CHART_INK.grid} />
              ))}
              {panelSeries.map((s) => (
                <SeriesMark key={s.key} series={s} />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ))}

      <DataTable chart={chart} series={series} />
    </figure>
  );
}

const WeatherChart = memo(WeatherChartImpl);
export default WeatherChart;
