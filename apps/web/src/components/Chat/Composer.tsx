import { type FormEvent, type KeyboardEvent, useState } from 'react';
import styles from './Chat.module.css';

interface ComposerProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function Composer({ onSend, onStop, isStreaming, disabled }: ComposerProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !isStreaming && !disabled;

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      <textarea
        className={styles.input}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Posez votre question météo…"
        rows={1}
        maxLength={2000}
        aria-label="Votre message"
      />
      {isStreaming ? (
        <button type="button" className={styles.sendButton} onClick={onStop}>
          Arrêter
        </button>
      ) : (
        <button type="submit" className={styles.sendButton} disabled={!canSend}>
          Envoyer
        </button>
      )}
    </form>
  );
}
