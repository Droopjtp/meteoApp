import { useQueryClient } from '@tanstack/react-query';
import styles from './App.module.css';
import { authClient } from './auth/client';
import { AuthScreen } from './components/AuthScreen/AuthScreen';
import { ChatView } from './components/Chat/ChatView';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';
import { SettingsPage } from './components/SettingsPage/SettingsPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { useRoute } from './hooks/useRoute';

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const { route, navigate, openChat } = useRoute();
  const queryClient = useQueryClient();

  if (isPending) return null;
  if (!session) return <AuthScreen />;

  const signOut = async () => {
    await authClient.signOut();
    // Don't leave the previous user's chats in the cache.
    queryClient.clear();
    openChat(null);
  };

  const chatId = route.page === 'chat' ? route.chatId : null;

  return (
    <div className={styles.layout}>
      <Sidebar
        activeChatId={chatId}
        onSelect={openChat}
        user={session.user}
        onSettings={() => navigate({ page: 'settings' })}
        onSignOut={signOut}
      />
      <main className={styles.main}>
        {route.page === 'settings' ? (
          <SettingsPage user={session.user} onBack={() => openChat(null)} />
        ) : (
          <>
            <LlmStatusBanner />
            <ChatView chatId={chatId} navigate={openChat} />
          </>
        )}
      </main>
    </div>
  );
}
