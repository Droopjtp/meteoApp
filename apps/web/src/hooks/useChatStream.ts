import type { ChatStreamEvent, MessagePart } from '@meteo/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { chatKeys } from '../api/chats';
import { HttpError } from '../api/http';
import { streamMessage } from '../api/stream';
import { refreshSession } from '../auth/client';

export interface ToolStatus {
  id: string;
  label: string;
  status: 'running' | 'done' | 'error';
}

export interface PendingTurn {
  chatId: string;
  userText: string;
  parts: MessagePart[];
  tools: ToolStatus[];
  /** Text after a tool call starts a new paragraph instead of extending the previous one. */
  textBreak: boolean;
}

export interface TurnError {
  chatId: string;
  message: string;
}

function applyEvent(turn: PendingTurn, event: ChatStreamEvent): PendingTurn {
  switch (event.type) {
    case 'text': {
      const last = turn.parts.at(-1);
      const parts =
        last?.type === 'text' && !turn.textBreak
          ? [...turn.parts.slice(0, -1), { type: 'text' as const, text: last.text + event.text }]
          : [...turn.parts, { type: 'text' as const, text: event.text }];
      return { ...turn, parts, textBreak: false };
    }
    case 'chart':
      return { ...turn, parts: [...turn.parts, { type: 'chart', chart: event.chart }] };
    case 'tool': {
      const others = turn.tools.filter((t) => t.id !== event.id);
      return {
        ...turn,
        tools: [...others, { id: event.id, label: event.label, status: event.status }],
      };
    }
    default:
      return turn;
  }
}

export function useChatStream() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingTurn | null>(null);
  const [error, setError] = useState<TurnError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  useEffect(() => stop, [stop]);

  const send = useCallback(
    async (chatId: string, userText: string) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      setError(null);

      let turn: PendingTurn = { chatId, userText, parts: [], tools: [], textBreak: false };
      setPending(turn);

      // Tokens arrive faster than the screen refreshes: render at most once per frame.
      let frame: number | null = null;
      const flush = () => {
        frame = null;
        setPending(turn);
      };

      try {
        await streamMessage(
          chatId,
          userText,
          (event) => {
            if (event.type === 'error') {
              setError({ chatId, message: event.message });
              return;
            }
            turn = applyEvent(turn, event);
            frame ??= requestAnimationFrame(flush);
          },
          abort.signal,
        );
      } catch (err) {
        if (err instanceof HttpError && err.status === 401) refreshSession();
        if (!abort.signal.aborted) {
          setError({ chatId, message: err instanceof Error ? err.message : 'Erreur réseau.' });
        }
      } finally {
        if (frame !== null) cancelAnimationFrame(frame);
        // On "stop", the server only learns about it when the connection closes, then stores
        // the interrupted answer: give it a moment so the refetch includes it.
        if (abort.signal.aborted) await new Promise((resolve) => setTimeout(resolve, 300));
        // The server persisted the turn: swap the optimistic view for the stored one.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) }),
          queryClient.invalidateQueries({ queryKey: chatKeys.list, exact: true }),
        ]);
        if (abortRef.current === abort) {
          abortRef.current = null;
          setPending(null);
        }
      }
    },
    [queryClient],
  );

  return { pending, error, send, stop, isStreaming: pending !== null };
}
