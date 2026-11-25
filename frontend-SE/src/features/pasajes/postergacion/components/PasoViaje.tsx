import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ScheduleFilter } from '@/features/ticketing/components/ScheduleFilter'
import { TripResultsBar } from '@/features/ticketing/components/TripResultsBar'
import { useRutasCiudad } from '@/features/ticketing/hooks/useRutasCiudad'
import { vistaViajesInicial, type FiltrosViajeForm, type VistaViajes } from '@/features/ticketing/types'
import { ordenarViajes } from '@/features/ticketing/utils/viajes'
import { cambioViajeService } from '@/services/api/cambioViajeService'
import type { ViajeHistorial } from '@/types/cliente'
import type { FranjaId, ViajeConsulta } from '@/types/consultaViaje'
import { fechaHoyLima } from '@/utils/fechas'
import { filtrosIniciales } from '../useCambioViaje'
import { EncabezadoPaso } from './EncabezadoPaso'
import { FiltrosCambio } from './FiltrosCambio'
import { ListaViajesCambio } from './ListaViajesCambio'

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
  const listo = filtros.fecha >= hoy && filtros.origen.trim() !== '' && filtros.destino.trim() !== ''
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
      <EncabezadoPaso paso={2} titulo="Elija el nuevo viaje" ayuda="Cualquier ruta, fecha u horario desde hoy." />

      <FiltrosCambio filtros={filtros} rutas={rutas} hoy={hoy} onFiltros={onFiltros} />
      <ScheduleFilter franjas={vista.franjas} onChange={(franjas) => onVista({ franjas })} />

      {listo && (
        <>
          <TripResultsBar total={visibles.length} orden={vista.orden} hayFiltros={hayFiltros} onOrden={(orden) => onVista({ orden })} onReset={onRestablecer} />

          {(data?.ocultos ?? 0) > 0 && (
            <p className="flex items-center gap-2 rounded-lg bg-route-50 px-3 py-2 text-xs text-route-600">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              El viaje actual del pasaje no se muestra.
            </p>
          )}

          <div aria-live="polite">
            <ListaViajesCambio
              viajes={visibles}
              cargando={cargando}
              error={error}
              seleccionadoId={viaje?.id}
              onElegir={onElegir}
              onReintentar={reintentar}
            />
          </div>
        </>
      )}
    </div>
  )
}
