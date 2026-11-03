import {
  type ApiError,
  type ChatStreamEvent,
  chatDetailSchema,
  chatIdParamsSchema,
  chatSummarySchema,
  sendMessageBodySchema,
} from '@meteo/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { currentUser, requireUser } from '../auth/guard.js';
import {
  appendMessages,
  createChat,
  deleteChat,
  findChat,
  getCharts,
  getMessages,
  listChats,
} from '../chats/repository.js';
import { toUiMessages } from '../chats/transcript.js';
import { runChatTurn } from '../llm/agent.js';
import { toLlmError } from '../llm/errors.js';

/**
 * Stored as the answer to a stopped question: otherwise the LLM sees it unanswered
 * and answers it along with the next message.
 */
const INTERRUPTED_TEXT = 'Réponse interrompue.';

const notFound: ApiError = {
  error: { code: 'chat_not_found', message: 'Conversation introuvable.' },
};
const apiErrorResponse = z.object({ error: z.object({ code: z.string(), message: z.string() }) });

export const chatRoutes: FastifyPluginAsyncZod = async (app) => {
  // Every route of this plugin requires a signed-in user.
  app.addHook('preHandler', requireUser);

  app.get(
    '/chats',
    { schema: { response: { 200: z.array(chatSummarySchema) } } },
    async (request) => listChats(app.db, currentUser(request).id),
  );

  app.post('/chats', { schema: { response: { 201: chatSummarySchema } } }, async (request, reply) =>
    reply.code(201).send(await createChat(app.db, currentUser(request).id)),
  );

  app.get(
    '/chats/:chatId',
    {
      schema: {
        params: chatIdParamsSchema,
        response: { 200: chatDetailSchema, 404: apiErrorResponse },
      },
    },
    async (request, reply) => {
      const { chatId } = request.params;
      const [chat, messages, charts] = await Promise.all([
        findChat(app.db, chatId, currentUser(request).id),
        getMessages(app.db, chatId),
        getCharts(app.db, chatId),
      ]);
      if (!chat) return reply.code(404).send(notFound);
      return { chat, messages: toUiMessages(messages, charts) };
    },
  );

  app.delete(
    '/chats/:chatId',
    { schema: { params: chatIdParamsSchema, response: { 204: z.null(), 404: apiErrorResponse } } },
    async (request, reply) => {
      const deleted = await deleteChat(app.db, request.params.chatId, currentUser(request).id);
      return deleted ? reply.code(204).send(null) : reply.code(404).send(notFound);
    },
  );

  /** Streams the assistant answer as Server-Sent Events (see ChatStreamEvent). */
  app.post(
    '/chats/:chatId/messages',
    { schema: { params: chatIdParamsSchema, body: sendMessageBodySchema } },
    async (request, reply) => {
      const { chatId } = request.params;
      if (!(await findChat(app.db, chatId, currentUser(request).id))) {
        return reply.code(404).send(notFound);
      }

      // From here on we write the raw response ourselves.
      reply.hijack();
      const res = reply.raw;
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      const emit = (event: ChatStreamEvent) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      // Client gone (tab closed, "stop" button): stop generating to save tokens.
      const abort = new AbortController();
      res.on('close', () => {
        if (!res.writableFinished) abort.abort();
      });

      try {
        await runChatTurn(
          {
            db: app.db,
            llm: app.llm,
            log: request.log,
            model: app.config.LLM_MODEL,
            effort: app.config.LLM_EFFORT,
            chatId,
            signal: abort.signal,
            emit,
          },
          request.body.content,
        );
        emit({ type: 'done' });
      } catch (error) {
        if (abort.signal.aborted) {
          request.log.info({ chatId }, 'Chat turn aborted by the client');
          // Turn steps are stored atomically, so the transcript ends with the user's message
          // (or tool results) unless the answer completed just before the abort.
          const last = (await getMessages(app.db, chatId)).at(-1);
          if (last?.role === 'user') {
            await appendMessages(app.db, chatId, [
              { role: 'assistant', content: [{ type: 'text', text: INTERRUPTED_TEXT }] },
            ]);
          }
        } else {
          const llmError = toLlmError(error);
          if (llmError) {
            request.log.warn({ code: llmError.code, err: llmError.cause }, llmError.message);
            emit({ type: 'error', code: llmError.code, message: llmError.message });
          } else {
            request.log.error({ err: error }, 'Chat turn failed');
            emit({
              type: 'error',
              code: 'internal_error',
              message: 'Une erreur inattendue est survenue.',
            });
          }
        }
      } finally {
        res.end();
      }
    },
  );
};
