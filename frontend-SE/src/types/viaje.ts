import type { ServicioId } from './servicio'

export type EstadoViaje = 'programado' | 'finalizado' | 'cancelado'

export interface Viaje {
  id: string
  /** RL-VJ-000123 */
  codigo: string
  rutaId: string
  origen: string
  destino: string
  /** YYYY-MM-DD */
  fecha: string
  /** HH:mm */
  hora: string
  /** Agencia desde cuya terminal sale el viaje. */
  agenciaId: string
  servicioId: ServicioId
  capacidad: number
  asientosOcupados: number
  asientosDisponibles: number
  estado: EstadoViaje
  /** Tarifa por asiento en soles (servicio × ruta). */
  tarifa: number
}

export interface FiltrosViajes {
  origen?: string
  destino?: string
  /** YYYY-MM-DD */
  fecha: string
  servicioId?: ServicioId
}

/** Motivo por el que un viaje listado no se puede vender. */
export type MotivoNoVendible = 'cancelado' | 'agotado' | 'salido'

export interface ViajeListado extends Viaje {
  vendible: boolean
  motivoNoVendible?: MotivoNoVendible
}

export interface Ruta {
  id: string
  origen: string
  destino: string
  /** Multiplicador de la tarifa base del servicio. */
  factorTarifa: number
  duracionMin: number
  salidas: { hora: string; servicioId: ServicioId }[]
}
