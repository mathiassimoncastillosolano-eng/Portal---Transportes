import { Search } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

/** Botón del header que abre la paleta de comandos; muestra el atajo. */
export function CommandTrigger() {
  const abrir = useUIStore((s) => s.setCommandPaletteOpen)
  return (
    <button
      type="button"
      onClick={() => abrir(true)}
      aria-label="Abrir paleta de comandos (Ctrl K)"
      className="flex h-10 items-center gap-2.5 rounded-xl border border-border bg-surface-sunken px-3.5 text-sm text-text-500 transition-colors duration-150 hover:border-border-strong hover:bg-surface-hover hover:text-text-700 sm:min-w-[260px] lg:min-w-[340px]"
    >
      <Search className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <span className="hidden flex-1 text-left sm:inline">Buscar acciones, secciones o destinos…</span>
      <kbd className="hidden rounded border border-border-strong px-1.5 py-px text-[10px] font-medium text-text-500 sm:block">Ctrl K</kbd>
    </button>
  )
}
