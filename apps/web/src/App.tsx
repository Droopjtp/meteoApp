import styles from './App.module.css';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';

export function App() {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <button type="button" className={styles.newChat}>
          + Nouvelle conversation
        </button>
      </aside>
      <main className={styles.main}>
        <LlmStatusBanner />
        <div className={styles.empty}>
          <p className={styles.placeholder}>Demandez-moi la météo, n'importe où.</p>
        </div>
      </main>
    </div>
  );
}
