import type Anthropic from '@anthropic-ai/sdk';
import type { ApiError, LlmStatus } from '@meteo/shared';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config.js';
import type { Db } from './db/client.js';
import { createLlmStatusChecker } from './llm/client.js';
import { toLlmError } from './llm/errors.js';
import { chatRoutes } from './routes/chats.js';
import { healthRoutes } from './routes/health.js';
import { llmRoutes } from './routes/llm.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
    config: Config;
    llm: Anthropic;
    checkLlmStatus: () => Promise<LlmStatus>;
  }
}

export function buildApp({ config, db, llm }: { config: Config; db: Db; llm: Anthropic }) {
  const app = Fastify({
    logger: config.NODE_ENV === 'development' ? { level: 'info' } : true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', config);
  app.decorate('db', db);
  app.decorate('llm', llm);
  app.decorate('checkLlmStatus', createLlmStatusChecker(llm));

  app.setErrorHandler((error, request, reply) => {
    const llmError = toLlmError(error);
    if (llmError) {
      request.log.warn({ code: llmError.code, cause: llmError.cause }, llmError.message);
      const body: ApiError = { error: { code: llmError.code, message: llmError.message } };
      return reply.status(llmError.statusCode).send(body);
    }
    // Fastify's default handling (validation errors, 404s, 500s).
    throw error;
  });

  app.register(healthRoutes, { prefix: '/api' });
  app.register(llmRoutes, { prefix: '/api' });
  app.register(chatRoutes, { prefix: '/api' });

  return app;
}
