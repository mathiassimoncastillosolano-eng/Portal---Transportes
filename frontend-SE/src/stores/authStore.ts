import { create } from 'zustand'
import type { AuthSession, AuthUser, Permission } from '@/types/auth'

/**
 * Store de sesión. Autenticación 100% simulada (sin backend, sin JWT real):
 * dos usuarios mock (personal de agencia y gerente) con permisos distintos.
 *
 * `status` representa el ciclo de vida real de la sesión:
 *   'loading'         -> verificando si ya existe una sesión (al abrir la app)
 *   'unauthenticated' -> no hay sesión: se muestra el Login
 *   'authenticated'   -> hay sesión: se muestra el Shell (Sidebar/Header/SE)
 *
 * La sesión se guarda en `sessionStorage` (no `localStorage`): sobrevive a
 * un refresh de la pestaña, como cualquier sesión real, pero no persiste
 * entre reinicios del navegador ni es la sesión "de negocio" del MVP — es
 * solo la marca de "hay alguien logueado", igual que una cookie de sesión.
 * Como la app no tiene rutas (una sola Main View), no existe una URL del
 * shell a la que el botón "atrás" del navegador pueda regresar tras el
 * logout: `ProtectedRoute` ya decide qué mostrar únicamente a partir de
 * este `status`.
 */

const SESSION_KEY = 'rutalibre-se-session'
/** `agenciaId` del gerente: no está atado a una sede. */
export const TODAS_LAS_SEDES = 'todas'
const RETRASO_VERIFICACION_MS = 450
const RETRASO_LOGIN_MS = 700

/**
 * Dos perfiles de demostración:
 *  - Personal de agencia: módulos de Operaciones y Comercial, atado a UNA sede.
 *  - Gerente: solo el módulo de Supervisión (Dashboard), sobre todas las sedes.
 */
const staffUser: AuthUser = {
  id: 'usr_demo_1',
  name: 'Camila Rojas',
  email: 'camila.rojas@rutalibre.com',
  role: 'staff',
  permissions: ['pasajes:registrar'] satisfies Permission[],
  agenciaId: 'lim-norte',
}

const managerUser: AuthUser = {
  id: 'usr_demo_2',
  name: 'Ricardo Salazar',
  email: 'ricardo.salazar@rutalibre.com',
  role: 'manager',
  permissions: ['dashboard:ver'] satisfies Permission[],
  agenciaId: TODAS_LAS_SEDES,
}

const usuarios: AuthUser[] = [staffUser, managerUser]

/**
 * Contraseña de las cuentas de demostración. Se valida aquí (no hay backend)
 * y no se imprime en la UI: los botones de acceso de demostración entran
 * directo, sin exponerla como texto.
 */
const DEMO_PASSWORD = 'RutaLibre#2026'

export type PerfilDemo = 'gerente' | 'agencia'

export type LoginResult = { ok: true } | { ok: false; message: string }

interface AuthStoreState extends AuthSession {
  /** Comprueba si ya existe una sesión (sessionStorage) y resuelve el estado inicial. Se llama una sola vez al montar la app. */
  init: () => void
  login: (email: string, password: string) => Promise<LoginResult>
  /** Entra directo con una cuenta de demostración (sin escribir credenciales). */
  loginDemo: (perfil: PerfilDemo) => Promise<void>
  logout: () => void
}

function esperar(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export const useAuthStore = create<AuthStoreState>()((set) => ({
  user: null,
  status: 'loading',

  init: () => {
    const guardado = usuarios.find((u) => u.id === window.sessionStorage.getItem(SESSION_KEY))
    const haySesion = !!guardado
    // Pequeño retraso solo cuando hay sesión que "verificar": si no la hay,
    // resolver de inmediato evita una espera artificial en la primera visita.
    esperar(haySesion ? RETRASO_VERIFICACION_MS : 0).then(() => {
      set(guardado ? { user: guardado, status: 'authenticated' } : { user: null, status: 'unauthenticated' })
    })
  },

  login: async (email, password) => {
    await esperar(RETRASO_LOGIN_MS)
    const usuario = usuarios.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!usuario || password !== DEMO_PASSWORD) {
      return { ok: false, message: 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.' }
    }
    window.sessionStorage.setItem(SESSION_KEY, usuario.id)
    set({ user: usuario, status: 'authenticated' })
    return { ok: true }
  },

  loginDemo: async (perfil) => {
    await esperar(RETRASO_LOGIN_MS)
    const usuario = perfil === 'gerente' ? managerUser : staffUser
    window.sessionStorage.setItem(SESSION_KEY, usuario.id)
    set({ user: usuario, status: 'authenticated' })
  },

  logout: () => {
    window.sessionStorage.removeItem(SESSION_KEY)
    set({ user: null, status: 'unauthenticated' })
  },
}))

/** Datos públicos de las cuentas de demostración (para rotular los botones del login). */
export const cuentasDemo: Record<PerfilDemo, { nombre: string; agenciaId: string }> = {
  gerente: { nombre: managerUser.name, agenciaId: managerUser.agenciaId },
  agencia: { nombre: staffUser.name, agenciaId: staffUser.agenciaId },
}

/** `'*'` concede todo; sin permiso requerido siempre se permite. */
export function hasPermission(user: AuthUser | null, required?: string): boolean {
  if (!required) return true
  if (!user) return false
  return user.permissions.includes('*') || user.permissions.includes(required)
}
