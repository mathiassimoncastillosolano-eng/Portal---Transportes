import { ArrowUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { OrdenViajes } from '../types'
import { componerOrden, CRITERIOS_ORDEN, descomponerOrden, type CriterioOrden } from '../utils/viajes'

interface SortControlProps {
  orden: OrdenViajes
  onOrden: (o: OrdenViajes) => void
  className?: string
}

/**
 * Selector de orden: tres criterios (Hora de salida · Disponibilidad · Precio),
 * cada uno con un botón pequeño que alterna ascendente/descendente. La
 * dirección se comunica únicamente con la flecha (↑ / ↓), sin textos como
 * "más próxima" o "menor precio"; el significado de cada dirección vive en el
 * `aria-label` para lectores de pantalla.
 *
 *  - Pulsar el nombre de un criterio lo activa (ascendente).
 *  - Pulsar su flecha alterna la dirección; si el criterio no estaba activo,
 *    lo activa con la dirección contraria a la mostrada (ascendente).
 */
export function SortControl({ orden, onOrden, className }: SortControlProps) {
  const { criterio: activo, direccion } = descomponerOrden(orden)

  function elegir(c: CriterioOrden) {
    if (c !== activo) onOrden(componerOrden(c, 'asc'))
  }
  function alternar(c: CriterioOrden) {
    if (c !== activo) onOrden(componerOrden(c, 'asc'))
    else onOrden(componerOrden(c, direccion === 'asc' ? 'desc' : 'asc'))
  }

  return (
    <div
      role="group"
      aria-label="Ordenar viajes"
      className={cn('inline-flex max-w-full items-center rounded-lg border border-border bg-surface-sunken p-0.5', className)}
    >
      {CRITERIOS_ORDEN.map((c) => {
        const esActivo = c.id === activo
        const dir = esActivo ? direccion : 'asc'
        return (
          <div
            key={c.id}
            className={cn(
              'flex items-center rounded-md transition-[background-color,box-shadow,color] duration-150 ease-[var(--ease-premium)]',
              esActivo ? 'bg-surface-card text-text-900 shadow-[0_0_0_1px_var(--color-border),0_1px_2px_rgb(0_0_0/0.06)]' : 'text-text-500 hover:text-text-900',
            )}
          >
            <button
              type="button"
              aria-pressed={esActivo}
              onClick={() => elegir(c.id)}
              className={cn(
                'h-7 whitespace-nowrap rounded-l-md pl-2 pr-1 text-[12px] font-medium sm:pl-2.5 sm:text-[13px]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line',
              )}
            >
              {c.label}
            </button>
            <button
              type="button"
              onClick={() => alternar(c.id)}
              aria-label={`${c.label}: orden ${dir === 'asc' ? 'ascendente' : 'descendente'}${esActivo ? '. Cambiar dirección' : '. Ordenar por este criterio'}`}
              className={cn(
                'flex h-7 w-6 items-center justify-center rounded-r-md transition-colors duration-150',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-line',
                esActivo ? 'text-accent-text hover:bg-surface-hover' : 'text-text-400 opacity-60 hover:bg-surface-hover hover:opacity-100',
              )}
            >
              <ArrowUp
                className={cn('h-3.5 w-3.5 transition-transform duration-200 ease-[var(--ease-premium)]', dir === 'desc' && 'rotate-180')}
                strokeWidth={2.25}
                aria-hidden="true"
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
