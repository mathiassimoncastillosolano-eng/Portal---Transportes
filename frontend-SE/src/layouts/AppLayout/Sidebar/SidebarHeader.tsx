import { BrandLogo } from '@/components/brand/BrandLogo'
import { cn } from '@/utils/cn'

interface SidebarHeaderProps {
  collapsed: boolean
}

/** Cabecera del Sidebar: logotipo idéntico al del Portal de Clientes. */
export function SidebarHeader({ collapsed }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        'flex h-[72px] shrink-0 items-center border-b border-white/[0.07] px-5',
        collapsed && 'justify-center px-0',
      )}
    >
      <BrandLogo compact={collapsed} size={40} subtitle="Sistema Empresarial" />
    </div>
  )
}
