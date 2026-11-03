import { z } from 'zod';
import { granularitySchema } from './weather.js';

/**
 * Chart spec produced by the LLM (via the `render_chart` tool).
 * It only references datasets by id: the actual data points never go through the LLM.
 */
export const chartTypeSchema = z.enum(['line', 'bar', 'area']);

export const chartSpecSchema = z.object({
  title: z.string().min(1).max(120).describe('Short chart title, in the language of the user.'),
  type: chartTypeSchema.describe(
    'Default mark for all series. line: trends/temperatures; bar: quantities per period (rain, degree days); area: cumulative or single-series emphasis.',
  ),
  series: z
    .array(
      z.object({
        datasetId: z.string().describe('datasetId returned by get_weather.'),
        variable: z.string().describe('A variable present in that dataset.'),
        label: z
          .string()
          .max(60)
          .optional()
          .describe('Legend label, e.g. "Paris – max". Defaults to variable + location.'),
        type: chartTypeSchema.optional().describe('Overrides the chart type for this series.'),
      }),
    )
    .min(1)
    .max(8),
});

export type ChartType = z.infer<typeof chartTypeSchema>;
export type ChartSpec = z.infer<typeof chartSpecSchema>;

/**
 * Chart spec resolved by the backend with real data, ready to be rendered.
 * Series with different units are drawn as stacked panels sharing the time axis (never a dual Y axis).
 */
export const resolvedChartSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: chartTypeSchema,
  granularity: granularitySchema,
  series: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      unit: z.string(),
      type: chartTypeSchema,
    }),
  ),
  /** Rows keyed by local time (ISO date or date-time), one column per series key. */
  points: z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()]))),
});

export type ResolvedChart = z.infer<typeof resolvedChartSchema>;
