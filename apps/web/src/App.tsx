import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useId, useRef } from 'react';
import {
  Outlet,
  Route,
  Routes,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router';
import { useChats } from './api/chats';
import styles from './App.module.css';
import { authClient } from './auth/client';
import { AppHeader } from './components/AppHeader/AppHeader';
import { AuthScreen } from './components/AuthScreen/AuthScreen';
import { ChatView } from './components/Chat/ChatView';
import { LlmStatusBanner } from './components/LlmStatusBanner/LlmStatusBanner';
import { NotFound } from './components/NotFound/NotFound';
import { SettingsPage } from './components/SettingsPage/SettingsPage';
import { Sidebar } from './components/Sidebar/Sidebar';
import { type ChatStream, useChatStream } from './hooks/useChatStream';
import { useSidebar } from './hooks/useSidebar';

type SessionUser = NonNullable<ReturnType<typeof authClient.useSession>['data']>['user'];

/**
 * Layout route of the signed-in app. The streaming state lives here, not in the chat page:
 * the first message of a new chat navigates from "/" to "/c/:id" while the answer streams,
 * which remounts the page.
 */
function SignedInLayout({ user }: { user: SessionUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const stream = useChatStream();
  const { isMobile, isOpen, toggle, closeDrawer } = useSidebar();
  const { data: chats } = useChats();
  const sidebarId = useId();
  const sidebarRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const chatId = useMatch('/c/:chatId')?.params.chatId ?? null;
  const isSettings = useMatch('/settings') !== null;
  const isHome = useMatch('/') !== null;
  const drawerOpen = isMobile && isOpen;

  // Leaving the chat whose answer is streaming stops it (the server stops too). Compared with the
  // previous route, not the current one: a new chat starts streaming before the navigation from
  // "/" to "/c/:id" commits (React Router navigates in a transition).
  const previousChatId = useRef(chatId);
  const { pending, stop } = stream;
  useEffect(() => {
    if (previousChatId.current === chatId) return;
    if (pending && pending.chatId === previousChatId.current) stop();
    previousChatId.current = chatId;
  }, [chatId, pending, stop]);

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

  const signOut = async () => {
    await authClient.signOut();
    // Don't leave the previous user's chats in the cache.
    queryClient.clear();
    navigate('/');
  };

  let title = 'Page introuvable';
  if (isSettings) title = 'Paramètres';
  else if (chatId) title = chats?.find((chat) => chat.id === chatId)?.title ?? 'Conversation';
  else if (isHome) title = 'Nouvelle conversation';

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
        user={user}
        onNavigate={closeDrawer}
        onSettings={() => {
          navigate('/settings');
          closeDrawer();
        }}
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
        <Outlet context={stream satisfies ChatStream} />
      </main>
    </div>
  );
}

function ChatPage() {
  const { chatId = null } = useParams();
  const stream = useOutletContext<ChatStream>();
  return (
    <>
      <LlmStatusBanner />
      <ChatView chatId={chatId} stream={stream} />
    </>
  );
}

export function App() {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return null;
  // Signed out, every URL shows the sign-in screen; the URL is kept, so a deep link
  // opens the right page once signed in.
  if (!session) return <AuthScreen />;

  return (
    <Routes>
      <Route element={<SignedInLayout user={session.user} />}>
        <Route index element={<ChatPage />} />
        <Route path="c/:chatId" element={<ChatPage />} />
        <Route path="settings" element={<SettingsPage user={session.user} />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
