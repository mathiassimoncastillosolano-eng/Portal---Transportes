import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases condicionales (clsx) y resuelve conflictos de Tailwind
 * (tailwind-merge). Utilidad transversal usada por todos los componentes
 * de UI del sistema.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
