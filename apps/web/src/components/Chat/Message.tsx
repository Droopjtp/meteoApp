import type { MessagePart } from '@meteo/shared';
import { lazy, memo, Suspense } from 'react';
import styles from './Chat.module.css';

// Recharts is the heaviest dependency: load it only when a chart is shown.
const WeatherChart = lazy(() => import('../WeatherChart/WeatherChart'));

/** The prompt asks for plain text; render stray **bold** anyway rather than showing asterisks. */
function RichText({ text }: { text: string }) {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((chunk, index) => (index % 2 === 1 ? <strong key={index}>{chunk}</strong> : chunk));
}

interface MessageProps {
  role: 'user' | 'assistant';
  parts: MessagePart[];
}

function MessageImpl({ role, parts }: MessageProps) {
  return (
    <div className={role === 'user' ? styles.userMessage : styles.assistantMessage}>
      {parts.map((part, index) =>
        part.type === 'text' ? (
          <p key={index} className={styles.text}>
            <RichText text={part.text} />
          </p>
        ) : (
          <Suspense key={part.chart.id} fallback={<div className={styles.chartPlaceholder} />}>
            <WeatherChart chart={part.chart} />
          </Suspense>
        ),
      )}
    </div>
  );
}

/** Memoised: while streaming, only the pending message re-renders. */
export const Message = memo(MessageImpl);
