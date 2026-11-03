import { chatDetailSchema, chatSummarySchema } from '@meteo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { requestJson, toHttpError } from './http';

export const chatKeys = {
  list: ['chats'] as const,
  detail: (chatId: string) => ['chats', chatId] as const,
};

export function useChats() {
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: () => requestJson('/api/chats', z.array(chatSummarySchema)),
  });
}

export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: chatKeys.detail(chatId ?? ''),
    queryFn: () => requestJson(`/api/chats/${chatId}`, chatDetailSchema),
    enabled: chatId !== null,
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => requestJson('/api/chats', chatSummarySchema, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatKeys.list, exact: true }),
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw await toHttpError(response);
      return chatId;
    },
    onSuccess: (chatId) => {
      queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
      return queryClient.invalidateQueries({ queryKey: chatKeys.list, exact: true });
    },
  });
}
