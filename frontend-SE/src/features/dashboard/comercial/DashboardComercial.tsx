import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowRight, ArrowUpRight, Building2, CalendarDays, Globe2, Minus, ShoppingBag, Ticket, Wallet } from 'lucide-react'
import type { Totales, VentasDia } from './modelo'
import { participacion, resumir, variacion } from './modelo'
import { datosOperacionEjemplo } from './datosOperacionEjemplo'
import { serviciosGlobalesEjemplo } from './datosDetalleEjemplo'
import { OperacionDashboard } from './OperacionDashboard'
import { DetalleCanal } from './DetalleCanal'
import { TemaComercial } from './TemaComercial'
import './comparacion-canales.css'

type Periodo = 7 | 30 | 90
type MetricaCanal = 'pasajes' | 'ingresos'

interface Props {
  dias: VentasDia[]
  fechaCorte: string
  modoEjemplo?: boolean
  integrado?: boolean
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('es-PE')
const compacto = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })

function fechaVisible(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function cifra(valor: number, metrica: MetricaCanal): string {
  return metrica === 'ingresos' ? moneda.format(valor) : numero.format(valor)
}

function Cambio({ valor, oscuro = false }: { valor: number | null; oscuro?: boolean }) {
  const Icono = valor === null || valor === 0 ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight
  const texto = valor === null ? 'Sin comparación' : `${valor > 0 ? '+' : ''}${valor.toFixed(1)} % vs. período anterior`
  const color = oscuro ? 'text-emerald-200' : valor !== null && valor < 0 ? 'text-red-600' : 'text-accent-text'
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}><Icono size={15} aria-hidden="true" />{texto}</span>
}

function Indicador({ titulo, valor, cambio, icono, principal = false }: {
  titulo: string
  valor: string
  cambio: number | null
  icono: ReactNode
  principal?: boolean
}) {
  return (
    <article className={`flex min-h-44 flex-col justify-between rounded-2xl border p-5 shadow-sm ${principal ? 'comercial-indicador-principal text-white' : 'border-border bg-surface-card text-text-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${principal ? 'text-white/85' : 'text-text-500'}`}>{titulo}</p>
        <span className={`rounded-xl p-2 ${principal ? 'bg-white/15 text-white' : 'bg-accent-50 text-accent-text'}`}>{icono}</span>
      </div>
      <div>
        <p className="font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{valor}</p>
        <div className="mt-3"><Cambio valor={cambio} oscuro={principal} /></div>
      </div>
    </article>
  )
}

