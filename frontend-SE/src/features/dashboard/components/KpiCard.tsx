import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Delta } from './Delta'

interface KpiCardProps {
  label: string
  /** Valor ya formateado; `null` = sin datos. */
  valor: string | null
  icon: LucideIcon
  /** Variación calculada (no escrita a mano); `null` = sin base de comparación. */
  variacion: number | null
  tipoVariacion: 'porcentaje' | 'pp'
  loading?: boolean
  /** Retraso de entrada (índice en la grilla) para el efecto escalonado. */
  delayMs?: number
}

/** Indicador compacto: etiqueta, valor protagonista y variación frente al período anterior comparable. */
export function KpiCard({ label, valor, icon: Icon, variacion, tipoVariacion, loading, delayMs = 0 }: KpiCardProps) {
  if (loading) {
    return (
      <Card className="animate-fade-in p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-8 rounded-[10px]" />
        </div>
        <Skeleton className="mt-5 h-7 w-24" />
        <Skeleton className="mt-3 h-5 w-32 rounded-full" />
      </Card>
    )
  }

  return (
    <Card
      hoverable
      className="group animate-fade-slide-up-sm flex flex-col justify-between p-4 transition-[box-shadow,transform,border-color] duration-200 ease-[var(--ease-premium)] hover:-translate-y-0.5 hover:border-border-strong"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">{label}</span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent-50 text-accent-text transition-[background-color,transform] duration-200 ease-[var(--ease-premium)] group-hover:scale-105 group-hover:bg-accent-100">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{valor ?? '—'}</p>
      <Delta variacion={variacion} tipo={tipoVariacion} className="mt-3" />
    </Card>
  )
}
