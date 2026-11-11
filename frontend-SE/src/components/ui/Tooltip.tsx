import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'right' | 'top' | 'bottom'
  disabled?: boolean
  /** Permite ajustar el wrapper (p. ej. para que ocupe todo el ancho disponible y centre su contenido). */
  className?: string
}

/** Separación entre el disparador y el tooltip, equivalente al `ml-2`/`mb-2`/`mt-2` original (0.5rem). */
const OFFSET_PX = 8

type Side = NonNullable<TooltipProps['side']>

/**
 * Tooltip accesible y ligero. Se apoya en `aria-describedby` en vez de
 * solo `title`, para que lectores de pantalla lo anuncien de forma fiable.
 * Usado sobre todo por el Sidebar en modo colapsado.
 *
 * El contenido del tooltip se renderiza en un portal sobre `document.body`
 * y se posiciona con `position: fixed` calculado a partir del disparador.
 * Esto conserva exactamente la posición/tamaño/diseño visual originales,
 * pero evita que un ancestro con overflow recortado (como el `<nav>`
 * scrolleable del sidebar) corte el tooltip.
 */
export function Tooltip({ label, children, side = 'right', disabled = false, className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  if (disabled) return <>{children}</>

  function computeCoords(): { top: number; left: number } | null {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return null

    switch (side) {
      case 'right':
        return { top: rect.top + rect.height / 2, left: rect.right + OFFSET_PX }
      case 'top':
        return { top: rect.top - OFFSET_PX, left: rect.left + rect.width / 2 }
      case 'bottom':
        return { top: rect.bottom + OFFSET_PX, left: rect.left + rect.width / 2 }
    }
  }

  function show() {
    setCoords(computeCoords())
    setVisible(true)
  }

  function hide() {
    setVisible(false)
  }

  // Misma sensación de entrada/salida que antes (fade + pequeño desplazamiento),
  // solo que ahora expresada como transform absoluto en vez de utilidades relativas al padre.
  const visibleTransform: Record<Side, string> = {
    right: 'translate(0, -50%)',
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
  }
  const hiddenTransform: Record<Side, string> = {
    right: 'translate(-4px, -50%)',
    top: 'translate(-50%, calc(-100% - 4px))',
    bottom: 'translate(-50%, 4px)',
  }

  return (
    <span
      ref={triggerRef}
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children /* el hijo debe referenciar aria-describedby={id} si aplica */}
      {coords &&
        createPortal(
          <span
            role="tooltip"
            id={id}
            className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-flyout transition-all duration-150"
            style={{
              top: coords.top,
              left: coords.left,
              transform: visible ? visibleTransform[side] : hiddenTransform[side],
              opacity: visible ? 1 : 0,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  )
}
