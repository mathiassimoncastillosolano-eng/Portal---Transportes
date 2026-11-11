import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatearDiaMes, formatearFechaCorta, formatearMoneda, formatearMonedaEntera } from '@/utils/formato'
import type { PuntoSerie } from '../utils/agregaciones'
import { ChartCard } from './ChartCard'
import { COLOR_GRILLA, EJE } from '../utils/estiloGraficos'
import { ChartTooltip } from './ChartTooltip'

interface EvolutionChartProps {
  serie: PuntoSerie[]
  cargando: boolean
  error: boolean
  onRetry: () => void
  hayVentas: boolean
}

const compacto = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })

/** Evolución de ingresos por día de emisión, con tabla de datos como alternativa textual. */
export function EvolutionChart({ serie, cargando, error, onRetry, hayVentas }: EvolutionChartProps) {
  const total = serie.reduce((s, p) => s + p.ingresos, 0)
  const mejor = serie.reduce((m, p) => (p.ingresos > m.ingresos ? p : m), serie[0] ?? { fecha: '', ingresos: 0, pasajes: 0 })

  return (
    <ChartCard
      title="Evolución de ingresos por día"
      description="Ingresos diarios por pasajes emitidos (S/)"
      cargando={cargando}
      error={error}
      onRetry={onRetry}
      vacio={!hayVentas}
      resumen={`Ingresos totales ${formatearMoneda(total)} en ${serie.length} días. Mejor día: ${mejor.fecha ? formatearFechaCorta(mejor.fecha) : '—'} con ${formatearMoneda(mejor.ingresos)}.`}
      className="xl:col-span-2"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Total del período</p>
          <p className="mt-1 font-display text-2xl font-semibold leading-none tabular-nums text-text-900">{formatearMoneda(total)}</p>
        </div>
        {mejor.fecha && (
          <p className="text-xs text-text-500">
            Mejor día <span className="font-semibold text-text-900">{formatearFechaCorta(mejor.fecha)}</span> · {formatearMoneda(mejor.ingresos)}
          </p>
        )}
      </div>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="grad-ingresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={COLOR_GRILLA} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="fecha" tickFormatter={formatearDiaMes} tick={EJE} tickLine={false} axisLine={{ stroke: COLOR_GRILLA }} minTickGap={28} />
            <YAxis tickFormatter={(v: number) => `S/ ${compacto.format(v)}`} tick={EJE} tickLine={false} axisLine={false} width={64} />
            <Tooltip
              cursor={{ stroke: 'var(--color-border-strong)' }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as PuntoSerie | undefined
                if (!active || !p) return null
                return (
                  <ChartTooltip
                    titulo={formatearFechaCorta(p.fecha)}
                    filas={[
                      { etiqueta: 'Ingresos', valor: formatearMonedaEntera(p.ingresos) },
                      { etiqueta: 'Pasajes', valor: p.pasajes },
                    ]}
                  />
                )
              }}
            />
            <Area type="monotone" dataKey="ingresos" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#grad-ingresos)" activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--color-surface-card)' }} animationDuration={900} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-text-500">
        <summary className="cursor-pointer font-medium text-text-700">Ver tabla de datos</summary>
        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-border">
          <table className="w-full text-left">
            <caption className="sr-only">Ingresos y pasajes por día</caption>
            <thead className="sticky top-0 bg-surface-sunken">
              <tr>
                <th scope="col" className="px-3 py-1.5">Día</th>
                <th scope="col" className="px-3 py-1.5 text-right">Pasajes</th>
                <th scope="col" className="px-3 py-1.5 text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {serie.map((p) => (
                <tr key={p.fecha}>
                  <td className="px-3 py-1.5">{formatearFechaCorta(p.fecha)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{p.pasajes}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatearMoneda(p.ingresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </ChartCard>
  )
}
