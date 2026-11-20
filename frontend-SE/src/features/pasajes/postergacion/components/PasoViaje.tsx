import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ScheduleFilter } from '@/features/ticketing/components/ScheduleFilter'
import { TravelFilters } from '@/features/ticketing/components/TravelFilters'
import { TravelList } from '@/features/ticketing/components/TravelList'
import { TripResultsBar } from '@/features/ticketing/components/TripResultsBar'
import { vistaViajesInicial, type FiltrosViajeForm, type VistaViajes } from '@/features/ticketing/types'
import { ordenarViajes } from '@/features/ticketing/utils/viajes'
import type { ViajeHistorial } from '@/types/cliente'
import type { FranjaId, ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import { buscarViajesMock, rutasMock } from '../datosMock'
import { esMismoViaje } from '../reglas'
import { filtrosIniciales } from '../usePostergacion'

interface PasoViajeProps {
  pasaje: ViajeHistorial
  filtros: FiltrosViajeForm
  vista: VistaViajes
  viaje: ViajeConsulta | null
  onFiltros: (parcial: Partial<FiltrosViajeForm>) => void
  onVista: (parcial: Partial<VistaViajes>) => void
  onRestablecer: () => void
  onElegir: (viaje: ViajeConsulta) => void
}

function franjaDe(hora: string): FranjaId {
  const h = Number(hora.slice(0, 2))
  if (h < 6) return 'madrugada'
  if (h < 12) return 'manana'
  if (h < 18) return 'tarde'
  return 'noche'
}

export function PasoViaje({ pasaje, filtros, vista, viaje, onFiltros, onVista, onRestablecer, onElegir }: PasoViajeProps) {
  const hoy = useMemo(() => fechaHoyLima(), [])
  const rutas = useMemo(() => rutasMock(pasaje), [pasaje])
  const errorFecha = !filtros.fecha ? 'Selecciona una fecha.' : filtros.fecha < hoy ? 'Los viajes anteriores a hoy ya salieron.' : undefined
  const clave = errorFecha ? null : `${filtros.origen}|${filtros.destino}|${filtros.fecha}`

  const { data, cargando, error, reintentar } = useAsyncResource(clave, () => buscarViajesMock(pasaje, filtros))

  const visibles = useMemo(() => {
    const base = (data ?? []).filter((v) => vista.franjas.length === 0 || vista.franjas.includes(franjaDe(v.horaSalida)))
    return ordenarViajes(base, vista.orden)
  }, [data, vista])

  const inicial = filtrosIniciales(pasaje, hoy)
  const hayFiltros =
    filtros.origen !== inicial.origen ||
    filtros.destino !== inicial.destino ||
    filtros.fecha !== inicial.fecha ||
    vista.franjas.length > 0 ||
    vista.orden !== vistaViajesInicial.orden

  const originalOculto =
    !errorFecha &&
    esMismoViaje(pasaje, { origen: filtros.origen, destino: filtros.destino, fechaSalida: filtros.fecha, horaSalida: pasaje.horaSalida ?? '' })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">¿A qué viaje se posterga?</h3>
        <p className="mt-0.5 text-sm text-text-500">
          Mantén la ruta o cámbiala, y elige la nueva fecha. Solo se pueden elegir viajes con salida futura y asientos disponibles.
        </p>
      </div>

      <section aria-label="Búsqueda de viajes" className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card shadow-panel">
        <TravelFilters filtros={filtros} rutas={rutas} hoy={hoy} errorFecha={errorFecha} onFiltros={onFiltros} />
        <div className="border-t border-border px-4 py-2.5">
          <ScheduleFilter franjas={vista.franjas} onChange={(franjas) => onVista({ franjas })} />
        </div>
      </section>

      {!errorFecha && (
        <>
          <TripResultsBar total={visibles.length} orden={vista.orden} hayFiltros={hayFiltros} onOrden={(orden) => onVista({ orden })} onReset={onRestablecer} />

          {originalOculto && (
            <p className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-sunken/60 px-3 py-2 text-xs text-text-500">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              El viaje original de las {pasaje.horaSalida?.slice(0, 5)} no aparece en la lista: el nuevo viaje debe ser distinto.
            </p>
          )}

          <div aria-live="polite">
            <TravelList
              viajes={visibles}
              cargando={cargando}
              error={error ? 'No pudimos consultar los viajes. Inténtalo de nuevo.' : null}
              seleccionadoId={viaje?.id}
              hayFiltros={hayFiltros}
              onSelect={onElegir}
              onReintentar={reintentar}
              onReset={onRestablecer}
            />
          </div>
        </>
      )}
    </div>
  )
}
