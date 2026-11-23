import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ScheduleFilter } from '@/features/ticketing/components/ScheduleFilter'
import { TravelFilters } from '@/features/ticketing/components/TravelFilters'
import { TravelList } from '@/features/ticketing/components/TravelList'
import { TripResultsBar } from '@/features/ticketing/components/TripResultsBar'
import { useRutasCiudad } from '@/features/ticketing/hooks/useRutasCiudad'
import { vistaViajesInicial, type FiltrosViajeForm, type VistaViajes } from '@/features/ticketing/types'
import { ordenarViajes } from '@/features/ticketing/utils/viajes'
import { cambioViajeService } from '@/services/api/cambioViajeService'
import type { ViajeHistorial } from '@/types/cliente'
import type { FranjaId, ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import { filtrosIniciales } from '../useCambioViaje'

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
  const { rutas } = useRutasCiudad()
  const errorFecha = !filtros.fecha ? 'Selecciona una fecha.' : filtros.fecha < hoy ? 'Los viajes anteriores a hoy ya salieron.' : undefined
  const listo = !errorFecha && filtros.origen.trim() !== '' && filtros.destino.trim() !== ''
  const clave = listo ? `cambio-${pasaje.idPasaje}|${filtros.origen}|${filtros.destino}|${filtros.fecha}` : null

  // El backend ya quita el viaje original y devuelve cuántos ocultó.
  const { data, cargando, error, reintentar } = useAsyncResource(clave, () =>
    cambioViajeService.buscarViajes(pasaje.idPasaje, filtros),
  )

  const visibles = useMemo(() => {
    const base = (data?.viajes ?? []).filter((v) => vista.franjas.length === 0 || vista.franjas.includes(franjaDe(v.horaSalida)))
    return ordenarViajes(base, vista.orden)
  }, [data, vista])

  const inicial = filtrosIniciales(pasaje, hoy)
  const hayFiltros =
    filtros.origen !== inicial.origen ||
    filtros.destino !== inicial.destino ||
    filtros.fecha !== inicial.fecha ||
    vista.franjas.length > 0 ||
    vista.orden !== vistaViajesInicial.orden

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">¿A qué viaje se cambia?</h3>
        <p className="mt-0.5 text-sm text-text-500">
          Puede mantener la ruta o cambiarla, y elegir otra fecha u horario. Solo se pueden elegir viajes con salida futura y asientos disponibles.
        </p>
      </div>

      <section aria-label="Búsqueda de viajes" className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-card shadow-panel">
        <TravelFilters filtros={filtros} rutas={rutas} hoy={hoy} errorFecha={errorFecha} onFiltros={onFiltros} />
        <div className="border-t border-border px-4 py-2.5">
          <ScheduleFilter franjas={vista.franjas} onChange={(franjas) => onVista({ franjas })} />
        </div>
      </section>

      {listo && (
        <>
          <TripResultsBar total={visibles.length} orden={vista.orden} hayFiltros={hayFiltros} onOrden={(orden) => onVista({ orden })} onReset={onRestablecer} />

          {(data?.ocultos ?? 0) > 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-sunken/60 px-3 py-2 text-xs text-text-500">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              El viaje actual del pasaje no aparece en la lista: el nuevo viaje debe ser distinto.
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
