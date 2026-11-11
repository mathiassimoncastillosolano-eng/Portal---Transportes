import type { Pasaje } from '@/types/pasaje'
import type { Viaje } from '@/types/viaje'
import { agenciasMock } from './agencias'
import { metodosPagoMock } from './metodosPago'
import { pasajerosMock } from './pasajeros'
import { pasajesMock } from './pasajes'
import { rutasMock } from './rutas'
import { serviciosMock } from './servicios'
import { viajesSemilla } from './viajes'

export { agenciasMock, metodosPagoMock, pasajerosMock, pasajesMock, rutasMock, serviciosMock }

export interface SemillaTicketing {
  viajes: Viaje[]
  pasajes: Pasaje[]
  /** Asientos ocupados (pasajes emitidos) por viaje. */
  asientosOcupados: Record<string, number[]>
}

/** Ensambla el estado inicial: los contadores de cada viaje salen de sus pasajes emitidos. */
export function crearSemillaTicketing(): SemillaTicketing {
  const asientosOcupados: Record<string, number[]> = {}
  for (const p of pasajesMock) {
    if (p.estado !== 'emitido') continue
    ;(asientosOcupados[p.viajeId] ??= []).push(p.asiento)
  }
  const viajes: Viaje[] = viajesSemilla.map((v) => {
    const ocupados = asientosOcupados[v.id]?.length ?? 0
    return { ...v, asientosOcupados: ocupados, asientosDisponibles: v.capacidad - ocupados }
  })
  return { viajes, pasajes: [...pasajesMock], asientosOcupados }
}
