import { filterNavByPermission, navigationConfig } from '@/config/navigation'
import { useAuthStore } from '@/stores/authStore'
import { SidebarItem } from './SidebarItem'
import { SidebarSection } from './SidebarSection'

interface SidebarNavigationProps {
  collapsed: boolean
  onNavigate?: () => void
}

/**
 * Renderiza la navegación completa a partir de `navigationConfig`.
 * No conoce nada de negocio: solo recorre la config y decide si un
 * entry es un item suelto o una sección.
 */
export function SidebarNavigation({ collapsed, onNavigate }: SidebarNavigationProps) {
  const user = useAuthStore((s) => s.user)
  const entries = filterNavByPermission(navigationConfig, user)

  return (
    <nav
      aria-label="Navegación principal"
      className="scrollbar-thin-dark flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3.5 py-4"
    >
      {entries.map((entry) =>
        entry.kind === 'item' ? (
          <ul key={entry.item.id} className="flex flex-col gap-0.5">
            <li>
              <SidebarItem item={entry.item} collapsed={collapsed} onNavigate={onNavigate} />
            </li>
          </ul>
        ) : (
          <SidebarSection
            key={entry.section.id}
            section={entry.section}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ),
      )}
    </nav>
  )
}
