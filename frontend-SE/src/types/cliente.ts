export type ActividadCliente = 'todos' | 'proximos' | 'realizados' | 'sin-viajes'

export type OrdenCliente = 'nombre' | 'documento' | 'viajes' | 'ultimo' | 'proximo'

export type FaseViaje = 'PROXIMO' | 'REALIZADO' | 'NO_REALIZADO' | 'SIN_INFORMACION'

export type EstadoPasaje = 'CONFIRMADA' | 'REEMBOLSADA' | 'SIN_CONFIRMAR'

export interface ConsultaClientes {
  q: string
  tipoDocumento: string
  actividad: ActividadCliente
  orden: OrdenCliente
  direccion: 'asc' | 'desc'
  pagina: number
  tamano: number
}

export interface ClienteResumen {
  idPasajero: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string | null
  viajes: number
  ultimoViaje: string | null
  proximoViaje: string | null
}

export interface PaginaClientes {
  contenido: ClienteResumen[]
  total: number
  pagina: number
  tamano: number
}

export interface IndicadoresClientes {
  totalPasajeros: number
  conViajesProximos: number
  conViajesRealizados: number
  pasajesConfirmados: number
  tiposDocumento: string[]
}

export interface ViajeHistorial {
  idPasaje: number
  numeroBoleto: string
  idVenta: number
  codigoCompra: string
  comprobante: string | null
  origen: string
  destino: string
  fechaSalida: string | null
  horaSalida: string | null
  horaLlegada: string | null
  fechaLlegada: string | null
  asiento: string | null
  piso: number | null
  bus: string | null
  precio: number | null
  moneda: string
  estadoPasaje: EstadoPasaje
  fase: FaseViaje
  documentoDisponible: boolean
  /** true si el pasaje tuvo al menos un cambio de viaje. */
  cambiado?: boolean
  pasajero: string
  documento: string
}

export interface ClienteDetalle {
  idPasajero: number
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string | null
  fechaNacimiento: string | null
  fechaRegistro: string | null
  viajes: number
  primerViaje: string | null
  ultimoViaje: string | null
  proximoViaje: string | null
  historial: ViajeHistorial[]
}
