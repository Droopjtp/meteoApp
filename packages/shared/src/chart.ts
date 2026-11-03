import { z } from 'zod';

/**
 * Chart spec produced by the LLM (via the `render_chart` tool).
 * It only references datasets by id: the actual data points never go through the LLM.
 */
export const chartTypeSchema = z.enum(['line', 'bar', 'area']);

export const chartSeriesSchema = z.object({
  datasetId: z.string(),
  variable: z.string(),
  label: z.string(),
  type: chartTypeSchema.optional(),
  yAxis: z.enum(['left', 'right']).default('left'),
});

export const chartSpecSchema = z.object({
  title: z.string(),
  type: chartTypeSchema,
  series: z.array(chartSeriesSchema).min(1),
  yAxes: z
    .object({
      left: z.object({ label: z.string() }),
      right: z.object({ label: z.string() }).optional(),
    })
    .optional(),
});

export type ChartType = z.infer<typeof chartTypeSchema>;
export type ChartSeries = z.infer<typeof chartSeriesSchema>;
export type ChartSpec = z.infer<typeof chartSpecSchema>;

/** Chart spec resolved by the backend with real data, ready to be rendered. */
export type ResolvedChart = ChartSpec & {
  points: Array<{ time: string } & Record<string, number | null | string>>;
  units: Record<string, string>;
};
