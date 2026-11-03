import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styles from './ProfileMenu.module.css';

interface ProfileMenuProps {
  user: { name: string; email: string };
  onSettings: () => void;
  onSignOut: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');
}

/** Menu button (WAI-ARIA menu pattern): arrows move, Escape closes, a click outside closes. */
export function ProfileMenu({ user, onSettings, onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const items = () => [
    ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
  ];

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      list[(index + step + list.length) % list.length]?.focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      (event.key === 'Home' ? list[0] : list.at(-1))?.focus();
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const choose = (action: () => void) => {
    close(false);
    action();
  };

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={styles.avatar} aria-hidden>
          {initials(user.name) || '?'}
        </span>
        <span className={styles.identity}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.email}>{user.email}</span>
        </span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Profil"
          className={styles.menu}
          onKeyDown={onMenuKeyDown}
        >
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => choose(onSettings)}
          >
            Paramètres
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => choose(onSignOut)}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
