import { PanelLeft } from 'lucide-react'
import { Breadcrumbs } from '../Breadcrumbs/Breadcrumbs'
import { BranchInfo } from './BranchInfo'
import { CommandTrigger } from './CommandTrigger'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'
import { useSidebar } from '@/hooks/useSidebar'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/utils/cn'

/**
 * Header global, independiente del módulo activo. Se mantiene fijo en la
 * parte superior del área de contenido; el Sidebar toggle vive aquí
 * (no dentro del propio Sidebar) según lo especificado en la arquitectura.
 */
export function Header() {
  const { toggle, isCollapsed } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface-card/85 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Tooltip label={isCollapsed ? 'Expandir menú' : 'Contraer menú'} side="bottom">
          <button
            type="button"
            onClick={toggle}
            aria-label="Alternar barra lateral"
            aria-expanded={!isCollapsed}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-500 transition-colors duration-200 ease-[var(--ease-premium)] hover:bg-surface-sunken hover:text-text-900 active:scale-95"
          >
            <PanelLeft
              className={cn(
                'h-[18px] w-[18px] transition-transform duration-200 ease-[var(--ease-premium)]',
                isCollapsed && 'rotate-180',
              )}
              aria-hidden="true"
            />
          </button>
        </Tooltip>
        <div className="hidden min-w-0 sm:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
        <CommandTrigger />
        <BranchInfo />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
