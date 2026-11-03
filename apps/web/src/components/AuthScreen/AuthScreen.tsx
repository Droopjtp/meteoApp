import { type FormEvent, useState } from 'react';
import { authClient, authErrorMessage } from '../../auth/client';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle';
import styles from './AuthScreen.module.css';

type Mode = 'sign-in' | 'sign-up';

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));

    setPending(true);
    setError(null);
    // On success Better Auth sets the session cookie and useSession() re-renders the app.
    const { error: authError } =
      mode === 'sign-up'
        ? await authClient.signUp.email({ name: String(form.get('name')), email, password })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (authError) setError(authErrorMessage(authError));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <main className={styles.screen}>
      <ThemeToggle className={styles.themeToggle} />
      <div className={styles.card}>
        <h1 className={styles.title}>Météo Chat</h1>
        <p className={styles.subtitle}>Explorez la météo en langage naturel.</p>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-in'}
            className={styles.tab}
            onClick={() => switchMode('sign-in')}
          >
            Connexion
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'sign-up'}
            className={styles.tab}
            onClick={() => switchMode('sign-up')}
          >
            Créer un compte
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'sign-up' && (
            <label className={styles.field}>
              Nom
              <input name="name" required autoComplete="name" maxLength={100} />
            </label>
          )}
          <label className={styles.field}>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label className={styles.field}>
            Mot de passe
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
            />
            {mode === 'sign-up' && <span className={styles.hint}>8 caractères minimum.</span>}
          </label>

          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? 'Un instant…' : mode === 'sign-up' ? 'Créer mon compte' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
