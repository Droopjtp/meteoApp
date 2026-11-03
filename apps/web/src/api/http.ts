import { apiErrorSchema } from '@meteo/shared';
import type { z } from 'zod';

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

export async function getJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw parsed.success
      ? new HttpError(response.status, parsed.data.error.code, parsed.data.error.message)
      : new HttpError(response.status, 'http_error', `Erreur serveur (${response.status})`);
  }
  return schema.parse(body);
}
