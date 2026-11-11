import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  BookOpenCheck,
  CornerDownLeft,
  LayoutDashboard,
  Search,
  SearchX,
  Ticket,
  UserRoundSearch,
  Route,
} from 'lucide-react'
import { hasPermission, useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'

interface Comando {
  id: string
  titulo: string
  descripcion: string
  icono: ReactNode
  /** Sinónimos para el buscador (sin tildes). */
  claves: string
  permiso?: string
  /** Aún no existe el módulo: se muestra deshabilitado con "Pronto". */
  pronto?: boolean
  ejecutar?: () => void
}

function normalizar(t: string) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * Command palette global (Ctrl/⌘ + K). Lista acciones del sistema y permite
 * filtrarlas escribiendo; ↑ ↓ navegan, Enter ejecuta, Esc cierra. Las acciones
 * cuyo módulo aún no existe aparecen deshabilitadas con la etiqueta "Pronto":
 * la paleta nunca promete algo que el sistema no hace.
 */
export function CommandPalette() {
  const abierto = useUIStore((s) => s.commandPaletteOpen)
  const setAbierto = useUIStore((s) => s.setCommandPaletteOpen)

  // Atajo global: Ctrl/⌘ + K abre y cierra, incluso escribiendo en un campo.
  useEffect(() => {
    function alTeclear(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setAbierto(!useUIStore.getState().commandPaletteOpen)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [setAbierto])

  return abierto ? <PaletaAbierta /> : null
}

function PaletaAbierta() {
  const setAbierto = useUIStore((s) => s.setCommandPaletteOpen)
  const setActiveSection = useUIStore((s) => s.setActiveSection)
  const user = useAuthStore((s) => s.user)

  const [consulta, setConsulta] = useState('')
  const [activo, setActivo] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)

  const comandos: Comando[] = useMemo(() => {
    const ir = (id: string) => () => setActiveSection(id)
    const icono = 'h-4 w-4'
    return [
      { id: 'registrar', titulo: 'Registrar pasaje', descripcion: 'Iniciar una venta de pasaje', icono: <Ticket className={icono} />, claves: 'venta vender nuevo boleto', permiso: 'pasajes:registrar', ejecutar: ir('registrar-pasaje') },
      { id: 'disponibilidad', titulo: 'Consultar disponibilidad', descripcion: 'Buscar viajes y asientos libres', icono: <Route className={icono} />, claves: 'viajes horarios asientos buscar', permiso: 'pasajes:registrar', ejecutar: () => { setActiveSection('registrar-pasaje'); window.setTimeout(() => document.getElementById('filtro-origen')?.focus(), 60) } },
      { id: 'ventas', titulo: 'Ver ventas', descripcion: 'Ingresos y ocupación en el Dashboard', icono: <LayoutDashboard className={icono} />, claves: 'ingresos dashboard kpi', permiso: 'dashboard:ver', ejecutar: ir('dashboard') },
      { id: 'pasajero', titulo: 'Buscar pasajero', descripcion: 'Por documento o nombre', icono: <UserRoundSearch className={icono} />, claves: 'cliente dni documento', pronto: true },
      { id: 'viaje', titulo: 'Consultar viaje', descripcion: 'Estado y manifiesto de un viaje', icono: <BookOpenCheck className={icono} />, claves: 'manifiesto codigo', pronto: true },
    ].filter((c) => hasPermission(user, c.permiso))
  }, [setActiveSection, user])

  const filtrados = useMemo(() => {
    const q = normalizar(consulta.trim())
    if (!q) return comandos
    return comandos.filter((c) => normalizar(`${c.titulo} ${c.descripcion} ${c.claves}`).includes(q))
  }, [comandos, consulta])

  // Al montar (abrir): enfocar. Al desmontar (cerrar): devolver el foco al elemento previo.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => previo?.focus?.()
  }, [])

  useEffect(() => {
    listaRef.current?.querySelector<HTMLElement>(`[data-index="${activo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activo])

  function ejecutar(c: Comando | undefined) {
    if (!c || c.pronto) return
    setAbierto(false)
    c.ejecutar?.()
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setAbierto(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, Math.max(filtrados.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      ejecutar(filtrados[activo])
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-start justify-center px-4 pt-[14vh]" onKeyDown={alTeclear}>
      <div className="animate-fade-in absolute inset-0 bg-scrim" onClick={() => setAbierto(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        className="animate-scale-in relative w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-surface-card shadow-flyout"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
          <input
            ref={inputRef}
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value)
              setActivo(0)
            }}
            placeholder="¿Qué deseas hacer?"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-activedescendant={filtrados[activo] ? `cmd-${filtrados[activo].id}` : undefined}
            className="h-14 w-full bg-transparent text-[15px] text-text-900 outline-none placeholder:text-text-400"
          />
          <kbd className="hidden shrink-0 rounded-md border border-border-strong px-1.5 py-0.5 text-[10px] font-medium text-text-500 sm:block">Esc</kbd>
        </div>

        {filtrados.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-2 px-6 py-10 text-sm text-text-500">
            <SearchX className="h-5 w-5 text-text-400" aria-hidden="true" />
            Sin resultados para “{consulta}”
          </div>
        ) : (
          <ul id="command-list" ref={listaRef} role="listbox" className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
            <li role="presentation" className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-400">
              Acciones
            </li>
            {filtrados.map((c, i) => (
              <li
                key={c.id}
                id={`cmd-${c.id}`}
                role="option"
                aria-selected={i === activo}
                aria-disabled={c.pronto || undefined}
                data-index={i}
                onMouseMove={() => setActivo(i)}
                onClick={() => ejecutar(c)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors duration-100',
                  i === activo ? 'bg-surface-raised' : '',
                  c.pronto && 'cursor-not-allowed opacity-55',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    i === activo && !c.pronto ? 'border-accent-line/40 bg-accent-line/10 text-accent-text' : 'border-border bg-surface-sunken text-text-500',
                  )}
                  aria-hidden="true"
                >
                  {c.icono}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-900">{c.titulo}</span>
                  <span className="block truncate text-xs text-text-500">{c.descripcion}</span>
                </span>
                {c.pronto ? (
                  <span className="rounded-full border border-border px-2 py-px text-[10px] font-medium uppercase tracking-wide text-text-500">Pronto</span>
                ) : (
                  i === activo && <CornerDownLeft className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-4 border-t border-border bg-surface-sunken px-4 py-2 text-[11px] text-text-500">
          <span className="flex items-center gap-1.5"><kbd className="rounded border border-border-strong px-1">↑</kbd><kbd className="rounded border border-border-strong px-1">↓</kbd> navegar</span>
          <span className="flex items-center gap-1.5"><kbd className="rounded border border-border-strong px-1">Enter</kbd> ejecutar</span>
          <span className="ml-auto hidden sm:block">/ para buscar viajes</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
