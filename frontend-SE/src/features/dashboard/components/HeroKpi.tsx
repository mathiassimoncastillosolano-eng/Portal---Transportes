import { Wallet } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/feedback/Skeleton'
import type { PuntoSerie } from '../utils/agregaciones'
import { Delta } from './Delta'

interface HeroKpiProps {
  label: string
  valor: string | null
  variacion: number | null
  tipoVariacion: 'porcentaje' | 'pp'
  serie: PuntoSerie[]
  loading?: boolean
  /** Línea de contexto bajo el valor (ej. "1 234 pasajes vendidos"). */
  contexto?: string
}

/**
 * Indicador principal del panel: ingresos del período sobre la superficie de
 * marca profunda (la misma del resumen de viaje y del isotipo), con la curva
 * diaria como contexto. Es el único bloque "oscuro" de la página: jerarquiza
 * sin añadir colores nuevos.
 */
export function HeroKpi({ label, valor, variacion, tipoVariacion, serie, loading, contexto }: HeroKpiProps) {
  return (
    <section
      aria-label={label}
      className="animate-fade-slide-up-sm relative flex min-h-[236px] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border border-white/[0.08] bg-[image:var(--gradient-brand-deep)] p-6 text-white shadow-panel sm:col-span-2 xl:row-span-2"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-accent-400/25 blur-[70px]"
      />

      <div className="relative">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/10 text-accent-400 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
            <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">{label}</span>
        </div>

        {loading ? (
          <>
            <Skeleton className="mt-6 h-11 w-52 bg-white/10" />
            <Skeleton className="mt-4 h-5 w-40 rounded-full bg-white/10" />
          </>
        ) : (
          <>
            <p className="mt-5 font-display text-[44px] font-semibold leading-none tracking-tight tabular-nums sm:text-[52px]">{valor ?? '—'}</p>
            <Delta variacion={variacion} tipo={tipoVariacion} onDark className="mt-4" />
            {contexto && <p className="mt-2 text-xs text-white/60">{contexto}</p>}
          </>
        )}
      </div>

      <div className="relative -mx-6 -mb-6 mt-4 h-[88px]" aria-hidden="true">
        {!loading && serie.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="grad-hero" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4a8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#2dd4a8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="ingresos" stroke="#2dd4a8" strokeWidth={2} fill="url(#grad-hero)" animationDuration={1100} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
