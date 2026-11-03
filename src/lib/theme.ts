import { useEffect, useState } from 'react'

/**
 * Controle de tema claro/escuro do CRM.
 * Persiste a preferência em localStorage ("crm-theme") e aplica a classe
 * `dark` no <html> (darkMode: ['class'] no tailwind.config).
 * O script inline no index.html aplica a classe antes do paint para evitar flash.
 */
export type ThemeMode = 'light' | 'dark'

const KEY = 'crm-theme'

const listeners = new Set<(mode: ThemeMode) => void>()

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  try {
    return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function setTheme(mode: ThemeMode) {
  try {
    window.localStorage.setItem(KEY, mode)
  } catch {
    /* storage indisponível: mantém apenas a sessão atual */
  }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }
  listeners.forEach((fn) => fn(mode))
}

export function subscribeTheme(fn: (mode: ThemeMode) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useTheme() {
  const [theme, setMode] = useState<ThemeMode>(() => (getTheme() === 'dark' ? 'dark' : 'light'))
  useEffect(() => subscribeTheme(setMode), [])
  return {
    theme,
    setTheme: (mode: ThemeMode) => setTheme(mode),
    isDark: theme === 'dark',
  }
}
