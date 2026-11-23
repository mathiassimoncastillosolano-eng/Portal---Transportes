import { Moon, Sun } from 'lucide-react'
import { resolveTheme, useThemeStore } from '@/stores/themeStore'

export function TemaComercial() {
  const mode = useThemeStore((estado) => estado.mode)
  const setMode = useThemeStore((estado) => estado.setMode)
  const oscuro = resolveTheme(mode) === 'dark'
  const etiqueta = oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <button
      type="button"
      onClick={() => setMode(oscuro ? 'light' : 'dark')}
      aria-label={etiqueta}
      title={etiqueta}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-card text-text-700 transition-colors hover:bg-surface-sunken hover:text-text-900"
    >
      {oscuro ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
    </button>
  )
}
