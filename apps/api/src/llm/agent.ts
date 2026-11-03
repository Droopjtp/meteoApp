import Anthropic from '@anthropic-ai/sdk';
import { type ChatStreamEvent, chartSpecSchema } from '@meteo/shared';
import type { FastifyBaseLogger } from 'fastify';
import { ChartSpecError, resolveChart } from '../charts/resolve.js';
import {
  appendMessages,
  getDatasets,
  getMessages,
  saveChart,
  saveDataset,
  setTitleIfDefault,
} from '../chats/repository.js';
import type { StoredContent } from '../chats/transcript.js';
import type { Db } from '../db/client.js';
import { getWeather } from '../weather/service.js';
import { summarizeDataset } from '../weather/summary.js';
import { type Dataset, WeatherError } from '../weather/types.js';
import { LlmError } from './errors.js';
import { buildSystemPrompt } from './prompt.js';
import { getWeatherInputSchema, TOOLS } from './tools.js';

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface TurnContext {
  db: Db;
  llm: Anthropic;
  log: FastifyBaseLogger;
  model: string;
  effort: Effort;
  chatId: string;
  signal: AbortSignal;
  emit: (event: ChatStreamEvent) => void;
}

/** Safety net against tool-call loops; a weather answer needs 2 or 3 steps. */
const MAX_STEPS = 8;
const MAX_JSON_RETRIES = 2;

type ToolUse = Anthropic.Beta.BetaToolUseBlock;
type ToolResult = Anthropic.Beta.BetaToolResultBlockParam;

/**
 * With server-side fallbacks, a declined partial output is followed by a `fallback` block.
 * Model-internal blocks before the last one must not be replayed, and its tool calls never run.
 */
function dropDeclinedPartial(content: Anthropic.Beta.BetaContentBlock[]): StoredContent {
  const boundary = content.findLastIndex((block) => block.type === 'fallback');
  if (boundary === -1) return content as StoredContent;
  return content.filter(
    (block, index) =>
      index > boundary || !['thinking', 'redacted_thinking', 'tool_use'].includes(block.type),
  ) as StoredContent;
}

function formatDay(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

async function runTool(
  ctx: TurnContext,
  toolUse: ToolUse,
  datasets: Map<string, Dataset>,
): Promise<ToolResult> {
  const error = (message: string): ToolResult => ({
    type: 'tool_result',
    tool_use_id: toolUse.id,
    is_error: true,
    content: message,
  });

  if (toolUse.name === 'get_weather') {
    // Eager input streaming: the API no longer validates tool inputs, we do.
    const input = getWeatherInputSchema.safeParse(toolUse.input);
    if (!input.success) return error(`Invalid input: ${input.error.message}`);
    const { location, country_code, start_date, end_date, granularity, variables } = input.data;

    const label = `Météo · ${location} (${formatDay(start_date)} → ${formatDay(end_date)})`;
    ctx.emit({ type: 'tool', id: toolUse.id, status: 'running', label });
    try {
      const dataset = await getWeather({
        location,
        countryCode: country_code,
        startDate: start_date,
        endDate: end_date,
        granularity,
        variables,
      });
      await saveDataset(ctx.db, ctx.chatId, dataset);
      datasets.set(dataset.id, dataset);
      ctx.emit({ type: 'tool', id: toolUse.id, status: 'done', label });
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(summarizeDataset(dataset)),
      };
    } catch (err) {
      ctx.emit({ type: 'tool', id: toolUse.id, status: 'error', label });
      if (err instanceof WeatherError) return error(err.message);
      ctx.log.error({ err }, 'get_weather failed');
      return error('Internal error while fetching weather data.');
    }
  }

  if (toolUse.name === 'render_chart') {
    const spec = chartSpecSchema.safeParse(toolUse.input);
    if (!spec.success) return error(`Invalid chart spec: ${spec.error.message}`);
    try {
      const chart = resolveChart(toolUse.id, spec.data, datasets);
      await saveChart(ctx.db, ctx.chatId, chart);
      ctx.emit({ type: 'chart', chart });
      return {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: 'The chart is displayed to the user.',
      };
    } catch (err) {
      if (err instanceof ChartSpecError) return error(err.message);
      throw err;
    }
  }

  return error(`Unknown tool "${toolUse.name}".`);
}

export async function runChatTurn(ctx: TurnContext, userText: string): Promise<void> {
  const { db, chatId } = ctx;
  const [history, datasets] = await Promise.all([getMessages(db, chatId), getDatasets(db, chatId)]);

  const userContent: StoredContent = [{ type: 'text', text: userText }];
  await appendMessages(db, chatId, [{ role: 'user', content: userContent }]);
  if (history.length === 0) await setTitleIfDefault(db, chatId, userText);

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: 'user', content: userContent },
  ];
  const system = buildSystemPrompt();

  let jsonRetries = 0;
  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = ctx.llm.beta.messages.stream(
      {
        model: ctx.model,
        max_tokens: 16000,
        system,
        tools: TOOLS,
        messages,
        output_config: { effort: ctx.effort },
        // Caches tools + system + history: each tool-loop step re-sends the whole conversation.
        cache_control: { type: 'ephemeral' },
        // On a safety decline, the API re-runs the request on Anthropic's recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      },
      { signal: ctx.signal },
    );
    stream.on('text', (text) => ctx.emit({ type: 'text', text }));

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Only an unparseable streamed tool input is worth re-issuing; API errors and aborts propagate.
      if (
        err instanceof Anthropic.APIError ||
        err instanceof Anthropic.APIUserAbortError ||
        ctx.signal.aborted ||
        jsonRetries++ >= MAX_JSON_RETRIES
      ) {
        throw err;
      }
      ctx.log.warn({ err }, 'Unparseable tool input, re-issuing the turn');
      continue;
    }

    if (message.stop_reason === 'refusal') throw new LlmError('llm_refused');

    const content = dropDeclinedPartial(message.content);
    const toolUses = content.filter((b): b is ToolUse => b.type === 'tool_use');

    // A tool input cut off by max_tokens can still parse: never run it.
    if (message.stop_reason === 'max_tokens' && toolUses.length > 0) {
      throw new Error('Tool input truncated by max_tokens');
    }
    if (message.stop_reason !== 'tool_use' || toolUses.length === 0) {
      await appendMessages(db, chatId, [{ role: 'assistant', content }]);
      return;
    }

    // Parallel tool calls (e.g. one get_weather per city) run concurrently,
    // and all their results go back in a single user message.
    const weatherCalls = toolUses.filter((t) => t.name !== 'render_chart');
    const chartCalls = toolUses.filter((t) => t.name === 'render_chart');
    const weatherResults = await Promise.all(weatherCalls.map((t) => runTool(ctx, t, datasets)));
    const chartResults = await Promise.all(chartCalls.map((t) => runTool(ctx, t, datasets)));
    const byId = new Map([...weatherResults, ...chartResults].map((r) => [r.tool_use_id, r]));
    const toolResults = toolUses.map((t) => byId.get(t.id)).filter((r): r is ToolResult => !!r);

    await appendMessages(db, chatId, [
      { role: 'assistant', content },
      { role: 'user', content: toolResults },
    ]);
    messages.push({ role: 'assistant', content }, { role: 'user', content: toolResults });
  }

  ctx.log.warn({ chatId }, 'Max tool steps reached');
}
