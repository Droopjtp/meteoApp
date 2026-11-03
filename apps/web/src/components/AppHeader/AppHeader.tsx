import type { Ref } from 'react';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  title: string;
  sidebarOpen: boolean;
  sidebarId: string;
  onToggleSidebar: () => void;
  toggleRef: Ref<HTMLButtonElement>;
}

function SidebarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="3.5"
        width="15"
        height="13"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M7.5 3.5v13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AppHeader({
  title,
  sidebarOpen,
  sidebarId,
  onToggleSidebar,
  toggleRef,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.toggle}
        onClick={onToggleSidebar}
        aria-controls={sidebarId}
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? 'Masquer les conversations' : 'Afficher les conversations'}
        title={sidebarOpen ? 'Masquer les conversations' : 'Afficher les conversations'}
      >
        <SidebarIcon />
      </button>
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
