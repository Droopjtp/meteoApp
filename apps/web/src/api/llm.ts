import type { LlmStatus } from '@meteo/shared';
import { useQuery } from '@tanstack/react-query';
import { requestJson } from './http';

export function useLlmStatus() {
  return useQuery({
    queryKey: ['llm', 'status'],
    queryFn: () => requestJson<LlmStatus>('/api/llm/status'),
    staleTime: 60_000,
  });
}
