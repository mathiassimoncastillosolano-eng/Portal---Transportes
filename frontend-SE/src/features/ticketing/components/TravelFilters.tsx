import { CalendarDays, ChevronLeft, ChevronRight, Flag, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { Select } from '@/components/ui/Select'
import { FECHA_REFERENCIA } from '@/config/referencia'
import type { Catalogo } from '@/hooks/useCatalogo'
import { formatearFechaLarga } from '@/utils/formato'
import { sumarDias } from '@/utils/fechas'
import { cn } from '@/utils/cn'
import type { FiltrosViajeForm } from '../types'

interface TravelFiltersProps {
  filtros: FiltrosViajeForm
  catalogo: Catalogo | null
  errorFecha?: string
  onFiltros: (parcial: Partial<FiltrosViajeForm>) => void
}

const etiquetaCelda = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500'
/** Sobrescribe el aspecto de "campo con borde" del Select para que se lea como celda de la barra. */
const triggerCelda =
  'h-7 border-transparent bg-transparent px-0 text-sm font-medium hover:border-transparent hover:bg-transparent focus-visible:ring-0 data-[open=true]:ring-0 rounded-md'

/** Celda de la barra: sin borde propio (las separa la rejilla), con hover/foco suaves. */
function Celda({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'min-w-0 bg-surface-card px-4 py-2.5',
        'transition-colors duration-150 ease-[var(--ease-premium)]',
        'hover:bg-surface-hover focus-within:bg-surface-hover focus-within:shadow-[inset_0_-2px_0_var(--color-accent-line)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Campos de búsqueda: Origen · Destino · Fecha. Una sola rejilla
 * con divisores finos (no una caja por campo). Cambiar cualquiera actualiza
 * la lista de inmediato. Origen y destino son siempre ciudades concretas; si
 * el usuario elige como origen la ciudad que ya es destino (o al revés), se
 * intercambian para no quedar en una ruta imposible.
 */
export function TravelFilters({ filtros, catalogo, errorFecha, onFiltros }: TravelFiltersProps) {
  const ciudades = catalogo?.ciudades ?? []
  const puedeRetroceder = !!filtros.fecha && filtros.fecha > FECHA_REFERENCIA

  // Mientras carga el catálogo se muestra el valor vigente, no un campo vacío.
  const opcionesCiudad = (actual: string) =>
    (ciudades.length > 0 ? ciudades : [actual]).map((c) => ({ value: c, label: c }))

  function cambiarOrigen(origen: string) {
    onFiltros(origen === filtros.destino ? { origen, destino: filtros.origen } : { origen })
  }
  function cambiarDestino(destino: string) {
    onFiltros(destino === filtros.origen ? { destino, origen: filtros.destino } : { destino })
  }

  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-px bg-border @md:grid-cols-2 @xl:grid-cols-3">
        <Celda>
          <Select
            id="filtro-origen"
            label="Origen"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<MapPin className="h-4 w-4" />}
            value={filtros.origen}
            onChange={cambiarOrigen}
            options={opcionesCiudad(filtros.origen)}
          />
        </Celda>

        <Celda>
          <Select
            id="filtro-destino"
            label="Destino"
            labelClassName={etiquetaCelda}
            containerClassName="gap-0.5"
            className={triggerCelda}
            icon={<Flag className="h-4 w-4" />}
            value={filtros.destino}
            onChange={cambiarDestino}
            options={opcionesCiudad(filtros.destino)}
          />
        </Celda>

        <Celda className={cn('@md:col-span-2 @xl:col-span-1', errorFecha && 'shadow-[inset_0_-2px_0_var(--color-danger-500)]')}>
          <span id="filtro-fecha-label" className={etiquetaCelda}>
            Fecha
          </span>
          <div className="mt-0.5 flex h-7 items-center gap-1">
            <div className="relative flex min-w-0 flex-1 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
              <span className="truncate text-sm font-medium capitalize text-text-900">
                {filtros.fecha ? formatearFechaLarga(filtros.fecha) : 'Elegir fecha'}
              </span>
              {/* Input nativo transparente encima: conserva teclado, lector de pantalla y selector de fecha. */}
              <input
                id="filtro-fecha"
                type="date"
                aria-labelledby="filtro-fecha-label"
                aria-invalid={!!errorFecha}
                min={FECHA_REFERENCIA}
                value={filtros.fecha}
                onChange={(e) => onFiltros({ fecha: e.target.value })}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <button
              type="button"
              onClick={() => onFiltros({ fecha: sumarDias(filtros.fecha, -1) })}
              disabled={!puedeRetroceder}
              aria-label="Día anterior"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-500 transition-colors duration-150 hover:bg-border/60 hover:text-text-900 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onFiltros({ fecha: sumarDias(filtros.fecha || FECHA_REFERENCIA, 1) })}
              aria-label="Día siguiente"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-500 transition-colors duration-150 hover:bg-border/60 hover:text-text-900"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </Celda>

      </div>
      {errorFecha && (
        <p role="alert" className="border-t border-border bg-surface-card px-4 py-2 text-xs font-medium text-danger-500">
          {errorFecha}
        </p>
      )}
    </div>
  )
}
