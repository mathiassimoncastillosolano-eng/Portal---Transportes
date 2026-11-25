import { Armchair, Check, CircleDashed, PencilLine } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PassengerTicketCardProps {
  indice: number
  codigoAsiento: string
  nombreCompleto: string
  completo: boolean
  activo: boolean
  onClick: () => void
}

export function PassengerTicketCard({
  indice,
  codigoAsiento,
  nombreCompleto,
  completo,
  activo,
  onClick,
}: PassengerTicketCardProps) {
  const estado = completo ? 'Listo' : activo ? 'Editando' : 'Pendiente'
  const numero = String(indice).padStart(2, '0')

  return (
    <button
      type="button"
      role="tab"
      aria-selected={activo}
      aria-current={activo ? 'true' : undefined}
      aria-label={`Pasaje ${numero}, asiento ${codigoAsiento}, ${estado}`}
      onClick={onClick}
      className={cn(
        'group relative flex w-[224px] shrink-0 overflow-hidden rounded-2xl border text-left',
        'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-premium)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
        activo
          ? 'border-accent-line bg-surface-selected shadow-[0_0_0_1px_var(--color-accent-line)]'
          : completo
            ? 'border-accent-line/45 bg-surface-card hover:-translate-y-px hover:border-accent-line'
            : 'border-border bg-surface-card hover:-translate-y-px hover:border-border-strong hover:bg-surface-hover',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-[3px] origin-left transition-transform duration-300 ease-[var(--ease-premium)]',
          completo || activo ? 'scale-x-100 bg-accent-line' : 'scale-x-0 bg-accent-line',
        )}
      />

      <span className="flex min-w-0 flex-1 flex-col gap-1 px-3.5 pb-3 pt-3.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-400">Pasaje {numero}</span>
        <span className="flex items-center gap-2">
          <Armchair className={cn('h-4 w-4 shrink-0', activo || completo ? 'text-accent-text' : 'text-text-400')} aria-hidden="true" />
          <span className="font-display text-[26px] font-semibold leading-none tabular-nums text-text-900">{codigoAsiento}</span>
        </span>
        <span className={cn('mt-1 truncate text-xs', nombreCompleto ? 'font-medium text-text-700' : 'text-text-400')}>
          {nombreCompleto || 'Sin datos del pasajero'}
        </span>
      </span>

      <span aria-hidden="true" className="pointer-events-none absolute inset-y-2.5 right-[68px] border-l-2 border-dashed border-border-strong" />
      <span
        aria-hidden="true"
        className="absolute -top-[7px] right-[calc(68px-7px)] h-3.5 w-3.5 rounded-full border border-inherit bg-surface-card"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-[7px] right-[calc(68px-7px)] h-3.5 w-3.5 rounded-full border border-inherit bg-surface-card"
      />

      <span
        className={cn(
          'flex w-[68px] shrink-0 flex-col items-center justify-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.1em]',
          completo ? 'text-accent-text' : activo ? 'text-accent-text' : 'text-text-400',
          completo || activo ? 'bg-accent-line/10' : 'bg-surface-sunken/70',
        )}
      >
        {completo ? (
          <span key="listo" className="animate-check-pop flex h-6 w-6 items-center justify-center rounded-full bg-cta text-on-cta">
            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
        ) : activo ? (
          <PencilLine className="h-5 w-5" aria-hidden="true" />
        ) : (
          <CircleDashed className="h-5 w-5" aria-hidden="true" />
        )}
        {estado}
      </span>
    </button>
  )
}
