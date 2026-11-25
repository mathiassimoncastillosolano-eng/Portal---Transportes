import { Timer } from 'lucide-react'
import { formatearCuenta } from '@/features/ticketing/components/ReservaTemporal'
import { useSegundosRestantes } from '@/features/ticketing/hooks/useReservaTemporal'
import { cn } from '@/utils/cn'

/** Cuenta regresiva de la reserva del asiento (10 minutos). En rojo durante el último minuto. */
export function ContadorReserva({ expiraEn }: { expiraEn: number | null }) {
  const segundos = useSegundosRestantes(expiraEn)
  if (segundos === null) return null
  const urgente = segundos <= 60
  return (
    <span
      role="timer"
      aria-label={`Reserva del asiento, quedan ${formatearCuenta(segundos)}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ring-1 transition-colors',
        urgente ? 'bg-danger-50 text-danger-500 ring-danger-500/30' : 'bg-accent-50 text-accent-text ring-accent-line/30',
      )}
    >
      <Timer className="h-4 w-4" aria-hidden="true" />
      {formatearCuenta(segundos)}
    </span>
  )
}
