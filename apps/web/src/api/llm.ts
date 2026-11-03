import { llmStatusSchema } from '@meteo/shared';
import { useQuery } from '@tanstack/react-query';
import { getJson } from './http';

export function useLlmStatus() {
  return useQuery({
    queryKey: ['llm', 'status'],
    queryFn: () => getJson('/api/llm/status', llmStatusSchema),
    staleTime: 60_000,
  });
}
