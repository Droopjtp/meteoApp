import type { ChatStreamEvent } from '@meteo/shared';
import { toHttpError } from './http';

/**
 * POSTs a message and reads the Server-Sent Events answer.
 * EventSource only does GET, hence the manual parsing over fetch.
 */
export async function streamMessage(
  chatId: string,
  content: string,
  onEvent: (event: ChatStreamEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!response.ok || !response.body) throw await toHttpError(response);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      for (const line of frame.split('\n')) {
        if (line.startsWith('data: ')) onEvent(JSON.parse(line.slice(6)) as ChatStreamEvent);
      }
    }
  }
}
