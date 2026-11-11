import { useCatalogo } from '@/hooks/useCatalogo'
import { useUIStore } from '@/stores/uiStore'
import type { Viaje } from '@/types/viaje'

/**
 * Datos derivados del catálogo para presentar un viaje: servicio, duración de
 * la ruta, terminales de salida/llegada y sede de venta activa. Los terminales
 * de destino solo se muestran cuando la ciudad tiene una única terminal.
 */
export function useViajeInfo(viaje: Viaje | null | undefined) {
  const { catalogo } = useCatalogo()
  const branchId = useUIStore((s) => s.currentBranchId)

  const servicio = catalogo?.servicios.find((s) => s.id === viaje?.servicioId)
  const duracionMin = catalogo?.rutas.find((r) => r.id === viaje?.rutaId)?.duracionMin
  const terminalOrigen = catalogo?.agencias.find((a) => a.id === viaje?.agenciaId)?.name
  const enDestino = catalogo?.agencias.filter((a) => a.city === viaje?.destino) ?? []
  const terminalDestino = enDestino.length === 1 ? enDestino[0].name : undefined
  const sede = catalogo?.agencias.find((a) => a.id === branchId) ?? catalogo?.agencias[0]

  return { catalogo, servicio, duracionMin, terminalOrigen, terminalDestino, sede }
}
