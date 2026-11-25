import type { ViajeConsulta } from './consultaViaje'

// Respuestas del backend de cambio de viajes (/api/pasajes/{idPasaje}/cambio-viaje/...).

export type EscenarioTarifa = 'IGUAL' | 'SUPERIOR' | 'INFERIOR'
export type MetodoPagoAgencia = 'EFECTIVO' | 'YAPE' | 'TARJETA'
export type ResultadoPos = 'APROBADO' | 'RECHAZADO'

export interface ElegibilidadCambio {
  elegible: boolean
  codigo: string | null
  motivo: string | null
}

export interface ViajesParaCambio {
  viajes: ViajeConsulta[]
  ocultos: number
}

export interface CotizacionCambio {
  escenario: EscenarioTarifa
  importePagado: number
  tarifaNueva: number
  montoAPagar: number
  montoNoDevuelto: number
  requierePago: boolean
  requiereAceptacion: boolean
  mensajeParaAgente: string
}

export interface ConfirmacionCambio {
  aceptada: boolean
  idPostergacion: number
  idPasaje: number
  idVenta: number
  idViajeAnterior: number
  asientoAnterior: string | null
  idViajeNuevo: number
  origen: string
  destino: string
  fechaSalida: string
  horaSalida: string
  asientoNuevo: string
  importeAdicional: number
  referenciaPago: string | null
  fecha: string
}

export interface SolicitudConfirmarCambio {
  idViajeNuevo: number
  idAsiento: number
  tokenSesion: string
  aceptaSinDevolucion: boolean
}

export interface SolicitudPagoCambio {
  idViajeNuevo: number
  idAsiento: number
  tokenSesion: string
  metodo: MetodoPagoAgencia
  resultado: ResultadoPos | null
  numeroOperacion: string | null
  claveIdempotencia: string
}

export interface ResultadoPagoCambio {
  cambioAplicado: boolean
  resultado: ResultadoPos
  metodo: string
  monto: number
  mensajeParaAgente: string
  confirmacion: ConfirmacionCambio | null
}

export interface IntentoPagoCambio {
  numero: number
  metodo: string
  monto: number
  resultado: ResultadoPos
  numeroOperacion: string | null
  fecha: string
}
