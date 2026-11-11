/**
 * Modelos base para autenticación y autorización.
 * No hay lógica real todavía: son los contratos sobre los que se
 * construirá el sistema de auth (login, sesión, roles, permisos).
 */

export type UserRole = 'owner' | 'admin' | 'manager' | 'staff'

/** Capacidades del MVP (Sprints 3 y 4). */
export type Permission = 'pasajes:registrar' | 'dashboard:ver'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: UserRole
  permissions: string[]
  /** Agencia/sede a la que está asociado el usuario. */
  agenciaId: string
}

export interface AuthSession {
  user: AuthUser | null
  status: 'authenticated' | 'unauthenticated' | 'loading'
}
