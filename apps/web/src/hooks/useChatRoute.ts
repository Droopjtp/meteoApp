import { useCallback, useSyncExternalStore } from 'react';

// Two routes only ("/" and "/c/:chatId"): not worth a router dependency.
const CHAT_PATH = /^\/c\/([0-9a-f-]{36})$/i;

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

const getChatId = () => CHAT_PATH.exec(window.location.pathname)?.[1] ?? null;

export function useChatRoute() {
  const chatId = useSyncExternalStore(subscribe, getChatId);

  const navigate = useCallback((nextChatId: string | null) => {
    const path = nextChatId ? `/c/${nextChatId}` : '/';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, []);

  return { chatId, navigate };
}
