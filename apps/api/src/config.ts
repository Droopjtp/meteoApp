import { z } from 'zod';

// Anthropic credentials are intentionally absent: they are optional and resolved by the SDK
// (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or `ant auth login` profile). See src/llm/client.ts.
const DEV_AUTH_SECRET = 'dev-only-secret-change-me-dev-only-secret';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  LLM_MODEL: z.string().min(1).default('claude-opus-5-5'),
  // Low effort keeps chat latency down: fetching and charting weather is not a hard reasoning task.
  LLM_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('low'),
  /** Signs session cookies. Required in production (see `make env`). */
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  /** Public URL of the app (the origin the browser talks to), used for cookies and CSRF checks. */
  BETTER_AUTH_URL: z.url().default('http://localhost:5173'),
});

export type Config = Omit<z.infer<typeof envSchema>, 'BETTER_AUTH_SECRET'> & {
  BETTER_AUTH_SECRET: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
  }
  const { BETTER_AUTH_SECRET, ...rest } = parsed.data;
  if (!BETTER_AUTH_SECRET && rest.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is required in production (run `make env`).');
  }
  return { ...rest, BETTER_AUTH_SECRET: BETTER_AUTH_SECRET ?? DEV_AUTH_SECRET };
}
