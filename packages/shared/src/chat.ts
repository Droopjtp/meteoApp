import { z } from 'zod';
import { resolvedChartSchema } from './chart.js';

export const chatIdParamsSchema = z.object({
  chatId: z.uuid(),
});

export const chatSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const messagePartSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('chart'), chart: resolvedChartSchema }),
]);

export const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  parts: z.array(messagePartSchema),
});

export const chatDetailSchema = z.object({
  chat: chatSummarySchema,
  messages: z.array(uiMessageSchema),
});

export type ChatSummary = z.infer<typeof chatSummarySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
export type MessagePart = z.infer<typeof messagePartSchema>;
export type UiMessage = z.infer<typeof uiMessageSchema>;
export type ChatDetail = z.infer<typeof chatDetailSchema>;

/** Server-Sent Events emitted by POST /api/chats/:chatId/messages. */
export type ChatStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool'; id: string; status: 'running' | 'done' | 'error'; label: string }
  | { type: 'chart'; chart: z.infer<typeof resolvedChartSchema> }
  | { type: 'error'; code: string; message: string }
  | { type: 'done' };
