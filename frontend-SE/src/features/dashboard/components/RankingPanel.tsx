import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Table, type TableColumn } from '@/components/ui/Table'
import { formatearMoneda, formatearMonedaEntera, formatearNumero, formatearPorcentaje } from '@/utils/formato'
import { totalRanking, type FilaRanking } from '../utils/agregaciones'
import { ChartCard } from './ChartCard'
import { COLOR_GRILLA, EJE } from '../utils/estiloGraficos'
import { ChartTooltip } from './ChartTooltip'

interface RankingPanelProps {
  title: string
  description: string
  encabezado: string
  filas: FilaRanking[]
  cargando: boolean
  error: boolean
  onRetry: () => void
  hayVentas: boolean
  /** Etiqueta corta para el eje del gráfico. */
  etiquetaCorta?: (etiqueta: string) => string
  anchoEtiqueta?: number
}

const compacto = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })

/** Ranking agregado: gráfico de barras horizontales + tabla ordenable con totales (misma fuente, mismas sumas). */
export function RankingPanel({
  title,
  description,
  encabezado,
  filas,
  cargando,
  error,
  onRetry,
  hayVentas,
  etiquetaCorta = (e) => e,
  anchoEtiqueta = 120,
}: RankingPanelProps) {
  const total = totalRanking(filas)
  const columnas: TableColumn<FilaRanking>[] = [
    { key: 'etiqueta', header: encabezado, sortable: true, sortValue: (f) => f.etiqueta, cell: (f) => <span className="font-medium text-text-900">{f.etiqueta}</span> },
    { key: 'ingresos', header: 'Ingresos', align: 'right', sortable: true, sortValue: (f) => f.ingresos, cell: (f) => formatearMoneda(f.ingresos) },
    { key: 'pasajes', header: 'Pasajes', align: 'right', sortable: true, sortValue: (f) => f.pasajes, cell: (f) => formatearNumero(f.pasajes) },
    { key: 'ticket', header: 'Ticket prom.', align: 'right', sortable: true, sortValue: (f) => f.ticket, cell: (f) => formatearMoneda(f.ticket) },
    { key: 'participacion', header: 'Part.', align: 'right', sortable: true, sortValue: (f) => f.participacion, cell: (f) => formatearPorcentaje(f.participacion) },
  ]

  return (
    <ChartCard
      title={title}
      description={description}
      cargando={cargando}
      error={error}
      onRetry={onRetry}
      vacio={!hayVentas}
      alto={320}
      resumen={`Ranking por ingresos: ${filas.slice(0, 3).map((f) => `${f.etiqueta} ${formatearMoneda(f.ingresos)}`).join('; ')}.`}
    >
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={Math.max(160, filas.length * 34 + 24)}>
          <BarChart data={filas} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={COLOR_GRILLA} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => `S/ ${compacto.format(v)}`} tick={EJE} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="etiqueta" tickFormatter={etiquetaCorta} tick={EJE} tickLine={false} axisLine={false} width={anchoEtiqueta} />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-sunken)' }}
              content={({ active, payload }) => {
                const f = payload?.[0]?.payload as FilaRanking | undefined
                if (!active || !f) return null
                return (
                  <ChartTooltip
                    titulo={f.etiqueta}
                    filas={[
                      { etiqueta: 'Ingresos', valor: formatearMonedaEntera(f.ingresos) },
                      { etiqueta: 'Pasajes', valor: f.pasajes },
                    ]}
                  />
                )
              }}
            />
            <Bar dataKey="ingresos" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} barSize={14} animationDuration={800} animationEasing="ease-out" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="group mt-3 text-xs text-text-500">
        <summary className="cursor-pointer select-none font-medium text-text-700 transition-colors hover:text-text-900">Ver tabla de datos (ordenable)</summary>
        <div className="mt-3">
      <Table
        caption={`${title}: tabla de datos`}
        columns={columnas}
        rows={filas}
        rowKey={(f) => f.clave}
        defaultSort={{ key: 'ingresos', direction: 'desc' }}
        footer={
          <tr>
            <td className="px-4 py-2.5">Total</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatearMoneda(total.ingresos)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatearNumero(total.pasajes)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{formatearMoneda(total.ticket)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{filas.length ? '100,0%' : '—'}</td>
          </tr>
        }
      />
        </div>
      </details>
    </ChartCard>
  )
}
