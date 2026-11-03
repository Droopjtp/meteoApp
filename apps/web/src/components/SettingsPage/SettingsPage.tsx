import { type FormEvent, useState } from 'react';
import { authClient, authErrorMessage } from '../../auth/client';
import styles from './SettingsPage.module.css';

interface SettingsPageProps {
  user: { name: string; email: string; createdAt: Date };
  onBack: () => void;
}

type Status = { kind: 'success' | 'error'; message: string } | null;

function StatusMessage({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === 'error' ? 'alert' : 'status'} className={styles[status.kind]}>
      {status.message}
    </p>
  );
}

function ProfileForm({ name }: { name: string }) {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = String(new FormData(event.currentTarget).get('name')).trim();
    setPending(true);
    // The session store refreshes itself: the new name shows up in the sidebar.
    const { error } = await authClient.updateUser({ name: nextName });
    setPending(false);
    setStatus(
      error
        ? { kind: 'error', message: authErrorMessage(error) }
        : { kind: 'success', message: 'Nom mis à jour.' },
    );
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Nom
        <input name="name" defaultValue={name} required maxLength={100} autoComplete="name" />
      </label>
      <StatusMessage status={status} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const newPassword = String(form.get('newPassword'));
    if (newPassword !== form.get('confirmPassword')) {
      setStatus({
        kind: 'error',
        message: 'Les deux nouveaux mots de passe ne correspondent pas.',
      });
      return;
    }

    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get('currentPassword')),
      newPassword,
      // A password change signs out every other device.
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) {
      setStatus({ kind: 'error', message: authErrorMessage(error) });
    } else {
      formElement.reset();
      setStatus({
        kind: 'success',
        message: 'Mot de passe modifié. Vos autres appareils ont été déconnectés.',
      });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        Mot de passe actuel
        <input name="currentPassword" type="password" required autoComplete="current-password" />
      </label>
      <label className={styles.field}>
        Nouveau mot de passe
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
        <span className={styles.hint}>8 caractères minimum.</span>
      </label>
      <label className={styles.field}>
        Confirmer le nouveau mot de passe
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
        />
      </label>
      <StatusMessage status={status} />
      <button type="submit" className={styles.button} disabled={pending}>
        {pending ? 'Modification…' : 'Changer le mot de passe'}
      </button>
    </form>
  );
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });

export function SettingsPage({ user, onBack }: SettingsPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <button type="button" className={styles.back} onClick={onBack}>
          ← Retour aux conversations
        </button>
        <h1 className={styles.title}>Paramètres du profil</h1>

        <section className={styles.card} aria-labelledby="account-heading">
          <h2 id="account-heading" className={styles.cardTitle}>
            Compte
          </h2>
          <dl className={styles.details}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Membre depuis</dt>
            <dd>{dateFormat.format(new Date(user.createdAt))}</dd>
          </dl>
          <ProfileForm name={user.name} />
        </section>

        <section className={styles.card} aria-labelledby="password-heading">
          <h2 id="password-heading" className={styles.cardTitle}>
            Mot de passe
          </h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
