import { hasPermission, useAuthStore } from '@/stores/authStore'

/**
 * Solo el personal de agencia cambia viajes (el gerente no; el backend también lo bloquea).
 * Se usa el permiso que ya tiene el rol AGENCIA, 'pasajes:registrar', para no cambiar la tabla de roles.
 */
export function usePuedeCambiarViajes(): boolean {
  return useAuthStore((s) => hasPermission(s.user, 'pasajes:registrar'))
}
