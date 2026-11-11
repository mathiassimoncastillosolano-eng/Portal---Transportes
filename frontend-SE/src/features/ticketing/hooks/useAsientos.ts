import { useAsyncResource } from '@/hooks/useAsyncResource'
import { ticketingService } from '@/services'

/** Estado de ocupación de asientos de un viaje (pasajes emitidos + registrados en la sesión). */
export function useAsientos(viajeId: string | undefined) {
  const { data, cargando, error, reintentar } = useAsyncResource(viajeId ?? null, () =>
    ticketingService.obtenerAsientos(viajeId ?? ''),
  )
  return { datos: data ?? null, cargando, error, recargar: reintentar }
}
