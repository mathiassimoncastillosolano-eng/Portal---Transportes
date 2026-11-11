import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { ServicioId } from '@/types/servicio'
import { formatearMoneda, formatearMonedaEntera, formatearPorcentaje } from '@/utils/formato'
import type { FilaRanking } from '../utils/agregaciones'
import { ChartCard } from './ChartCard'
import { ChartTooltip } from './ChartTooltip'

const COLOR_SERVICIO: Record<ServicioId, string> = {
  economico: 'var(--color-chart-1)',
  ejecutivo: 'var(--color-chart-2)',
  directo: 'var(--color-chart-3)',
  vip: 'var(--color-chart-4)',
}

interface Props {
  filas: (FilaRanking & { servicioId: ServicioId })[]
  cargando: boolean
  error: boolean
  onRetry: () => void
  hayVentas: boolean
}

/** Distribución de ventas (ingresos) por servicio, con leyenda que actúa también como alternativa textual. */
export function ServiceDistribution({ filas, cargando, error, onRetry, hayVentas }: Props) {
  const total = filas.reduce((s, f) => s + f.ingresos, 0)

  return (
    <ChartCard
      title="Distribución por servicio"
      description="Participación en ingresos"
      cargando={cargando}
      error={error}
      onRetry={onRetry}
      vacio={!hayVentas}
      resumen={filas.map((f) => `${f.etiqueta}: ${formatearPorcentaje(f.participacion)}`).join('. ')}
    >
      <div className="relative" aria-hidden="true">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={filas} dataKey="ingresos" nameKey="etiqueta" innerRadius={62} outerRadius={90} paddingAngle={3} cornerRadius={4} animationDuration={900} stroke="var(--color-surface-card)" strokeWidth={2}>
              {filas.map((f) => (
                <Cell key={f.servicioId} fill={COLOR_SERVICIO[f.servicioId]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const f = payload?.[0]?.payload as FilaRanking | undefined
                if (!active || !f) return null
                return (
                  <ChartTooltip
                    titulo={f.etiqueta}
                    filas={[
                      { etiqueta: 'Ingresos', valor: formatearMonedaEntera(f.ingresos) },
                      { etiqueta: 'Pasajes', valor: f.pasajes },
                      { etiqueta: 'Participación', valor: formatearPorcentaje(f.participacion) },
                    ]}
                  />
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-text-500">Total</span>
          <span className="font-display text-base font-semibold tabular-nums text-text-900">{formatearMonedaEntera(total)}</span>
        </div>
      </div>
      <ul className="mt-4 space-y-3" aria-label="Leyenda por servicio">
        {filas.map((f) => (
          <li key={f.servicioId} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 font-medium text-text-900">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_SERVICIO[f.servicioId] }} aria-hidden="true" />
                {f.etiqueta}
              </span>
              <span className="tabular-nums text-text-500">
                {formatearMoneda(f.ingresos)} · <span className="font-semibold text-text-900">{formatearPorcentaje(f.participacion)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border" aria-hidden="true">
              <div
                className="h-full origin-left rounded-full transition-transform duration-700 ease-[var(--ease-premium)]"
                style={{ background: COLOR_SERVICIO[f.servicioId], transform: `scaleX(${Math.max(0, Math.min(1, f.participacion / 100))})` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
