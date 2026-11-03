import type Anthropic from '@anthropic-ai/sdk';
import { chartSpecSchema, granularitySchema, weatherVariableSchema } from '@meteo/shared';
import { z } from 'zod';

const isoDate = z.iso.date();

export const getWeatherInputSchema = z.object({
  location: z
    .string()
    .min(1)
    .describe(
      'City or place name, e.g. "Lyon". One location per call: call the tool once per place to compare.',
    ),
  country_code: z
    .string()
    .length(2)
    .optional()
    .describe('ISO 3166-1 alpha-2 country code to disambiguate homonyms, e.g. "FR".'),
  start_date: isoDate.describe('First day (YYYY-MM-DD), local time.'),
  end_date: isoDate.describe('Last day (YYYY-MM-DD), inclusive.'),
  granularity: granularitySchema.describe(
    'hourly for a few days (max 16 days), daily for longer periods or day-level answers.',
  ),
  variables: z
    .array(weatherVariableSchema)
    .min(1)
    .max(6)
    .describe(
      'Open-Meteo variable names. Hourly: plain names (temperature_2m, precipitation...). Daily: aggregated names (temperature_2m_max, precipitation_sum, heating_degree_days...).',
    ),
});

export type GetWeatherInput = z.infer<typeof getWeatherInputSchema>;

function toInputSchema(schema: z.ZodType): Anthropic.Beta.BetaTool['input_schema'] {
  const { $schema, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  return jsonSchema as Anthropic.Beta.BetaTool['input_schema'];
}

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'get_weather',
    description:
      'Fetches live weather data (forecast up to 16 days ahead, or history back to 1940) for one place and period. Returns a datasetId to chart, plus statistics (and values for short periods) to comment on.',
    input_schema: toInputSchema(getWeatherInputSchema),
    eager_input_streaming: true,
  },
  {
    name: 'render_chart',
    description:
      'Displays a chart in the conversation from datasets returned by get_weather. You choose the chart type and the series (per-series type overrides allowed). Series with different units get separate stacked panels. The data points are filled in by the system.',
    input_schema: toInputSchema(chartSpecSchema),
    eager_input_streaming: true,
  },
];
