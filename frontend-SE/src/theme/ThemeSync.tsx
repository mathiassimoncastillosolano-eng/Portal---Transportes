import { useEffect } from 'react'
import { applyResolvedTheme, resolveTheme, useThemeStore } from '@/stores/themeStore'

/**
 * No renderiza nada visible. Se encarga de que la clase `dark` en <html>
 * siempre refleje el modo elegido:
 * - Aplica el tema resuelto cada vez que cambia `mode`.
 * - Si `mode === 'system'`, escucha cambios en vivo de la preferencia del
 *   sistema operativo (ej. el usuario activa el modo oscuro de macOS/Windows
 *   mientras la app sigue abierta) y re-aplica sin recargar.
 *
 * El flash inicial ya se evita con el script inline de `index.html`; este
 * efecto solo mantiene todo sincronizado después de esa primera pintura.
 */
export function ThemeSync() {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    applyResolvedTheme(resolveTheme(mode))

    if (mode !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyResolvedTheme(resolveTheme('system'))
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [mode])

  return null
}
