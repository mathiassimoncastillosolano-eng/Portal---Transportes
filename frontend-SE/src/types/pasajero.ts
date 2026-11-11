export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE'

export interface Pasajero {
  id: string
  tipoDocumento: TipoDocumento
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string
  email?: string
}

/** Datos que captura el formulario del paso "Pasajero". */
export type DatosPasajero = Omit<Pasajero, 'id'>
