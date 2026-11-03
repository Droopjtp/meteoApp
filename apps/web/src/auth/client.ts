import { createAuthClient } from 'better-auth/react';

/** Same origin as the app (nginx / Vite proxy): the session cookie just works, no CORS. */
export const authClient = createAuthClient({ basePath: '/api/auth' });

/** An API call answered 401 (expired or revoked session): re-read the session, which shows the sign-in screen. */
export function refreshSession() {
  authClient.$store.notify('$sessionSignal');
}

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Email ou mot de passe incorrect.',
  USER_ALREADY_EXISTS: 'Un compte existe déjà avec cet email.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Un compte existe déjà avec cet email.',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 8 caractères.',
  PASSWORD_TOO_LONG: 'Le mot de passe est trop long.',
  INVALID_EMAIL: 'Adresse email invalide.',
  INVALID_PASSWORD: 'Mot de passe actuel incorrect.',
};

export function authErrorMessage(error: {
  code?: string;
  message?: string;
  status?: number;
}): string {
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code] as string;
  if (error.status === 429) return 'Trop de tentatives. Réessayez dans un instant.';
  return error.message ?? 'Une erreur est survenue.';
}
