import { useLayoutEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'habitex-theme';

const applyThemeClass = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
};

const getPreferredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => getPreferredTheme());

  useLayoutEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (value: ThemeMode) => setThemeState(value);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme };
}
