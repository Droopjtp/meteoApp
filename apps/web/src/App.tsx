import { useQueryClient } from '@tanstack/react-query';
import styles from './App.module.css';
import { authClient } from './auth/client';
import { AuthScreen } from './components/AuthScreen/AuthScreen';
import { ChatView } from './components/Chat/ChatView';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useChatRoute } from './hooks/useChatRoute';

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const { chatId, navigate } = useChatRoute();
  const queryClient = useQueryClient();

  if (isPending) return null;
  if (!session) return <AuthScreen />;

  const signOut = async () => {
    await authClient.signOut();
    // Don't leave the previous user's chats in the cache.
    queryClient.clear();
    navigate(null);
  };

  return (
    <div className={styles.layout}>
      <Sidebar activeChatId={chatId} onSelect={navigate} user={session.user} onSignOut={signOut} />
      <main className={styles.main}>
        <LlmStatusBanner />
        <ChatView chatId={chatId} navigate={navigate} />
      </main>
    </div>
  );
}
