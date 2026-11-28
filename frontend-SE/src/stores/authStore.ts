import { create } from 'zustand'
import { authService } from '@/services'
import { configurarAlSesionVencida, configurarProveedorToken, esApiError } from '@/services/api/httpClient'
import type { AuthSession, AuthUser, Permission, RespuestaLogin, RolEmpresa, UserRole } from '@/types/auth'
import { useDashboardFiltrosStore } from './dashboardFiltrosStore'

/**
 * Store de sesión del Sistema Empresarial, conectado al backend.
 *
 * `status` representa el ciclo de vida de la sesión:
 *   'loading'         -> revisando si ya hay una sesión guardada (al abrir la app)
 *   'unauthenticated' -> no hay sesión: se muestra el Login
 *   'authenticated'   -> hay sesión: se muestra el Shell (Sidebar/Header/SE)
 *
 * El token JWT y el usuario se guardan en `sessionStorage`: sobreviven a un
 * refresh de la pestaña, pero se borran al cerrar el navegador.
 */

const SESSION_KEY = 'rutalibre-se-session'
/** `agenciaId` del gerente: no está atado a una sede. */
export const TODAS_LAS_SEDES = 'todas'

/**
 * Patrón Estrategia (tabla de perfiles): cada rol de la tabla empleado
 * define qué ve la persona en el SE. Para agregar un rol nuevo basta otra fila.
 */
const PERFILES_POR_ROL: Record<RolEmpresa, { role: UserRole; permissions: Permission[] }> = {
  AGENCIA: { role: 'staff', permissions: ['pasajes:registrar'] },
  GERENTE: { role: 'manager', permissions: ['dashboard:ver'] },
}

/** Lo que se guarda en sessionStorage. */
interface SesionGuardada {
  token: string
  user: AuthUser
}

/** Convierte la respuesta del backend en el usuario que usa la interfaz. */
function crearUsuario(respuesta: RespuestaLogin): AuthUser {
  const datos = respuesta.usuario
  const perfil = PERFILES_POR_ROL[respuesta.rol]
  return {
    id: String(datos.idUsuario),
    name: `${datos.nombres} ${datos.apellidos}`,
    email: datos.correo,
    role: perfil.role,
    permissions: perfil.permissions,
    // Sin sede (gerente) significa que supervisa todas.
    agenciaId: respuesta.idAgencia === null ? TODAS_LAS_SEDES : String(respuesta.idAgencia),
    agenciaNombre: respuesta.nombreAgencia,
  }
}

function leerSesionGuardada(): SesionGuardada | null {
  try {
    const texto = window.sessionStorage.getItem(SESSION_KEY)
    return texto ? (JSON.parse(texto) as SesionGuardada) : null
  } catch {
    return null
  }
}

export type LoginResult = { ok: true } | { ok: false; message: string }

interface AuthStoreState extends AuthSession {
  token: string | null
  /** Revisa si ya existe una sesión guardada. Se llama una sola vez al montar la app. */
  init: () => void
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
  /** Actualiza el nombre mostrado tras editar el perfil (también en la sesión guardada). */
  actualizarNombre: (nombre: string) => void
}

export const useAuthStore = create<AuthStoreState>()((set, get) => ({
  user: null,
  token: null,
  status: 'loading',

  init: () => {
    const guardada = leerSesionGuardada()
    if (guardada) set({ user: guardada.user, token: guardada.token, status: 'authenticated' })
    else set({ user: null, token: null, status: 'unauthenticated' })
  },

  login: async (email, password) => {
    if (!email.trim() || !password) {
      return { ok: false, message: 'Ingresa tu correo y tu contraseña.' }
    }
    try {
      const respuesta = await authService.iniciarSesion(email, password)
      const sesion: SesionGuardada = { token: respuesta.token, user: crearUsuario(respuesta) }
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(sesion))
      set({ user: sesion.user, token: sesion.token, status: 'authenticated' })
      return { ok: true }
    } catch (error) {
      // El backend envía el motivo (credenciales incorrectas, cuenta sin acceso, etc.).
      const mensaje = esApiError(error) ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
      return { ok: false, message: mensaje }
    }
  },

  logout: () => {
    // Se avisa al backend sin esperar la respuesta: la sesión local se cierra igual.
    if (get().token) authService.cerrarSesion().catch(() => undefined)
    window.sessionStorage.removeItem(SESSION_KEY)
    // El siguiente usuario que entre empieza con los filtros del Dashboard limpios.
    useDashboardFiltrosStore.getState().limpiar()
    set({ user: null, token: null, status: 'unauthenticated' })
  },

  actualizarNombre: (nombre) => {
    const { user, token } = get()
    if (!user || !token) return
    const actualizado = { ...user, name: nombre }
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, user: actualizado } satisfies SesionGuardada))
    set({ user: actualizado })
  },
}))

// Cada petición al backend lleva el token de la sesión actual.
configurarProveedorToken(() => useAuthStore.getState().token)

// Si el backend rechaza el token (venció o se cerró), se vuelve al Login.
configurarAlSesionVencida(() => {
  window.sessionStorage.removeItem(SESSION_KEY)
  useAuthStore.setState({ user: null, token: null, status: 'unauthenticated' })
})

/** `'*'` concede todo; sin permiso requerido siempre se permite. */
export function hasPermission(user: AuthUser | null, required?: string): boolean {
  if (!required) return true
  if (!user) return false
  return user.permissions.includes('*') || user.permissions.includes(required)
}
