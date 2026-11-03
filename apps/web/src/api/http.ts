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

export async function toHttpError(response: Response): Promise<HttpError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  return parsed.success
    ? new HttpError(response.status, parsed.data.error.code, parsed.data.error.message)
    : new HttpError(response.status, 'http_error', `Erreur serveur (${response.status})`);
}

export async function requestJson<T>(
  url: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw await toHttpError(response);
  return schema.parse(await response.json());
}

export const getJson = <T>(url: string, schema: z.ZodType<T>) => requestJson(url, schema);
