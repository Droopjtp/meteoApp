import { describe, expect, it } from 'vitest';
import { applyEvent, type PendingTurn } from './useChatStream';

const empty: PendingTurn = { chatId: 'c', userText: 'q', parts: [], tools: [], textBreak: false };

describe('applyEvent', () => {
  it('appends text deltas to the current paragraph', () => {
    const turn = [{ text: 'Il ' }, { text: 'fera ' }, { text: 'doux.' }].reduce(
      (t, e) => applyEvent(t, { type: 'text', ...e }),
      empty,
    );
    expect(turn.parts).toEqual([{ type: 'text', text: 'Il fera doux.' }]);
  });

  it('starts a new paragraph for text that follows a tool call', () => {
    let turn = applyEvent(empty, { type: 'text', text: 'Je regarde.' });
    turn = applyEvent(turn, { type: 'tool', id: 't1', status: 'running', label: 'Météo' });
    turn = applyEvent(turn, { type: 'tool', id: 't1', status: 'done', label: 'Météo' });
    turn = applyEvent(turn, { type: 'text', text: 'Il fera doux.' });
    expect(turn.parts.map((p) => p.type === 'text' && p.text)).toEqual([
      'Je regarde.',
      'Il fera doux.',
    ]);
    expect(turn.tools).toEqual([{ id: 't1', status: 'done', label: 'Météo' }]);
  });
});
