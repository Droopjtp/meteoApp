import { z } from 'zod';

// Anthropic credentials are intentionally absent: they are optional and resolved by the SDK
// (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or `ant auth login` profile). See src/llm/client.ts.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  LLM_MODEL: z.string().min(1).default('claude-opus-5-5'),
  // Low effort keeps chat latency down: fetching and charting weather is not a hard reasoning task.
  LLM_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('low'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}
