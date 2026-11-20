import type { EstadoPasaje, ViajeHistorial } from './cliente'

export type FasePasaje = '' | 'PROXIMO' | 'REALIZADO' | 'OTROS'

export type OrdenPasaje = 'salida' | 'precio' | 'pasajero'

export interface ClienteFiltro {
  id: number
  nombre: string
}

export interface ConsultaPasajes {
  q: string
  cliente: ClienteFiltro | null
  origen: string
  destino: string
  desde: string
  hasta: string
  estado: '' | EstadoPasaje
  fase: FasePasaje
  orden: OrdenPasaje
  direccion: 'asc' | 'desc'
  pagina: number
  tamano: number
}

export interface Pasaje extends ViajeHistorial {
  idPasajero: number
}

export interface ResumenPasajes {
  confirmados: number
  proximos: number
  ingresos: number
}

export interface PaginaPasajes {
  contenido: Pasaje[]
  total: number
  pagina: number
  tamano: number
  resumen: ResumenPasajes
}

export interface OpcionesFiltroPasajes {
  origenes: string[]
  destinos: string[]
}
