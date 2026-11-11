/** ¿El evento viene de un campo donde el usuario está escribiendo? Los atajos globales lo respetan. */
export function esCampoDeTexto(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/** ¿Hay un diálogo modal abierto? (los atajos de pantalla no deben actuar detrás de él). */
export function hayModalAbierto(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null
}
