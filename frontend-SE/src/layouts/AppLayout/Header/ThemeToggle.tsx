import { Moon, Sun } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { resolveTheme, useThemeStore } from '@/stores/themeStore'
import { cn } from '@/utils/cn'

/**
 * Interruptor de tema del Header: un solo botón que alterna entre Claro y
 * Oscuro (sin menú). El ícono refleja el tema *efectivo* actual; si la
 * preferencia guardada era "Sistema", al pulsar se fija explícitamente el
 * tema contrario al que se está viendo.
 */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const esOscuro = resolveTheme(mode) === 'dark'
  const etiqueta = esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'

  return (
    <Tooltip label={etiqueta} side="bottom">
      <button
        type="button"
        onClick={() => setMode(esOscuro ? 'light' : 'dark')}
        aria-label={etiqueta}
        aria-pressed={esOscuro}
        className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] text-text-500 transition-[background-color,color,transform] duration-200 ease-[var(--ease-premium)] hover:bg-surface-sunken hover:text-text-900 active:scale-95"
      >
        <Sun
          className={cn(
            'absolute h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-premium)]',
            esOscuro ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
          aria-hidden="true"
        />
        <Moon
          className={cn(
            'absolute h-[18px] w-[18px] transition-[transform,opacity] duration-300 ease-[var(--ease-premium)]',
            esOscuro ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0',
          )}
          aria-hidden="true"
        />
      </button>
    </Tooltip>
  )
}
