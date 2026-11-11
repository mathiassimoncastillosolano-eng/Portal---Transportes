import { Clock, Moon, Sun, Sunrise, Sunset } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { FRANJAS } from '../utils/viajes'
import type { FranjaId } from '../types'

interface ScheduleFilterProps {
  /** Franjas activas. Vacío = sin filtro de horario. */
  franjas: FranjaId[]
  onChange: (franjas: FranjaId[]) => void
  disabled?: boolean
}

const iconos: Record<FranjaId, ReactNode> = {
  madrugada: <Moon className="h-3.5 w-3.5" aria-hidden="true" />,
  manana: <Sunrise className="h-3.5 w-3.5" aria-hidden="true" />,
  tarde: <Sun className="h-3.5 w-3.5" aria-hidden="true" />,
  noche: <Sunset className="h-3.5 w-3.5" aria-hidden="true" />,
}

/**
 * Horario de salida: cuatro franjas (Madrugada · Mañana · Tarde · Noche) que
 * se activan y desactivan al hacer clic. Sin ninguna activa se muestran todos
 * los horarios, por eso no existe una opción "Todos" ni un rango libre.
 * El rango horario de cada franja se ve en el tooltip.
 */
export function ScheduleFilter({ franjas, onChange, disabled }: ScheduleFilterProps) {
  function alternar(id: FranjaId) {
    onChange(franjas.includes(id) ? franjas.filter((f) => f !== id) : [...franjas, id])
  }

  return (
    <div role="group" aria-label="Horario de salida" className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        Horario
      </span>
      <div className="flex flex-wrap gap-1.5">
        {FRANJAS.map((f) => {
          const activo = franjas.includes(f.id)
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              aria-pressed={activo}
              title={f.rango}
              onClick={() => alternar(f.id)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium',
                'transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-premium)] active:scale-[0.97]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                activo
                  ? 'border-accent-line bg-accent-line/12 text-text-900'
                  : 'border-border bg-transparent text-text-700 hover:border-border-strong hover:bg-surface-hover',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              <span className={cn('transition-colors duration-150', activo ? 'text-accent-text' : 'text-text-400')}>{iconos[f.id]}</span>
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
