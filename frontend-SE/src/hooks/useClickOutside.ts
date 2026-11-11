import { useEffect, type RefObject } from 'react'

/**
 * Ejecuta `handler` cuando ocurre un click o un toque fuera de `ref`.
 * Usado por Dropdown, Modal y los menús flotantes del Header.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return

    function handlePointerDown(event: PointerEvent) {
      const el = ref.current
      if (!el || el.contains(event.target as Node)) return
      handler()
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') handler()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [ref, handler, active])
}
