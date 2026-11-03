import { z } from 'zod';

export const llmErrorCodeSchema = z.enum([
  'llm_credentials_missing',
  'llm_credentials_invalid',
  'llm_rate_limited',
  'llm_unavailable',
  'llm_refused',
]);

export const llmStatusSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok') }),
  z.object({ status: z.literal('error'), code: llmErrorCodeSchema, message: z.string() }),
]);

export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

export type LlmErrorCode = z.infer<typeof llmErrorCodeSchema>;
export type LlmStatus = z.infer<typeof llmStatusSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
