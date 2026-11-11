import { useRef, useState, type ReactNode } from 'react'
import { useClickOutside } from '@/hooks/useClickOutside'
import { cn } from '@/utils/cn'

interface DropdownProps {
  trigger: (props: { open: boolean }) => ReactNode
  children: ReactNode
  align?: 'left' | 'right'
  width?: number
}

/**
 * Menú flotante genérico y sin estilos de negocio: envuelve un `trigger`
 * y un panel. NotificationMenu, UserMenu y BranchSelector se construyen
 * sobre este componente para no repetir la lógica de apertura/cierre,
 * click-outside y teclado.
 */
export function Dropdown({ trigger, children, align = 'right', width = 288 }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useClickOutside(containerRef, () => setOpen(false), open)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center"
      >
        {trigger({ open })}
      </button>
      {open && (
        <div
          role="menu"
          style={{ width }}
          className={cn(
            'absolute top-full z-40 mt-2 rounded-xl border border-border bg-surface-card p-1.5 shadow-flyout',
            'animate-[dropdown-in_120ms_ease-out]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}
