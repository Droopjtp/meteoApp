import Anthropic from '@anthropic-ai/sdk';
import type { LlmErrorCode } from '@meteo/shared';

const MESSAGES: Record<LlmErrorCode, string> = {
  llm_credentials_missing:
    "Aucun identifiant Anthropic n'est configuré. Définissez ANTHROPIC_API_KEY (ou ANTHROPIC_AUTH_TOKEN) dans le fichier .env, ou connectez-vous avec `ant auth login`.",
  llm_credentials_invalid:
    'Les identifiants Anthropic ont été refusés (invalides, expirés ou sans accès au modèle). Vérifiez ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN ou relancez `ant auth login`.',
  llm_rate_limited: 'Le service LLM est momentanément saturé. Réessayez dans quelques instants.',
  llm_unavailable: 'Le service LLM est injoignable pour le moment. Réessayez plus tard.',
  llm_refused: 'Le modèle a refusé de traiter cette demande. Essayez de la reformuler.',
};

const STATUS_CODES: Record<LlmErrorCode, number> = {
  llm_credentials_missing: 503,
  llm_credentials_invalid: 503,
  llm_rate_limited: 429,
  llm_unavailable: 502,
  llm_refused: 422,
};

export class LlmError extends Error {
  readonly statusCode: number;

  constructor(
    readonly code: LlmErrorCode,
    options?: ErrorOptions,
  ) {
    super(MESSAGES[code], options);
    this.name = 'LlmError';
    this.statusCode = STATUS_CODES[code];
  }
}

/**
 * The SDK throws a plain Error (not an AnthropicError) when no credential source
 * resolves: API key, auth token, or `ant auth login` profile. Streaming helpers wrap it
 * in an AnthropicError, so the cause chain is walked.
 */
function isMissingCredentialsError(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if (
      !(current instanceof Anthropic.AnthropicError) &&
      current.message.startsWith('Could not resolve authentication method')
    ) {
      return true;
    }
  }
  return false;
}

/** Maps an Anthropic SDK error to a domain error, or returns null if it is not LLM-related. */
export function toLlmError(error: unknown): LlmError | null {
  if (error instanceof LlmError) return error;
  if (isMissingCredentialsError(error))
    return new LlmError('llm_credentials_missing', { cause: error });
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return new LlmError('llm_credentials_invalid', { cause: error });
  }
  if (error instanceof Anthropic.RateLimitError)
    return new LlmError('llm_rate_limited', { cause: error });
  if (error instanceof Anthropic.APIError) return new LlmError('llm_unavailable', { cause: error });
  return null;
}
