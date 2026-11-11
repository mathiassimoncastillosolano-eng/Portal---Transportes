/**
 * Lenguaje visual compartido de los controles de selección (Select y menús
 * de selección del Header). Centralizarlo aquí evita que cada menú invente
 * su propio hover / estado seleccionado.
 */

/** Superficie del panel flotante: extensión natural del campo (mismo borde y radio del menú genérico). */
export const menuPanelClasses = 'rounded-xl border border-border-strong bg-surface-card shadow-flyout'

/** Geometría base de una opción: altura mínima consistente, radio y transición rápida. */
export const optionBaseClasses =
  'flex min-h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm text-text-700 transition-colors duration-100'

/** Icono de "seleccionado" al final de la fila. */
export const optionCheckClasses = 'h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400'

/**
 * Estado visual por props (lo usa el Select, donde el resaltado lo controla
 * el teclado además del mouse). Hover = velo neutro; seleccionado = tinte de
 * acento suave. Nunca el azul nativo del navegador.
 */
export function optionStateClasses(selected: boolean, active: boolean): string {
  if (selected) return active ? 'bg-accent-100 text-text-900' : 'bg-accent-50 text-text-900'
  return active ? 'bg-text-900/5 text-text-900' : ''
}

/** Variante por CSS `:hover` para menús de botones simples (BranchSelector, ThemeToggle). */
export function optionHoverClasses(selected: boolean): string {
  return selected
    ? 'bg-accent-50 text-text-900 hover:bg-accent-100'
    : 'hover:bg-text-900/5 hover:text-text-900'
}
