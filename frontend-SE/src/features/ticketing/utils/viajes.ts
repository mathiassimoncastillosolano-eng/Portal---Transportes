import type { ViajeListado } from '@/types/viaje'
import type { FranjaId, OrdenViajes } from '../types'

/**
 * Reglas de presentación de viajes (franjas horarias, nivel de disponibilidad,
 * duración/llegada y orden). Son funciones puras sobre `ViajeListado`: no
 * consultan ni modifican nada, así se pueden probar y reutilizar sin la UI.
 */

// ---------------------------------------------------------------- horario

export interface FranjaDef {
  id: FranjaId
  label: string
  /** Rango legible, ej. "06:00 – 11:59". */
  rango: string
  /** Minutos desde 00:00, inicio inclusivo / fin exclusivo. */
  desde: number
  hasta: number
}

export const FRANJAS: FranjaDef[] = [
  { id: 'madrugada', label: 'Madrugada', rango: '00:00 – 05:59', desde: 0, hasta: 360 },
  { id: 'manana', label: 'Mañana', rango: '06:00 – 11:59', desde: 360, hasta: 720 },
  { id: 'tarde', label: 'Tarde', rango: '12:00 – 17:59', desde: 720, hasta: 1080 },
  { id: 'noche', label: 'Noche', rango: '18:00 – 23:59', desde: 1080, hasta: 1440 },
]

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function deMinutos(total: number): string {
  const t = ((total % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/** ¿La hora cae en alguna de las franjas elegidas? Sin franjas elegidas, todas pasan. */
export function coincideConHorario(hora: string, franjas: FranjaId[]): boolean {
  if (franjas.length === 0) return true
  const min = aMinutos(hora)
  return FRANJAS.some((f) => franjas.includes(f.id) && min >= f.desde && min < f.hasta)
}

// ---------------------------------------------------------- disponibilidad

export type NivelDisponibilidad = 'alta' | 'pocos' | 'ultimos' | 'agotado'

/** Umbrales de asientos libres: ≤3 últimos, ≤8 pocos, más = alta. */
export const UMBRAL_ULTIMOS = 3
export const UMBRAL_POCOS = 8

export function nivelDisponibilidad(libres: number): NivelDisponibilidad {
  if (libres <= 0) return 'agotado'
  if (libres <= UMBRAL_ULTIMOS) return 'ultimos'
  if (libres <= UMBRAL_POCOS) return 'pocos'
  return 'alta'
}

// ------------------------------------------------------ duración y llegada

export function formatearDuracion(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`
}

/** Hora estimada de llegada (HH:mm) y cuántos días después llega (0 = el mismo día). */
export function calcularLlegada(hora: string, duracionMin: number): { hora: string; dias: number } {
  const total = aMinutos(hora) + duracionMin
  return { hora: deMinutos(total), dias: Math.floor(total / 1440) }
}

// ------------------------------------------------------------------ orden

export function ordenarViajes(viajes: ViajeListado[], orden: OrdenViajes): ViajeListado[] {
  const porHora = (a: ViajeListado, b: ViajeListado) => a.hora.localeCompare(b.hora) || a.origen.localeCompare(b.origen, 'es')
  const copia = [...viajes]
  switch (orden) {
    case 'hora-asc':
      return copia.sort(porHora)
    case 'hora-desc':
      return copia.sort((a, b) => porHora(b, a))
    case 'disp-desc':
      return copia.sort((a, b) => b.asientosDisponibles - a.asientosDisponibles || porHora(a, b))
    case 'disp-asc':
      return copia.sort((a, b) => a.asientosDisponibles - b.asientosDisponibles || porHora(a, b))
    case 'precio-asc':
      return copia.sort((a, b) => a.tarifa - b.tarifa || porHora(a, b))
    case 'precio-desc':
      return copia.sort((a, b) => b.tarifa - a.tarifa || porHora(a, b))
  }
}

// ------------------------------------------------- criterios de orden (UI)

export type CriterioOrden = 'hora' | 'disponibilidad' | 'precio'
export type DireccionOrden = 'asc' | 'desc'

/** Los tres criterios del selector. La dirección se comunica solo con una flecha, nunca con texto. */
export const CRITERIOS_ORDEN: { id: CriterioOrden; label: string }[] = [
  { id: 'hora', label: 'Hora de salida' },
  { id: 'disponibilidad', label: 'Disponibilidad' },
  { id: 'precio', label: 'Precio' },
]

const PREFIJO_ORDEN: Record<CriterioOrden, string> = { hora: 'hora', disponibilidad: 'disp', precio: 'precio' }

/** Descompone un `OrdenViajes` en criterio + dirección. */
export function descomponerOrden(orden: OrdenViajes): { criterio: CriterioOrden; direccion: DireccionOrden } {
  const [prefijo, direccion] = orden.split('-') as [string, DireccionOrden]
  const criterio = CRITERIOS_ORDEN.find((c) => PREFIJO_ORDEN[c.id] === prefijo)?.id ?? 'hora'
  return { criterio, direccion }
}

/**
 * Compone el `OrdenViajes` que entiende `ordenarViajes`:
 *  - hora: asc = sale primero el más temprano · desc = el más tarde
 *  - disponibilidad: asc = menos asientos libres primero · desc = más asientos libres
 *  - precio: asc = más barato primero · desc = más caro
 */
export function componerOrden(criterio: CriterioOrden, direccion: DireccionOrden): OrdenViajes {
  return `${PREFIJO_ORDEN[criterio]}-${direccion}` as OrdenViajes
}
