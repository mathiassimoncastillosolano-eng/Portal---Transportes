import { ChevronDown, Flag, MapPin } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import type { FiltrosViajeForm } from '@/features/ticketing/types'
import type { RutaCiudad } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'

interface FiltrosCambioProps {
  filtros: FiltrosViajeForm
  rutas: RutaCiudad[]
  hoy: string
  onFiltros: (parcial: Partial<FiltrosViajeForm>) => void
}

const etiqueta = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500'
const trigger =
  'h-7 border-transparent bg-transparent px-0 text-sm font-medium hover:border-transparent hover:bg-transparent focus-visible:ring-0 data-[open=true]:ring-0 rounded-md'

function Celda({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        'relative min-w-0 bg-surface-card px-4 py-2.5 transition-colors duration-150',
        'hover:bg-surface-hover focus-within:bg-surface-hover focus-within:shadow-[inset_0_-2px_0_var(--color-accent-line)]',
      )}
    >
      {children}
    </div>
  )
}

/** Origen, destino y fecha del nuevo viaje. Mismos controles que Registrar pasaje. */
export function FiltrosCambio({ filtros, rutas, hoy, onFiltros }: FiltrosCambioProps) {
  const origenes = useMemo(() => [...new Set(rutas.map((r) => r.origen))].sort((a, b) => a.localeCompare(b, 'es')), [rutas])
  const destinos = useMemo(
    () => [...new Set(rutas.filter((r) => r.origen === filtros.origen).map((r) => r.destino))].sort((a, b) => a.localeCompare(b, 'es')),
    [rutas, filtros.origen],
  )
  const opciones = (lista: string[], actual: string) => (lista.length > 0 ? lista : actual ? [actual] : []).map((c) => ({ value: c, label: c }))

  // Al cambiar el origen se conserva el destino si esa ruta existe; si no, se toma el primero disponible.
  function cambiarOrigen(origen: string) {
    const posibles = rutas.filter((r) => r.origen === origen).map((r) => r.destino)
    onFiltros({ origen, destino: posibles.includes(filtros.destino) ? filtros.destino : (posibles[0] ?? '') })
  }

  return (
    <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border shadow-panel sm:grid-cols-3">
      <Celda>
        <Select
          id="cambio-origen"
          label="Origen"
          labelClassName={etiqueta}
          containerClassName="gap-0.5"
          className={trigger}
          icon={<MapPin className="h-4 w-4" />}
          value={filtros.origen}
          onChange={cambiarOrigen}
          options={opciones(origenes, filtros.origen)}
        />
      </Celda>
      <Celda>
        <Select
          id="cambio-destino"
          label="Destino"
          labelClassName={etiqueta}
          containerClassName="gap-0.5"
          className={trigger}
          icon={<Flag className="h-4 w-4" />}
          value={filtros.destino}
          onChange={(destino) => onFiltros({ destino })}
          options={opciones(destinos, filtros.destino)}
        />
      </Celda>
      <Celda>
        <DatePicker
          id="cambio-fecha"
          label="Fecha"
          value={filtros.fecha}
          min={hoy}
          onChange={(fecha) => onFiltros({ fecha })}
          labelClassName={etiqueta}
          containerClassName="gap-0.5"
          className="h-7 border-transparent bg-transparent px-0 pr-6 hover:border-transparent"
        />
        <ChevronDown className="pointer-events-none absolute bottom-4 right-4 h-4 w-4 text-text-400" aria-hidden="true" />
      </Celda>
    </div>
  )
}
