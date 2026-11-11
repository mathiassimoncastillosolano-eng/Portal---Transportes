import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  /** Preferencia elegida por el usuario. 'system' sigue al sistema operativo. */
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

/**
 * Persiste bajo la key `rutalibre-theme` en localStorage. El script inline
 * en `index.html` lee esta misma key (con el mismo formato que usa el
 * middleware `persist` de Zustand) para aplicar la clase `dark` en `<html>`
 * antes del primer paint y evitar el flash de tema claro → oscuro.
 *
 * Si cambias el nombre de la key o el shape del estado persistido, actualiza
 * también el script inline en `index.html`.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => set({ mode }),
    }),
    { name: 'rutalibre-theme' },
  ),
)

/** Resuelve 'system' contra la preferencia real del sistema operativo. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

/** Aplica (o quita) la clase `dark` en <html>, fuente de verdad para todos los tokens de color. */
export function applyResolvedTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}
