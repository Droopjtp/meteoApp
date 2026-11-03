import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

// Keep in sync with the inline script in index.html (applied before the first paint).
const STORAGE_KEY = 'theme';
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function resolve(preference: ThemePreference): Theme {
  if (preference === 'system') return darkQuery.matches ? 'dark' : 'light';
  return preference;
}

function apply() {
  const theme = resolve(readPreference());
  document.documentElement.dataset.theme = theme;
  // Mobile browser chrome follows the app surface.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#1a1a19' : '#ffffff');
}

function emit() {
  for (const listener of listeners) listener();
}

// "System" follows OS changes live (e.g. automatic dark mode at night).
darkQuery.addEventListener('change', () => {
  apply();
  emit();
});

export function setThemePreference(preference: ThemePreference) {
  if (preference === 'system') localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, preference);
  apply();
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference);
  const theme = useSyncExternalStore(subscribe, () => resolve(readPreference()));
  return { preference, theme };
}
