import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useChat, useCreateChat } from '../../api/chats';
import { HttpError } from '../../api/http';
import { useLlmStatus } from '../../api/llm';
import { type ChatStream, type ToolStatus } from '../../hooks/useChatStream';
import styles from './Chat.module.css';
import { Composer } from './Composer';
import { EmptyState } from './EmptyState';
import { Message } from './Message';

interface ChatViewProps {
  chatId: string | null;
  /** Owned by the layout so that an answer keeps streaming across route changes. */
  stream: ChatStream;
}

function ToolStatuses({ tools }: { tools: ToolStatus[] }) {
  return (
    <ul className={styles.tools} aria-live="polite">
      {tools.map((tool) => (
        <li key={tool.id} className={styles.tool} data-status={tool.status}>
          <span className={styles.toolDot} aria-hidden />
          {tool.label}
          {tool.status === 'error' && ' — indisponible'}
        </li>
      ))}
    </ul>
  );
}

export function ChatView({ chatId, stream }: ChatViewProps) {
  const { data, isError, isPending: isLoading } = useChat(chatId);
  const createChat = useCreateChat();
  const { pending, error, send, stop } = stream;
  const navigate = useNavigate();
  const llmStatus = useLlmStatus();
  const endRef = useRef<HTMLDivElement>(null);

  const visiblePending = pending?.chatId === chatId ? pending : null;
  const visibleError = error?.chatId === chatId ? error : null;
  const messages = chatId ? (data?.messages ?? []) : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, visiblePending, visibleError]);

  const handleSend = async (text: string) => {
    let targetId = chatId;
    if (!targetId) {
      try {
        targetId = (await createChat.mutateAsync()).id;
      } catch {
        return; // Shown below (a 401 sends the user back to the sign-in screen instead).
      }
      navigate(`/c/${targetId}`);
    }
    void send(targetId, text);
  };

  // Don't flash the welcome screen while an existing chat loads.
  const isEmpty = messages.length === 0 && !visiblePending && !(chatId && isLoading);
  const llmUnavailable = llmStatus.data?.status === 'error';

  return (
    <div className={styles.chat}>
      <div className={styles.scroll}>
        {isError && <p className={styles.error}>Conversation introuvable.</p>}
        {isEmpty && !isError ? (
          <EmptyState onPick={handleSend} disabled={llmUnavailable} />
        ) : (
          <div className={styles.messages}>
            {messages.map((message) => (
              <Message key={message.id} role={message.role} parts={message.parts} />
            ))}
            {visiblePending && (
              <>
                <Message role="user" parts={[{ type: 'text', text: visiblePending.userText }]} />
                <div className={styles.assistantMessage}>
                  {visiblePending.tools.length > 0 && <ToolStatuses tools={visiblePending.tools} />}
                  {visiblePending.parts.length === 0 &&
                    visiblePending.tools.every((t) => t.status !== 'running') && (
                      <p className={styles.thinking}>Réflexion…</p>
                    )}
                </div>
                <Message role="assistant" parts={visiblePending.parts} />
              </>
            )}
            {visibleError && (
              <p role="alert" className={styles.error}>
                {visibleError.message}
              </p>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {createChat.error &&
        !(createChat.error instanceof HttpError && createChat.error.status === 401) && (
          <p role="alert" className={`${styles.error} ${styles.composerError}`}>
            Impossible de créer la conversation : {createChat.error.message}
          </p>
        )}
      <Composer
        onSend={handleSend}
        onStop={stop}
        isStreaming={visiblePending !== null}
        disabled={llmUnavailable || createChat.isPending}
      />
    </div>
  );
}
