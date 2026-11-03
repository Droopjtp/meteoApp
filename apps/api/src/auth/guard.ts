import type { ApiError } from '@meteo/shared';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthUser } from './auth.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null;
  }
}

const unauthorized: ApiError = {
  error: { code: 'unauthorized', message: 'Connectez-vous pour continuer.' },
};

/**
 * preHandler hook for protected routes: Better Auth checks the session cookie
 * (signature, then the session row and its expiry) and we expose the user on the request.
 */
export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const session = await request.server.auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) return reply.code(401).send(unauthorized);
  request.user = session.user;
}

/** For handlers behind requireUser. */
export function currentUser(request: FastifyRequest): AuthUser {
  if (!request.user) throw new Error('currentUser() called on a route without requireUser');
  return request.user;
}
