import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ticketingService } from '@/services'
import type { FiltrosViajeForm } from '../types'

/** Busca viajes según los filtros del paso 1, con estados de carga/error y reintento. */
export function useTripSearch(filtros: FiltrosViajeForm) {
  const { origen, destino, fecha, servicioId } = filtros
  const clave = fecha ? `${origen}|${destino}|${fecha}|${servicioId}` : null

  const { data, cargando, error, reintentar } = useAsyncResource(clave, () =>
    ticketingService.buscarViajes({
      fecha,
      origen: origen || undefined,
      destino: destino || undefined,
      servicioId: servicioId || undefined,
    }),
  )

  return { viajes: data ?? [], cargando, error, reintentar }
}
