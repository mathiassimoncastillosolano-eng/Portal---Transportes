import { useEffect, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  widthClassName?: string
  children: ReactNode
  overlayClassName?: string
  panelClassName?: string
  'aria-label': string
}

/**
 * Panel deslizante genérico. El Sidebar móvil se construye sobre este
 * componente; también queda disponible para futuros paneles laterales
 * de los módulos (resumen del pasaje en pantallas estrechas, etc.).
 */
export function Drawer({
  open,
  onClose,
  side = 'left',
  widthClassName = 'w-[280px]',
  children,
  overlayClassName,
  panelClassName,
  ...aria
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div
      className={cn(
        'fixed inset-0 z-[90] transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      aria-hidden={!open}
    >
      <div
        className={cn('absolute inset-0 bg-ink-950/50', overlayClassName)}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={aria['aria-label']}
        className={cn(
          'absolute top-0 h-full bg-ink-950 shadow-flyout transition-transform duration-300 ease-out',
          widthClassName,
          side === 'left' ? 'left-0' : 'right-0',
          side === 'left'
            ? open
              ? 'translate-x-0'
              : '-translate-x-full'
            : open
              ? 'translate-x-0'
              : 'translate-x-full',
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
