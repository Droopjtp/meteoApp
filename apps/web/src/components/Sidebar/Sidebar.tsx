import type { Ref } from 'react';
import { useChats, useDeleteChat } from '../../api/chats';
import { ProfileMenu } from '../ProfileMenu/ProfileMenu';
import styles from './Sidebar.module.css';

interface SidebarProps {
  ref?: Ref<HTMLElement>;
  id?: string;
  className?: string;
  inert?: boolean;
  activeChatId: string | null;
  onSelect: (chatId: string | null) => void;
  user: { name: string; email: string };
  onSettings: () => void;
  onSignOut: () => void;
  /** Mobile drawer only: shows a close button. */
  onClose?: () => void;
}

export function Sidebar({
  ref,
  id,
  className,
  inert,
  activeChatId,
  onSelect,
  user,
  onSettings,
  onSignOut,
  onClose,
}: SidebarProps) {
  const { data: chats, isPending, isError } = useChats();
  const deleteChat = useDeleteChat();

  const handleDelete = (chatId: string, title: string) => {
    if (!window.confirm(`Supprimer la conversation « ${title} » ?`)) return;
    deleteChat.mutate(chatId, {
      onSuccess: () => {
        if (chatId === activeChatId) onSelect(null);
      },
    });
  };

  return (
    <aside
      ref={ref}
      id={id}
      className={className ? `${styles.sidebar} ${className}` : styles.sidebar}
      inert={inert}
      aria-label="Conversations et profil"
    >
      <div className={styles.top}>
        <div className={styles.profile}>
          <ProfileMenu user={user} onSettings={onSettings} onSignOut={onSignOut} />
        </div>
        {onClose && (
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            ×
          </button>
        )}
      </div>

      <button type="button" className={styles.newChat} onClick={() => onSelect(null)}>
        + Nouvelle conversation
      </button>

      <nav className={styles.list} aria-label="Conversations">
        {isPending && <p className={styles.hint}>Chargement…</p>}
        {isError && <p className={styles.hint}>Impossible de charger les conversations.</p>}
        {chats?.length === 0 && <p className={styles.hint}>Aucune conversation pour l'instant.</p>}
        {chats?.map((chat) => (
          <div
            key={chat.id}
            className={chat.id === activeChatId ? `${styles.item} ${styles.active}` : styles.item}
          >
            <button
              type="button"
              className={styles.itemTitle}
              onClick={() => onSelect(chat.id)}
              aria-current={chat.id === activeChatId ? 'page' : undefined}
              title={chat.title}
            >
              {chat.title}
            </button>
            <button
              type="button"
              className={styles.delete}
              onClick={() => handleDelete(chat.id, chat.title)}
              aria-label={`Supprimer « ${chat.title} »`}
              disabled={deleteChat.isPending && deleteChat.variables === chat.id}
            >
              ×
            </button>
          </div>
        ))}
      </nav>
    </aside>
  );
}
