import { useCallback, useMemo, useSyncExternalStore } from 'react';

// A handful of routes ("/", "/c/:chatId", "/settings"): not worth a router dependency.
export type Route = { page: 'chat'; chatId: string | null } | { page: 'settings' };

const CHAT_PATH = /^\/c\/([0-9a-f-]{36})$/i;

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

const getPath = () => window.location.pathname;

function parse(path: string): Route {
  if (path === '/settings') return { page: 'settings' };
  return { page: 'chat', chatId: CHAT_PATH.exec(path)?.[1] ?? null };
}

function toPath(route: Route): string {
  if (route.page === 'settings') return '/settings';
  return route.chatId ? `/c/${route.chatId}` : '/';
}

export function useRoute() {
  const path = useSyncExternalStore(subscribe, getPath);
  const route = useMemo(() => parse(path), [path]);

  const navigate = useCallback((to: Route) => {
    const nextPath = toPath(to);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  /** Shortcut for chat navigation (null = new chat). */
  const openChat = useCallback(
    (chatId: string | null) => navigate({ page: 'chat', chatId }),
    [navigate],
  );

  return { route, navigate, openChat };
}
