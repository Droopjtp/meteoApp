import { llmStatusSchema } from '@meteo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const llmRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/llm/status', { schema: { response: { 200: llmStatusSchema } } }, async () =>
    app.checkLlmStatus(),
  );
};
