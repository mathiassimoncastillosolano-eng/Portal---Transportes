import { SidebarItem } from './SidebarItem'
import { cn } from '@/utils/cn'
import type { NavSection } from '@/types/navigation'

interface SidebarSectionProps {
  section: NavSection
  collapsed: boolean
  onNavigate?: () => void
}

/** Grupo de items con encabezado de sección (ej. "OPERACIONES"). */
export function SidebarSection({ section, collapsed, onNavigate }: SidebarSectionProps) {
  return (
    <div className="flex flex-col gap-1">
      {collapsed ? (
        <div className="mx-3 my-2 h-px bg-white/10" aria-hidden="true" />
      ) : (
        <h3 className="px-3 pb-1.5 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
          {section.label}
        </h3>
      )}
      <ul className={cn('flex flex-col gap-0.5', collapsed && 'items-center')}>
        {section.items.map((item) => (
          <li key={item.id} className="w-full">
            <SidebarItem item={item} collapsed={collapsed} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  )
}
