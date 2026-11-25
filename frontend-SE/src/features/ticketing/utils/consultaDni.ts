import { solicitarApi } from '@/services/api/httpClient'

export interface RespuestaDni {
  dni: string
  existente: boolean
  origen: 'BD' | 'APIPERU' | 'MANUAL'
  nombres: string | null
  apellidos: string | null
  fechaNacimiento: string | null
  nroTelefono: string | null
}

export function consultarDni(dni: string) {
  return solicitarApi<RespuestaDni>(`/api/pasajeros/dni/${encodeURIComponent(dni)}`)
}
