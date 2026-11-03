import Anthropic from '@anthropic-ai/sdk';
import type { LlmStatus } from '@meteo/shared';
import { toLlmError } from './errors.js';

/**
 * No explicit credential: the SDK resolves ANTHROPIC_API_KEY, then ANTHROPIC_AUTH_TOKEN,
 * then the `ant auth login` profile. Missing credentials surface on the first call.
 */
export function createLlmClient() {
  return new Anthropic();
}

const STATUS_TTL_MS = 60_000;

/** Checks credentials with a cheap call (models list), cached to avoid hitting the API on every poll. */
export function createLlmStatusChecker(client: Anthropic) {
  let cached: { value: LlmStatus; expiresAt: number } | null = null;

  return async function checkLlmStatus(): Promise<LlmStatus> {
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: LlmStatus;
    try {
      await client.models.list({ limit: 1 });
      value = { status: 'ok' };
    } catch (error) {
      const llmError = toLlmError(error);
      if (!llmError) throw error;
      value = { status: 'error', code: llmError.code, message: llmError.message };
    }

    cached = { value, expiresAt: Date.now() + STATUS_TTL_MS };
    return value;
  };
}
