import Anthropic from '@anthropic-ai/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LlmError, toLlmError } from './errors.js';

const headers = new Headers();

describe('toLlmError', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('detects missing credentials from a real SDK call', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '');
    vi.stubEnv('ANTHROPIC_CONFIG_DIR', '/nonexistent');
    vi.stubEnv('HOME', '/nonexistent');

    const error = await new Anthropic().models.list({ limit: 1 }).catch((e: unknown) => e);

    expect(toLlmError(error)?.code).toBe('llm_credentials_missing');
  });

  it('detects missing credentials wrapped by the streaming helper', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('ANTHROPIC_AUTH_TOKEN', '');
    vi.stubEnv('ANTHROPIC_CONFIG_DIR', '/nonexistent');
    vi.stubEnv('HOME', '/nonexistent');

    const stream = new Anthropic().beta.messages.stream({
      model: 'claude-opus-5-5',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'hi' }],
    });
    const error = await stream.finalMessage().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Anthropic.AnthropicError);
    expect(toLlmError(error)?.code).toBe('llm_credentials_missing');
  });

  it.each([
    [
      new Anthropic.AuthenticationError(401, undefined, 'bad key', headers),
      'llm_credentials_invalid',
      503,
    ],
    [
      new Anthropic.PermissionDeniedError(403, undefined, 'denied', headers),
      'llm_credentials_invalid',
      503,
    ],
    [new Anthropic.RateLimitError(429, undefined, 'slow down', headers), 'llm_rate_limited', 429],
    [
      new Anthropic.InternalServerError(529, undefined, 'overloaded', headers),
      'llm_unavailable',
      502,
    ],
    [new Anthropic.APIConnectionError({ message: 'ECONNREFUSED' }), 'llm_unavailable', 502],
  ])('maps %o', (error, code, statusCode) => {
    const llmError = toLlmError(error);
    expect(llmError).toBeInstanceOf(LlmError);
    expect(llmError?.code).toBe(code);
    expect(llmError?.statusCode).toBe(statusCode);
  });

  it('ignores unrelated errors', () => {
    expect(toLlmError(new Error('boom'))).toBeNull();
    expect(toLlmError('boom')).toBeNull();
  });
});
