import { solicitarApi } from './httpClient'

/** Datos del perfil del usuario que inició sesión (tabla usuario). */
export interface PerfilUsuario {
  idUsuario: number
  nombres: string
  apellidos: string
  correo: string
  nroTelefono: string | null
}

export interface CambiosPerfil {
  nombres: string
  apellidos: string
  nroTelefono: string
}

/** GET/PUT /api/usuarios/perfil: el mismo endpoint que usa el Portal, válido para empleados. */
export const perfilService = {
  obtener: () => solicitarApi<PerfilUsuario>('/api/usuarios/perfil'),
  actualizar: (cambios: CambiosPerfil) => solicitarApi<PerfilUsuario>('/api/usuarios/perfil', { method: 'PUT', body: cambios }),
}
