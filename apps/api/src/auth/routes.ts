import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

function toFetchRequest(request: FastifyRequest): Request {
  const url = new URL(request.url, `http://${request.headers.host}`);
  return new Request(url, {
    method: request.method,
    headers: fromNodeHeaders(request.headers),
    body: request.body ? JSON.stringify(request.body) : undefined,
  });
}

/** Hands /api/auth/* (sign-up, sign-in, sign-out, get-session...) over to Better Auth. */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    handler: async (request, reply) => {
      const response = await app.auth.handler(toFetchRequest(request));
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        // Several Set-Cookie headers must stay separate.
        if (key.toLowerCase() !== 'set-cookie') reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
};
