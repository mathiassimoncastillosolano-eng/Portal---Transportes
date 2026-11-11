import type { EstadoPasaje } from './pasaje'
import type { ServicioId } from './servicio'

export type PeriodoPreset = '7d' | '30d' | '90d' | 'custom'

export interface RangoFechas {
  /** YYYY-MM-DD inclusive */
  desde: string
  /** YYYY-MM-DD inclusive */
  hasta: string
}

/** Filtros tal como los ve la UI. `'todas'` / `'todos'` = sin filtrar. */
export interface FiltrosDashboard {
  periodo: PeriodoPreset
  /** Solo se usa con `periodo === 'custom'`. */
  rango: RangoFechas
  agenciaId: string
  servicioId: ServicioId | 'todos'
  destino: string
}

/** Consulta que recibe el servicio: el rango ya está resuelto. */
export interface ConsultaDashboard {
  rango: RangoFechas
  agenciaId?: string
  servicioId?: ServicioId
  destino?: string
}

/** Hecho de venta agregable. No identifica al pasajero: el Dashboard no consulta transacciones. */
export interface VentaFact {
  viajeId: string
  /** Fecha de emisión YYYY-MM-DD */
  fecha: string
  ingreso: number
  estado: EstadoPasaje
  agenciaId: string
  servicioId: ServicioId
  origen: string
  destino: string
}

export interface ViajeOcupacionFact {
  viajeId: string
  capacidad: number
  vendidos: number
}

export interface PeriodoDatos {
  rango: RangoFechas
  ventas: VentaFact[]
  viajes: ViajeOcupacionFact[]
}

export interface DatosDashboard {
  actual: PeriodoDatos
  anterior: PeriodoDatos
}