function ComparacionCanales({ web, agencia, metrica }: { web: Totales; agencia: Totales; metrica: MetricaCanal }) {
  const total = web[metrica] + agencia[metrica]
  const canales = [
    { nombre: 'Web', valor: web[metrica], color: 'var(--color-accent-500)' },
    { nombre: 'Agencia', valor: agencia[metrica], color: 'var(--color-route-500)' },
  ]

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface-sunken p-4 sm:p-5" role="img" aria-label={`Comparación de ${metrica}: Web ${cifra(web[metrica], metrica)}, Agencia ${cifra(agencia[metrica], metrica)}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-500">Comparación del período</p>
      <div className="mt-4 space-y-5">
        {canales.map((canal) => {
          const porcentaje = participacion(canal.valor, total)
          return (
            <div key={canal.nombre}>
              <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="font-semibold text-text-900">{canal.nombre}</span>
                <span className="flex flex-wrap items-baseline justify-between gap-x-2 tabular-nums text-text-900"><strong>{cifra(canal.valor, metrica)}{metrica === 'pasajes' ? ' pasajes' : ''}</strong><span className="text-xs text-text-500">{porcentaje.toFixed(1)} % del total</span></span>
              </div>
              <div className="comparacion-canal-pista mt-2" aria-hidden="true">
                <div className="comparacion-canal-barra" style={{ width: `${porcentaje}%`, '--barra-color': canal.color } as CSSProperties} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CanalCard({ nombre, icono, color, valor, total, anterior, metrica, onVerDetalles }: {
  nombre: string
  icono: ReactNode
  color: string
  valor: Totales
  total: Totales
  anterior: Totales
  metrica: MetricaCanal
  onVerDetalles: () => void
}) {
  const porcentaje = participacion(valor[metrica], total[metrica])
  return (
    <article className="rounded-2xl border border-border bg-surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${nombre === 'Web' ? 'text-on-cta' : 'text-white'}`} style={{ backgroundColor: color }}>{icono}</span>
          <div>
            <h3 className="font-display text-lg font-semibold text-text-900">{nombre}</h3>
            <p className="text-xs text-text-500">Canal de venta</p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap font-display text-xl font-bold tabular-nums text-text-900 sm:text-2xl">{porcentaje.toFixed(1)} %</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
        <div><p className="text-xs text-text-500">Pasajes</p><p className="mt-1 text-lg font-semibold tabular-nums text-text-900">{numero.format(valor.pasajes)}</p></div>
        <div><p className="text-xs text-text-500">Ingresos netos</p><p className="mt-1 text-lg font-semibold tabular-nums text-text-900">{moneda.format(valor.ingresos)}</p></div>
      </div>
      <div className="mt-3"><Cambio valor={variacion(valor[metrica], anterior[metrica])} /></div>
      <button type="button" onClick={onVerDetalles} className="mt-5 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-900 transition-colors hover:bg-surface-sunken sm:text-sm">Ver detalles de {nombre}<ArrowRight size={16} aria-hidden="true" /></button>
    </article>
  )
}

export function DashboardComercial({ dias, fechaCorte, modoEjemplo = false, integrado = false }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [metrica, setMetrica] = useState<MetricaCanal>('pasajes')
  const [canalAbierto, setCanalAbierto] = useState<'web' | 'agencia' | null>(null)

  const datos = useMemo(() => [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha)), [dias])
  const actual = datos.slice(-periodo)
  const anterior = datos.slice(-periodo * 2, -periodo)
  const hoy = resumir(actual)
  const antes = resumir(anterior)
  const operacion = datosOperacionEjemplo(periodo, hoy.total, hoy.agencia, serviciosGlobalesEjemplo(hoy.web, hoy.agencia))
  const serie = actual.map((dia) => ({
    fecha: dia.fecha,
    Web: metrica === 'pasajes' ? dia.webPasajes : dia.webIngresos,
    Agencia: metrica === 'pasajes' ? dia.agenciaPasajes : dia.agenciaIngresos,
  }))
  const lider = hoy.web[metrica] >= hoy.agencia[metrica] ? 'Web' : 'Agencia'
  const participacionLider = participacion(Math.max(hoy.web[metrica], hoy.agencia[metrica]), hoy.total[metrica])
  const diferenciaCanales = Math.abs(hoy.web[metrica] - hoy.agencia[metrica])
  const inicio = actual[0]?.fecha ?? fechaCorte
  const Contenedor = integrado ? 'div' : 'main'

  if (canalAbierto) {
    return <DetalleCanal canal={canalAbierto} onClose={() => setCanalAbierto(null)} periodo={periodo} onPeriodoChange={setPeriodo} totales={canalAbierto === 'web' ? hoy.web : hoy.agencia} integrado={integrado} />
  }

  return (
    <div className={integrado ? 'text-text-900' : 'min-h-screen bg-surface text-text-900'}>
      {!integrado && <header className="border-b border-border bg-surface-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-ink-950 font-display text-sm font-bold text-accent-400">RL</span>
            <div><p className="font-display text-base font-bold leading-tight">RutaLibre</p><p className="text-xs text-text-500">Sistema Empresarial · Gerencia</p></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-border bg-surface-sunken px-3 py-1.5 text-xs font-medium text-text-700">Dashboard comercial</span>
            <TemaComercial />
          </div>
        </div>
      </header>}

      <Contenedor className={integrado ? 'mx-auto w-full max-w-[1400px] space-y-7' : 'mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8'}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Resumen de ventas</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Resultados comerciales</h1>
            <p className="mt-2 text-sm text-text-500">Del {fechaVisible(inicio)} al {fechaVisible(fechaCorte)} · comparación con los {periodo} días anteriores.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modoEjemplo && <span className="rounded-full bg-warning-50 px-3 py-1.5 text-xs font-bold text-warning-text">Datos de ejemplo</span>}
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm font-medium shadow-sm">
              <CalendarDays size={16} className="text-text-500" aria-hidden="true" />
              <span>Período</span>
              <select value={periodo} onChange={(evento) => setPeriodo(Number(evento.target.value) as Periodo)} className="cursor-pointer bg-transparent font-semibold outline-none" aria-label="Período">
                <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option>
              </select>
            </label>
          </div>
        </div>

        {modoEjemplo && <p className="rounded-xl border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-text">Vista de ejemplo: estas cifras son ficticias y no representan ventas reales.</p>}

        <section aria-label="Indicadores comerciales" className="grid gap-4 md:grid-cols-3">
          <Indicador titulo="Ingresos netos" valor={moneda.format(hoy.total.ingresos)} cambio={variacion(hoy.total.ingresos, antes.total.ingresos)} icono={<Wallet size={19} />} principal />
          <Indicador titulo="Pasajes vendidos" valor={numero.format(hoy.total.pasajes)} cambio={variacion(hoy.total.pasajes, antes.total.pasajes)} icono={<Ticket size={19} />} />
          <Indicador titulo="Compras realizadas" valor={numero.format(hoy.total.compras)} cambio={variacion(hoy.total.compras, antes.total.compras)} icono={<ShoppingBag size={19} />} />
        </section>

        <section aria-labelledby="canales-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-text">Canales de venta</p><h2 id="canales-titulo" className="mt-1 font-display text-2xl font-bold">{metrica === 'pasajes' ? '¿Qué canal vendió más pasajes?' : '¿Qué canal generó más ingresos?'}</h2><p className="mt-1 text-sm text-text-500">Web frente a Agencia · ventas registradas durante el período seleccionado.</p></div>
            <div className="inline-flex rounded-xl border border-border bg-surface-sunken p-1" role="group" aria-label="Métrica de comparación">
              <button type="button" onClick={() => setMetrica('pasajes')} aria-pressed={metrica === 'pasajes'} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${metrica === 'pasajes' ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900'}`}>Pasajes</button>
              <button type="button" onClick={() => setMetrica('ingresos')} aria-pressed={metrica === 'ingresos'} className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${metrica === 'ingresos' ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900'}`}>Ingresos</button>
            </div>
          </div>
          <ComparacionCanales web={hoy.web} agencia={hoy.agencia} metrica={metrica} />
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CanalCard nombre="Web" icono={<Globe2 size={20} />} color="var(--color-accent-500)" valor={hoy.web} total={hoy.total} anterior={antes.web} metrica={metrica} onVerDetalles={() => setCanalAbierto('web')} />
            <CanalCard nombre="Agencia" icono={<Building2 size={20} />} color="var(--color-route-500)" valor={hoy.agencia} total={hoy.total} anterior={antes.agencia} metrica={metrica} onVerDetalles={() => setCanalAbierto('agencia')} />
          </div>
          <p className="mt-5 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-text-700">{diferenciaCanales === 0 ? 'Ambos canales registraron la misma cifra.' : <><strong>{lider}</strong> lidera con el <strong>{participacionLider.toFixed(1)} %</strong> del total: <strong>{cifra(diferenciaCanales, metrica)}</strong> {metrica === 'pasajes' ? 'pasajes' : 'en ingresos'} más que el otro canal.</>}</p>
        </section>

        <section aria-labelledby="tendencia-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="tendencia-titulo" className="font-display text-xl font-bold">Evolución diaria por canal</h2><p className="mt-1 text-sm text-text-500">{metrica === 'pasajes' ? 'Pasajes vendidos' : 'Ingresos netos'} por fecha de compra</p></div><div className="flex gap-4 text-xs font-semibold text-text-700"><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent-500" />Web</span><span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-route-500" />Agencia</span></div></div>
          <div className="mt-6 h-72" role="img" aria-label={`Gráfico de evolución diaria de ${metrica} para Web y Agencia`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={(fecha: string) => fechaVisible(fecha).replace(/ 2026$/, '')} tick={{ fill: 'var(--color-text-500)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={(valor: number) => metrica === 'ingresos' ? `S/ ${compacto.format(valor)}` : compacto.format(valor)} tick={{ fill: 'var(--color-text-500)', fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip labelFormatter={(fecha) => fechaVisible(String(fecha))} formatter={(valor, nombre) => [cifra(Number(valor), metrica), nombre]} />
                <Area dataKey="Web" type="monotone" stroke="var(--color-accent-500)" fill="var(--color-accent-500)" fillOpacity={0.08} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Area dataKey="Agencia" type="monotone" stroke="var(--color-route-500)" fill="var(--color-route-500)" fillOpacity={0.06} strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <OperacionDashboard datos={operacion} periodo={periodo} />

        <p className="text-xs text-text-500">{modoEjemplo ? 'Esta vista usa cifras simuladas para revisar el diseño. No representa ventas registradas en la base de datos.' : 'Los resultados se calculan con ventas confirmadas de ambos canales.'}</p>
      </Contenedor>
    </div>
  )
}
