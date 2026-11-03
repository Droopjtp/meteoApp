import type { MessagePart } from '@meteo/shared';
import { memo, Suspense } from 'react';
import { LazyWeatherChart } from '../WeatherChart/lazy';
import styles from './Chat.module.css';

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
            <LazyWeatherChart chart={part.chart} />
          </Suspense>
        ),
      )}
    </div>
  );
}

/** Memoised: while streaming, only the pending message re-renders. */
export const Message = memo(MessageImpl);
