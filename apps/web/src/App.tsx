import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef } from 'react';
import { useChats } from './api/chats';
import styles from './App.module.css';
import { authClient } from './auth/client';
import { AppHeader } from './components/AppHeader/AppHeader';
import { AuthScreen } from './components/AuthScreen/AuthScreen';
import { ChatView } from './components/Chat/ChatView';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';
import { SettingsPage } from './components/SettingsPage/SettingsPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { type Route, useRoute } from './hooks/useRoute';
import { useSidebar } from './hooks/useSidebar';

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>['data']>['user'];

function SignedInApp({ user }: { user: SessionUser }) {
  const { route, navigate } = useRoute();
  const queryClient = useQueryClient();
  const sidebar = useSidebar();
  const { data: chats } = useChats();
  const sidebarId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const chatId = route.page === 'chat' ? route.chatId : null;
  const { isMobile, isOpen, toggle, closeDrawer } = sidebar;
  const drawerOpen = isMobile && isOpen;

  // Mobile drawer: focus moves into it when it opens, back to the toggle when it closes;
  // Escape closes it.
  const wasDrawerOpen = useRef(false);
  useEffect(() => {
    if (drawerOpen) {
      sidebarRef.current?.querySelector<HTMLElement>('button, [href]')?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') closeDrawer();
      };
      document.addEventListener('keydown', onKeyDown);
      wasDrawerOpen.current = true;
      return () => document.removeEventListener('keydown', onKeyDown);
    }
    if (wasDrawerOpen.current) {
      wasDrawerOpen.current = false;
      toggleRef.current?.focus();
    }
  }, [drawerOpen, closeDrawer]);

  const go = (to: Route) => {
    navigate(to);
    closeDrawer();
  };
  const openChat = (id: string | null) => go({ page: 'chat', chatId: id });

  const signOut = async () => {
    await authClient.signOut();
    // Don't leave the previous user's chats in the cache.
    queryClient.clear();
    navigate({ page: 'chat', chatId: null });
  };

  const title =
    route.page === 'settings'
      ? 'Paramètres'
      : (chats?.find((chat) => chat.id === chatId)?.title ?? 'Nouvelle conversation');

  return (
    <div className={styles.layout} data-sidebar={isOpen ? 'open' : 'closed'}>
      {drawerOpen && <div className={styles.backdrop} onClick={closeDrawer} aria-hidden />}
      <Sidebar
        ref={sidebarRef}
        id={sidebarId}
        className={styles.sidebar}
        // Hidden sidebar: out of the tab order and of the accessibility tree.
        inert={!isOpen}
        activeChatId={chatId}
        onSelect={openChat}
        user={user}
        onSettings={() => go({ page: 'settings' })}
        onSignOut={signOut}
        onClose={isMobile ? closeDrawer : undefined}
      />
      <main className={styles.main}>
        <AppHeader
          title={title}
          sidebarOpen={isOpen}
          sidebarId={sidebarId}
          onToggleSidebar={toggle}
          toggleRef={toggleRef}
        />
        {route.page === 'settings' ? (
          <SettingsPage user={user} onBack={() => openChat(null)} />
        ) : (
          <>
            <LlmStatusBanner />
            <ChatView chatId={chatId} navigate={(id) => navigate({ page: 'chat', chatId: id })} />
          </>
        )}
      </main>
    </div>
  );
}

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;
  if (!session) return <AuthScreen />;
  return <SignedInApp user={session.user} />;
}
