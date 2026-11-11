import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PassengerTicketCardProps {
  indice: number
  codigoAsiento: string
  nombreCompleto: string
  completo: boolean
  activo: boolean
  onClick: () => void
}

/**
 * Ticket horizontal de un pasajero/asiento (paso "Pasajeros"). Hace clic
 * para editar sus datos; el activo se distingue con el mismo lenguaje de
 * "indicador de selección" que el resto del sistema (borde + acento).
 */
export function PassengerTicketCard({
  indice,
  codigoAsiento,
  nombreCompleto,
  completo,
  activo,
  onClick,
}: PassengerTicketCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? 'true' : undefined}
      className={cn(
        'group relative flex w-[168px] shrink-0 flex-col gap-2 rounded-xl border p-3.5 text-left',
        'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-premium)]',
        activo
          ? 'border-accent-line bg-surface-selected shadow-[0_0_0_1px_var(--color-accent-line)]'
          : 'border-border bg-surface-card hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-400">
          Pasaje {String(indice).padStart(2, '0')}
        </span>
        {completo && (
          <span className="animate-check-pop flex h-4 w-4 items-center justify-center rounded-full bg-cta text-on-cta">
            <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="text-base font-semibold tabular-nums text-text-900">Asiento {codigoAsiento}</p>
      {nombreCompleto ? (
        <p className="truncate text-xs text-text-500">{nombreCompleto}</p>
      ) : (
        <p className={cn('text-xs font-medium', completo ? 'text-accent-text' : 'text-text-400')}>
          {completo ? 'Completado' : 'Sin completar'}
        </p>
      )}
    </button>
  )
}
