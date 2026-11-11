import { ChevronDown, LogOut } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/cn'

const roleLabels: Record<string, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  manager: 'Gerente',
  staff: 'Trabajador',
}

/**
 * Menú del usuario. Lee la sesión de `authStore`; hoy es un usuario
 * simulado, pero el componente ya está listo para conectarse a la
 * autenticación real sin cambios estructurales.
 */
export function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  if (!user) return null

  return (
    <Dropdown
      width={240}
      trigger={({ open }) => (
        <span
          className={cn(
            'flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-sunken',
            open && 'bg-surface-sunken',
          )}
        >
          <Avatar name={user.name} size="sm" />
          <span className="hidden text-left leading-tight lg:block">
            <span className="block text-sm font-medium text-text-900">{user.name}</span>
            <span className="block text-xs text-text-500">
              {roleLabels[user.role] ?? user.role}
            </span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-text-400 lg:block" aria-hidden="true" />
        </span>
      )}
    >
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-medium text-text-900">{user.name}</p>
        <p className="truncate text-xs text-text-500">{user.email}</p>
      </div>
      <div className="my-1 h-px bg-border" role="separator" />
      <button
        type="button"
        role="menuitem"
        onClick={logout}
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-danger-500 transition-colors hover:bg-danger-50"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Cerrar sesión
      </button>
    </Dropdown>
  )
}
