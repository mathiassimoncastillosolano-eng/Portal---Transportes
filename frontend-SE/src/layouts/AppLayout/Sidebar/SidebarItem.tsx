import { Tooltip } from '@/components/ui/Tooltip'
import { Badge } from '@/components/ui/Badge'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/utils/cn'
import type { NavItem } from '@/types/navigation'

interface SidebarItemProps {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}

/**
 * Un enlace individual del Sidebar. Icono siempre visible; label solo
 * si expandido. En vez de navegar a una ruta, activa la sección
 * correspondiente dentro de la Main View (`activeSectionId` en `uiStore`).
 */
export function SidebarItem({ item, collapsed, onNavigate }: SidebarItemProps) {
  const Icon = item.icon
  const isActive = useUIStore((s) => s.activeSectionId === item.sectionId)
  const setActiveSection = useUIStore((s) => s.setActiveSection)

  function handleClick() {
    setActiveSection(item.sectionId)
    onNavigate?.()
  }

  const link = (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-xl py-1.5 pl-1.5 pr-3 text-left text-[13.5px] font-medium',
        'transition-[background-color,color,box-shadow] duration-200 ease-[var(--ease-premium)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400',
        collapsed && 'justify-center p-1.5',
        isActive
          ? 'bg-gradient-to-r from-accent-400/[0.16] to-white/[0.04] text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]'
          : 'text-ink-300 hover:bg-white/[0.05] hover:text-white',
      )}
      aria-label={item.title}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute -left-2.5 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400',
          'transition-[opacity,transform] duration-200 ease-[var(--ease-premium)]',
          isActive ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0',
        )}
      />
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[background-color,color] duration-200 ease-[var(--ease-premium)]',
          isActive ? 'bg-accent-400/20 text-accent-400' : 'bg-white/[0.04] text-ink-300 group-hover:bg-white/[0.08] group-hover:text-white',
        )}
      >
        <Icon className="h-[17px] w-[17px]" strokeWidth={isActive ? 2.1 : 1.8} aria-hidden="true" />
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.title}</span>
          {item.soon && (
            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-400">
              Pronto
            </span>
          )}
          {item.badge !== undefined && (
            <Badge tone="accent" className="bg-accent-500/15 text-accent-400">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </button>
  )

  if (!collapsed) return link

  return (
    <Tooltip label={item.soon ? `${item.title} · Pronto` : item.title} side="right" className="flex w-full justify-center">
      {link}
    </Tooltip>
  )
}
