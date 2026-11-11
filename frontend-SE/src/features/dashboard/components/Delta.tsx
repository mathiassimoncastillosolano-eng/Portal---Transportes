import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/utils/cn'

export function textoVariacion(v: number, tipo: 'porcentaje' | 'pp'): string {
  const signo = v > 0 ? '+' : v < 0 ? '−' : ''
  const abs = Math.abs(v).toLocaleString('es-PE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return tipo === 'pp' ? `${signo}${abs} pp` : `${signo}${abs}%`
}

interface DeltaProps {
  variacion: number | null
  tipo: 'porcentaje' | 'pp'
  /** `onDark`: sobre la tarjeta principal (fondo de marca). */
  onDark?: boolean
  className?: string
}

/** Píldora de variación frente al período anterior: color + flecha + signo (nunca solo color). */
export function Delta({ variacion, tipo, onDark, className }: DeltaProps) {
  const tendencia = variacion === null || Math.abs(variacion) < 0.05 ? 'neutral' : variacion > 0 ? 'up' : 'down'
  const Icono = tendencia === 'up' ? ArrowUpRight : tendencia === 'down' ? ArrowDownRight : Minus

  return (
    <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs', className)}>
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold tabular-nums',
          onDark
            ? tendencia === 'down'
              ? 'bg-white/10 text-[#f6a8a6]'
              : 'bg-white/10 text-accent-400'
            : tendencia === 'up'
              ? 'bg-success-50 text-accent-text'
              : tendencia === 'down'
                ? 'bg-danger-50 text-danger-500'
                : 'bg-surface-sunken text-text-500',
        )}
      >
        <Icono className="h-3.5 w-3.5" aria-hidden="true" />
        {variacion === null ? '—' : textoVariacion(variacion, tipo)}
      </span>
      <span className={onDark ? 'text-white/60' : 'text-text-500'}>
        {variacion === null ? 'Sin período comparable' : 'vs. período anterior'}
      </span>
    </span>
  )
}
