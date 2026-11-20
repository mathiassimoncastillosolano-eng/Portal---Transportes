import type { EstadoPasaje } from './pasaje'

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
  /** Id del tipo de servicio (tipo de bus) o `'todos'`. */
  servicioId: string
  destino: string
}

/** Consulta que recibe el servicio: el rango ya está resuelto. */
export interface ConsultaDashboard {
  rango: RangoFechas
  agenciaId?: string
  servicioId?: string
  destino?: string
}

/** Hecho de venta agregable. No identifica al pasajero: el Dashboard no consulta transacciones. */
export interface VentaFact {
  viajeId: string
  /** Fecha de emisión YYYY-MM-DD */
  fecha: string
  ingreso: number
  estado: EstadoPasaje
  /** Agencia de salida del viaje. */
  agenciaId: string
  /** Tipo de servicio (tipo de bus). */
  servicioId: string
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

/** Una opción de un filtro del Dashboard (agencia o servicio). */
export interface OpcionFiltro {
  id: string
  nombre: string
  /** Texto secundario opcional, ej. la ciudad de la agencia. */
  detalle?: string | null
}

/** Opciones de los filtros y la fecha "hoy" desde la que se calculan los períodos. */
export interface OpcionesDashboard {
  agencias: OpcionFiltro[]
  servicios: OpcionFiltro[]
  destinos: string[]
  /** YYYY-MM-DD */
  hoy: string
}
