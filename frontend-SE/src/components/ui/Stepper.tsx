import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface StepperStep {
  id: string
  label: string
  /** Línea secundaria mientras el paso es el actual (o está pendiente), ej. "Elige el horario". */
  description?: string
  /** Resumen de lo elegido, visible cuando el paso ya está completado, ej. "Lima → Trujillo · 08:00". */
  summary?: string
}

interface StepperProps {
  steps: StepperStep[]
  /** Índice (base 0) del paso actual. Un valor ≥ `steps.length` marca todos los pasos como completados. */
  current: number
  /** Si se define, los pasos completados (anteriores al actual) son navegables. */
  onStepClick?: (index: number) => void
  className?: string
}

/**
 * Indicador de progreso de un wizard, en una sola fila baja. Cada paso tiene
 * círculo (número → check al completarse), etiqueta y una línea secundaria
 * (descripción o resumen de lo elegido). Entre pasos hay una línea de
 * progreso que se rellena con `transform` (barata y suave).
 *
 * Los completados son botones (volver conservando datos); el resto no es
 * interactivo. En pantallas estrechas se muestra solo el paso actual con
 * una barra de avance.
 */
export function Stepper({ steps, current, onStepClick, className }: StepperProps) {
  const total = steps.length
  const actual = Math.min(current, total - 1)
  const terminado = current >= total

  return (
    <nav aria-label="Progreso del registro" className={className}>
      {/* Móvil / estrecho: paso actual + barra de avance */}
      <div className="lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-text-900">
            {terminado ? 'Registro completado' : steps[actual].label}
          </p>
          <p className="text-xs tabular-nums text-text-500">
            Paso {terminado ? total : actual + 1} de {total}
          </p>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-border-strong/50" aria-hidden="true">
          <div
            className="h-full origin-left rounded-full bg-accent-line transition-transform duration-300 ease-[var(--ease-premium)]"
            style={{ transform: `scaleX(${terminado ? 1 : (actual + 0.5) / total})` }}
          />
        </div>
      </div>

      {/* Escritorio: fila completa */}
      <ol className="hidden items-start lg:flex">
        {steps.map((step, index) => {
          const estado = index < current ? 'completado' : index === current ? 'actual' : 'pendiente'
          const clickable = estado === 'completado' && !!onStepClick
          const subtitulo = estado === 'completado' ? (step.summary ?? step.description) : step.description

          const contenido = (
            <>
              <span
                className={cn(
                  'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                  'transition-[background-color,border-color,color,box-shadow] duration-200 ease-[var(--ease-premium)]',
                  estado === 'completado' && 'border-accent-line bg-accent-line text-on-cta',
                  estado === 'actual' && 'border-accent-line bg-cta text-on-cta shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-accent-line)_18%,transparent)]',
                  estado === 'pendiente' && 'border-border-strong bg-transparent text-text-400',
                )}
              >
                {estado === 'completado' ? (
                  <Check key="check" className="animate-check-pop h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              <span className="min-w-0 text-left leading-tight">
                <span
                  className={cn(
                    'block truncate font-display text-sm font-semibold',
                    estado === 'pendiente' ? 'text-text-500' : 'text-text-900',
                  )}
                >
                  {step.label}
                </span>
                {subtitulo && (
                  <span
                    className={cn(
                      'mt-0.5 block truncate text-xs',
                      estado === 'completado' ? 'text-text-500' : 'text-text-400',
                    )}
                    title={subtitulo}
                  >
                    {subtitulo}
                  </span>
                )}
              </span>
            </>
          )

          return (
            <li
              key={step.id}
              aria-current={estado === 'actual' ? 'step' : undefined}
              className={cn('flex min-w-0 items-start', index < total - 1 ? 'flex-1' : 'shrink-0')}
            >
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepClick(index)}
                  className="group flex min-w-0 max-w-[13rem] items-start gap-2.5 rounded-md text-left transition-opacity duration-150 hover:opacity-80"
                >
                  {contenido}
                  <span className="sr-only">(completado, volver a este paso)</span>
                </button>
              ) : (
                <span className="flex min-w-0 max-w-[13rem] items-start gap-2.5">
                  {contenido}
                  <span className="sr-only">{estado === 'actual' ? '(paso actual)' : '(pendiente)'}</span>
                </span>
              )}
              {index < total - 1 && (
                <span aria-hidden="true" className="relative mx-3 mt-3.5 h-px min-w-6 flex-1 overflow-hidden bg-border-strong/60">
                  <span
                    className="absolute inset-0 origin-left bg-accent-line transition-transform duration-500 ease-[var(--ease-premium)]"
                    style={{ transform: `scaleX(${index < current ? 1 : 0})` }}
                  />
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
