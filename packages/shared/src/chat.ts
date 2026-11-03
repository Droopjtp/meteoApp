import { z } from 'zod';

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

export type ChatSummary = z.infer<typeof chatSummarySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
