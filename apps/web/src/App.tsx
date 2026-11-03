import styles from './App.module.css';
import { ChatView } from './components/Chat/ChatView';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useChatRoute } from './hooks/useChatRoute';

export function App() {
  const { chatId, navigate } = useChatRoute();

  return (
    <div className={styles.layout}>
      <Sidebar activeChatId={chatId} onSelect={navigate} />
      <main className={styles.main}>
        <LlmStatusBanner />
        <ChatView chatId={chatId} navigate={navigate} />
      </main>
    </div>
  );
}
