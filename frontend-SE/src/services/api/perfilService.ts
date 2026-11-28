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

export interface CambioContrasena {
  contrasenaActual: string
  contrasenaNueva: string
  confirmacion: string
}

/** GET/PUT /api/usuarios/perfil (el mismo que usa el Portal) y PUT /api/usuarios/contrasena. */
export const perfilService = {
  obtener: () => solicitarApi<PerfilUsuario>('/api/usuarios/perfil'),
  actualizar: (cambios: CambiosPerfil) => solicitarApi<PerfilUsuario>('/api/usuarios/perfil', { method: 'PUT', body: cambios }),
  cambiarContrasena: (datos: CambioContrasena) => solicitarApi<void>('/api/usuarios/contrasena', { method: 'PUT', body: datos }),
}
