import type { FranjaId } from '@/types/consultaViaje'

export type PasoId = 'viaje' | 'asientos' | 'pasajeros' | 'pago'

export const PASOS: { id: PasoId; label: string }[] = [
  { id: 'viaje', label: 'Viaje' },
  { id: 'asientos', label: 'Asientos' },
  { id: 'pasajeros', label: 'Pasajeros' },
  { id: 'pago', label: 'Pago' },
]

export const MAX_ASIENTOS = 6
export const MINUTOS_BLOQUEO = 3

export type OrigenDni = '' | 'BD' | 'APIPERU' | 'MANUAL'

export interface PasajeroForm {
  dni: string
  nombres: string
  apellidos: string
  fechaNacimiento: string
  celular: string
  origenDni: OrigenDni
  fechaBloqueada: boolean
}

export const pasajeroFormVacio: PasajeroForm = {
  dni: '',
  nombres: '',
  apellidos: '',
  fechaNacimiento: '',
  celular: '',
  origenDni: '',
  fechaBloqueada: false,
}

export interface FiltrosViajeForm {
  origen: string
  destino: string
  fecha: string
}

export type OrdenViajes = 'hora-asc' | 'hora-desc' | 'disp-desc' | 'disp-asc' | 'precio-asc' | 'precio-desc'

export interface VistaViajes {
  franjas: FranjaId[]
  orden: OrdenViajes
}

export const vistaViajesInicial: VistaViajes = {
  franjas: [],
  orden: 'hora-asc',
}

export interface AsientoElegido {
  idAsiento: number
  numero: string
  piso: number
  precio: number
}
