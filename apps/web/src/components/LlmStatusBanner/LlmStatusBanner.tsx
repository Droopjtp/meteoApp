import { useLlmStatus } from '../../api/llm';
import styles from './LlmStatusBanner.module.css';

export function LlmStatusBanner() {
  const { data } = useLlmStatus();

  if (data?.status !== 'error') return null;

  return (
    <div role="alert" className={styles.banner}>
      {data.message}
    </div>
  );
}
