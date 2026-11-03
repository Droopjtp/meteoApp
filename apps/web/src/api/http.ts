import type { ApiError } from '@meteo/shared';

// Responses are not re-validated here: the API already validates them against the shared
// Zod schemas before sending, and importing only types keeps Zod (~26 kB gzip) out of the bundle.

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function isApiError(body: unknown): body is ApiError {
  const error = (body as Partial<ApiError> | null)?.error;
  return typeof error?.code === 'string' && typeof error.message === 'string';
}

export async function toHttpError(response: Response): Promise<HttpError> {
  const body: unknown = await response.json().catch(() => null);
  return isApiError(body)
    ? new HttpError(response.status, body.error.code, body.error.message)
    : new HttpError(response.status, 'http_error', `Erreur serveur (${response.status})`);
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw await toHttpError(response);
  return (await response.json()) as T;
}
