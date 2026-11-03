import type { ResolvedChart } from '@meteo/shared';
import { describe, expect, it } from 'vitest';
import { type StoredMessage, toUiMessages } from './transcript.js';

const chart: ResolvedChart = {
  id: 'tu_chart',
  title: 'T',
  type: 'line',
  granularity: 'daily',
  series: [],
  points: [],
};

describe('toUiMessages', () => {
  it('folds a tool loop into one assistant message with text and charts', () => {
    const messages: StoredMessage[] = [
      { id: '1', role: 'user', content: [{ type: 'text', text: 'Météo Lyon ?' }] },
      {
        id: '2',
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'tool_use', id: 'tu_weather', name: 'get_weather', input: {} },
        ],
      },
      {
        id: '3',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu_weather', content: '{}' }],
      },
      {
        id: '4',
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_chart', name: 'render_chart', input: {} }],
      },
      {
        id: '5',
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu_chart', content: 'ok' }],
      },
      { id: '6', role: 'assistant', content: [{ type: 'text', text: 'Il fera doux.' }] },
    ];

    expect(toUiMessages(messages, new Map([['tu_chart', chart]]))).toEqual([
      { id: '1', role: 'user', parts: [{ type: 'text', text: 'Météo Lyon ?' }] },
      {
        id: '2',
        role: 'assistant',
        parts: [
          { type: 'chart', chart },
          { type: 'text', text: 'Il fera doux.' },
        ],
      },
    ]);
  });

  it('drops assistant turns with nothing to show', () => {
    const messages: StoredMessage[] = [
      { id: '1', role: 'user', content: [{ type: 'text', text: 'Salut' }] },
      { id: '2', role: 'assistant', content: [{ type: 'text', text: '  ' }] },
    ];
    expect(toUiMessages(messages, new Map())).toHaveLength(1);
  });
});
