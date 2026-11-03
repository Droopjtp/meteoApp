import { useChats, useDeleteChat } from '../../api/chats';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeChatId: string | null;
  onSelect: (chatId: string | null) => void;
  user: { name: string; email: string };
  onSignOut: () => void;
}

export function Sidebar({ activeChatId, onSelect, user, onSignOut }: SidebarProps) {
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
    <aside className={styles.sidebar}>
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

      <footer className={styles.account}>
        <div className={styles.accountInfo}>
          <span className={styles.accountName}>{user.name}</span>
          <span className={styles.accountEmail}>{user.email}</span>
        </div>
        <button type="button" className={styles.signOut} onClick={onSignOut}>
          Se déconnecter
        </button>
      </footer>
    </aside>
  );
}
