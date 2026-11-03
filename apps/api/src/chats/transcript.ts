import type Anthropic from '@anthropic-ai/sdk';
import type { MessagePart, ResolvedChart, UiMessage } from '@meteo/shared';

export type StoredContent = Anthropic.Beta.BetaContentBlockParam[];

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: StoredContent;
}

/**
 * The database stores the raw LLM transcript (needed to replay it to the API).
 * The UI needs something simpler: user bubbles, and one assistant message per turn
 * made of text and charts. Tool results are hidden.
 */
export function toUiMessages(
  messages: StoredMessage[],
  chartsByToolUseId: Map<string, ResolvedChart>,
): UiMessage[] {
  const ui: UiMessage[] = [];

  for (const message of messages) {
    if (message.role === 'user') {
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlockParam => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      // A user message holding only tool results continues the assistant turn.
      if (text) ui.push({ id: message.id, role: 'user', parts: [{ type: 'text', text }] });
      continue;
    }

    const parts: MessagePart[] = [];
    for (const block of message.content) {
      if (block.type === 'text' && block.text.trim()) {
        parts.push({ type: 'text', text: block.text });
      } else if (block.type === 'tool_use') {
        const chart = chartsByToolUseId.get(block.id);
        if (chart) parts.push({ type: 'chart', chart });
      }
    }

    const last = ui.at(-1);
    if (last?.role === 'assistant') {
      last.parts.push(...parts);
    } else {
      ui.push({ id: message.id, role: 'assistant', parts });
    }
  }

  return ui.filter((m) => m.parts.length > 0);
}
