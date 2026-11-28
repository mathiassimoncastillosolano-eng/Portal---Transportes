import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Armchair, Building2, CalendarDays, Globe2, Map as MapIcon, Minus, Receipt, Ticket, Wallet } from 'lucide-react'
import type { Canal, Totales, VentasDia } from './modelo'
import { participacion, resumir, variacion } from './modelo'
import { datosOperacionEjemplo, ocupacionTotal } from './datosOperacionEjemplo'
import { serviciosGlobalesEjemplo } from './datosDetalleEjemplo'
import { IncidenciasResumen, PanoramaRutas, SalidasImpulso } from './OperacionDashboard'
import { DetalleCanal } from './DetalleCanal'
import { TemaComercial } from './TemaComercial'
import './comparacion-canales.css'

type Periodo = 7 | 30 | 90
type MetricaCanal = 'pasajes' | 'ingresos'
type Vista = Canal | 'rutas' | null

interface Props {
  dias: VentasDia[]
  fechaCorte: string
  modoEjemplo?: boolean
  integrado?: boolean
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const precio = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
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

function ticket(totales: Totales): number {
  return totales.pasajes === 0 ? 0 : totales.ingresos / totales.pasajes
}

function Cambio({ valor, oscuro = false, unidad = '%', prefijo = '' }: { valor: number | null; oscuro?: boolean; unidad?: '%' | 'pp'; prefijo?: string }) {
  const Icono = valor === null || Math.abs(valor) < 0.05 ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight
  const texto = valor === null ? 'Sin comparación' : `${prefijo}${valor > 0 ? '+' : ''}${valor.toFixed(1)} ${unidad === 'pp' ? 'pp' : '%'} vs. período anterior`
  const color = oscuro ? 'text-emerald-200' : valor !== null && valor < 0 ? 'text-red-600' : 'text-accent-text'
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}><Icono size={15} aria-hidden="true" />{texto}</span>
}

function Indicador({ titulo, valor, cambio, unidad = '%', nota, icono, principal = false, acento = 'var(--canal-web)' }: {
  titulo: string
  valor: string
  cambio?: number | null
  unidad?: '%' | 'pp'
  nota?: string
  icono: ReactNode
  principal?: boolean
  acento?: string
}) {
  const estilo = principal ? undefined : {
    borderColor: `color-mix(in srgb, ${acento} 28%, var(--color-border))`,
    backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${acento} 10%, transparent), transparent 55%)`,
  }
  return (
    <article className={`relative flex min-h-40 flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${principal ? 'comercial-indicador-principal text-white' : 'bg-surface-card text-text-900'}`} style={estilo}>
      {!principal && <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: acento }} aria-hidden="true" />}
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.1em] ${principal ? 'text-white/85' : 'text-text-500'}`}>{titulo}</p>
        <span className={`flex size-10 items-center justify-center rounded-xl ${principal ? 'bg-white/15 text-white' : ''}`} style={principal ? undefined : { backgroundColor: `color-mix(in srgb, ${acento} 16%, transparent)`, color: acento }}>{icono}</span>
      </div>
      <div>
        <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">{valor}</p>
        <div className="mt-3">{cambio !== undefined && <Cambio valor={cambio} oscuro={principal} unidad={unidad} />}{nota && <span className="mt-1 block text-xs text-text-500">{nota}</span>}</div>
      </div>
    </article>
  )
}

function CanalCard({ nombre, icono, color, valor, total, anterior, totalAnterior, metrica, onVerDetalles }: {
  nombre: string
  icono: ReactNode
  color: string
  valor: Totales
  total: Totales
  anterior: Totales
  totalAnterior: Totales
  metrica: MetricaCanal
  onVerDetalles: () => void
}) {
  const porcentaje = participacion(valor[metrica], total[metrica])
  const porcentajeAnterior = totalAnterior[metrica] === 0 ? null : participacion(anterior[metrica], totalAnterior[metrica])
  const datos = [
    { etiqueta: 'Pasajes', valor: numero.format(valor.pasajes) },
    { etiqueta: 'Ingresos netos', valor: moneda.format(valor.ingresos) },
    { etiqueta: 'Ticket promedio', valor: precio.format(ticket(valor)) },
  ]

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-surface-card shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ borderColor: `color-mix(in srgb, ${color} 35%, var(--color-border))` }}>
      <div className="p-5 pb-4" style={{ backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, transparent), color-mix(in srgb, ${color} 4%, transparent))` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${nombre === 'Web' ? 'text-on-cta' : 'text-white'}`} style={{ backgroundColor: color }}>{icono}</span>
          <div>
            <h3 className="font-display text-lg font-semibold text-text-900">{nombre}</h3>
            <p className="text-xs text-text-500">Participación en {metrica}</p>
          </div>
        </div>
        <span className="shrink-0 whitespace-nowrap font-display text-3xl font-bold tabular-nums" style={{ color }}>{porcentaje.toFixed(1)} %</span>
      </div>
      <div className="comparacion-canal-pista mt-4" aria-hidden="true">
        <div className="comparacion-canal-barra" style={{ width: `${porcentaje}%`, '--barra-color': color } as CSSProperties} />
      </div>
      <div className="mt-2"><Cambio valor={porcentajeAnterior === null ? null : porcentaje - porcentajeAnterior} unidad="pp" prefijo="Participación " /></div>
      </div>
      <div className="flex flex-1 flex-col p-5 pt-4">
        <dl className="grid grid-cols-3 gap-3">
          {datos.map((dato) => <div key={dato.etiqueta} className="rounded-xl bg-surface-sunken px-3 py-2.5"><dt className="text-xs text-text-500">{dato.etiqueta}</dt><dd className="mt-1 text-base font-semibold tabular-nums text-text-900 sm:text-lg">{dato.valor}</dd></div>)}
        </dl>
        <div className="mt-3"><Cambio valor={variacion(valor[metrica], anterior[metrica])} prefijo={metrica === 'pasajes' ? 'Pasajes ' : 'Ingresos '} /></div>
        <button type="button" onClick={onVerDetalles}
          className={`group mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition duration-200 hover:shadow-md hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 ${nombre === 'Web' ? 'text-on-cta' : 'text-white'}`}
          style={{ backgroundColor: color, outlineColor: color }}>
          Ver detalles de {nombre}<ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}

interface PuntoTendencia {
  fecha: string
  Web: number
  Agencia: number
  WebAnterior: number | null
  AgenciaAnterior: number | null
}

const nombresSerie: Record<string, string> = {
  Web: 'Web', Agencia: 'Agencia', WebAnterior: 'Web · período anterior', AgenciaAnterior: 'Agencia · período anterior',
}

/** Serie diaria del período; con 30 o 90 días usa el promedio de los últimos 7 días para ver la tendencia. */
function serieTendencia(dias: VentasDia[], periodo: Periodo, metrica: MetricaCanal, suavizado: boolean): PuntoTendencia[] {
  const valor = (dia: VentasDia, canal: 'web' | 'agencia') => metrica === 'pasajes'
    ? (canal === 'web' ? dia.webPasajes : dia.agenciaPasajes)
    : (canal === 'web' ? dia.webIngresos : dia.agenciaIngresos)
  const medir = (indice: number, canal: 'web' | 'agencia') => {
    if (indice < 0) return null
    const ventana = suavizado ? dias.slice(Math.max(0, indice - 6), indice + 1) : [dias[indice]]
    const promedio = ventana.reduce((suma, dia) => suma + valor(dia, canal), 0) / ventana.length
    return Math.round(promedio * 10) / 10
  }
  const inicio = dias.length - periodo
  return dias.slice(inicio).map((dia, i) => ({
    fecha: dia.fecha,
    Web: medir(inicio + i, 'web') ?? 0,
    Agencia: medir(inicio + i, 'agencia') ?? 0,
    WebAnterior: medir(inicio + i - periodo, 'web'),
    AgenciaAnterior: medir(inicio + i - periodo, 'agencia'),
  }))
}

function Encabezado({ integrado }: { integrado: boolean }) {
  if (integrado) return null
  return (
    <header className="border-b border-border bg-surface-card">
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
    </header>
  )
}

function SelectorPeriodo({ periodo, onChange }: { periodo: Periodo; onChange: (periodo: Periodo) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm font-medium shadow-sm">
      <CalendarDays size={16} className="text-text-500" aria-hidden="true" />
      <span>Período</span>
      <select value={periodo} onChange={(evento) => onChange(Number(evento.target.value) as Periodo)} className="cursor-pointer bg-transparent font-semibold outline-none" aria-label="Período">
        <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option>
      </select>
    </label>
  )
}

export function DashboardComercial({ dias, fechaCorte, modoEjemplo = false, integrado = false }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(30)
  const [metrica, setMetrica] = useState<MetricaCanal>('pasajes')
  const [vista, setVista] = useState<Vista>(null)

  const datos = useMemo(() => [...dias].sort((a, b) => a.fecha.localeCompare(b.fecha)), [dias])
  const actual = datos.slice(-periodo)
  const anterior = datos.slice(-periodo * 2, -periodo)
  const hoy = resumir(actual)
  const antes = resumir(anterior)
  const operacion = datosOperacionEjemplo(periodo, hoy.total, hoy.agencia, serviciosGlobalesEjemplo(hoy.web, hoy.agencia))
  const ocupacion = ocupacionTotal(operacion)
  const suavizado = periodo > 7
  const serie = serieTendencia(datos, periodo, metrica, suavizado)
  const ocupacionAnterior = hoy.total.pasajes === 0 ? null : Math.min(100, ocupacion.porcentaje * (antes.total.pasajes / hoy.total.pasajes))
  const lider = hoy.web[metrica] >= hoy.agencia[metrica] ? 'Web' : 'Agencia'
  const participacionLider = participacion(Math.max(hoy.web[metrica], hoy.agencia[metrica]), hoy.total[metrica])
  const diferenciaCanales = Math.abs(hoy.web[metrica] - hoy.agencia[metrica])
  const inicio = actual[0]?.fecha ?? fechaCorte
  const Contenedor = integrado ? 'div' : 'main'
  const claseContenedor = integrado ? 'mx-auto w-full max-w-[1400px] space-y-7' : 'mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8'

  if (vista === 'web' || vista === 'agencia') {
    return (
      <DetalleCanal
        canal={vista}
        onClose={() => setVista(null)}
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        totales={vista === 'web' ? hoy.web : hoy.agencia}
        anteriores={vista === 'web' ? antes.web : antes.agencia}
        otroCanal={vista === 'web' ? hoy.agencia : hoy.web}
        integrado={integrado}
      />
    )
  }

  if (vista === 'rutas') {
    return (
      <div className={integrado ? 'text-text-900' : 'min-h-screen bg-surface text-text-900'}>
        <Encabezado integrado={integrado} />
        <Contenedor className={claseContenedor}>
          <button type="button" onClick={() => setVista(null)} className="inline-flex items-center gap-2 text-sm font-semibold text-accent-text hover:underline"><ArrowLeft size={17} aria-hidden="true" />Volver al resumen</button>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-text"><MapIcon size={16} aria-hidden="true" />Panorama operativo</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Rutas y ocupación</h1>
              <p className="mt-2 text-sm text-text-500">Ingresos por servicio y ruta, y ocupación de las salidas de ambos canales.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {modoEjemplo && <span className="rounded-full bg-warning-50 px-3 py-1.5 text-xs font-bold text-warning-text">Datos de ejemplo</span>}
              <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
            </div>
          </div>
          <PanoramaRutas datos={operacion} periodo={periodo} />
        </Contenedor>
      </div>
    )
  }

  return (
    <div className={integrado ? 'text-text-900' : 'min-h-screen bg-surface text-text-900'}>
      <Encabezado integrado={integrado} />

      <Contenedor className={claseContenedor}>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Resumen de ventas</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Resultados comerciales</h1>
            <p className="mt-2 text-sm text-text-500">Del {fechaVisible(inicio)} al {fechaVisible(fechaCorte)} · comparación con los {periodo} días anteriores.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {modoEjemplo && <span className="rounded-full bg-warning-50 px-3 py-1.5 text-xs font-bold text-warning-text">Datos de ejemplo</span>}
            <SelectorPeriodo periodo={periodo} onChange={setPeriodo} />
          </div>
        </div>

        <section aria-label="Indicadores comerciales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador titulo="Ingresos netos" valor={moneda.format(hoy.total.ingresos)} cambio={variacion(hoy.total.ingresos, antes.total.ingresos)} icono={<Wallet size={19} />} principal />
          <Indicador titulo="Pasajes vendidos" valor={numero.format(hoy.total.pasajes)} cambio={variacion(hoy.total.pasajes, antes.total.pasajes)} icono={<Ticket size={19} />} acento="#7c5cd6" />
          <Indicador titulo="Ticket promedio" valor={precio.format(ticket(hoy.total))} cambio={variacion(ticket(hoy.total), ticket(antes.total))} icono={<Receipt size={19} />} acento="#e08a3c" />
          <Indicador titulo="Ocupación" valor={`${ocupacion.porcentaje.toFixed(1)} %`} cambio={ocupacionAnterior === null ? null : ocupacion.porcentaje - ocupacionAnterior} unidad="pp" nota={`${numero.format(ocupacion.vendidos)} de ${numero.format(ocupacion.capacidad)} asientos`} icono={<Armchair size={19} />} acento="#1597b8" />
        </section>

        <section aria-labelledby="canales-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-text">Canales de venta</p>
              <h2 id="canales-titulo" className="mt-1 font-display text-2xl font-bold">{metrica === 'pasajes' ? '¿Qué canal vendió más pasajes?' : '¿Qué canal generó más ingresos?'}</h2>
              <p className="mt-1 text-sm text-text-500">{diferenciaCanales === 0 ? 'Ambos canales registraron la misma cifra.' : <><strong className="text-text-900">{lider}</strong> lidera con el <strong className="text-text-900">{participacionLider.toFixed(1)} %</strong> del total: {cifra(diferenciaCanales, metrica)}{metrica === 'pasajes' ? ' pasajes' : ''} más que el otro canal.</>}</p>
            </div>
            <div className="inline-flex rounded-xl border border-border bg-surface-sunken p-1" role="group" aria-label="Métrica de comparación">
              {(['pasajes', 'ingresos'] as const).map((opcion) => (
                <button key={opcion} type="button" onClick={() => setMetrica(opcion)} aria-pressed={metrica === opcion} className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-colors ${metrica === opcion ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900'}`}>{opcion}</button>
              ))}
            </div>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <CanalCard nombre="Web" icono={<Globe2 size={20} />} color="var(--canal-web)" valor={hoy.web} total={hoy.total} anterior={antes.web} totalAnterior={antes.total} metrica={metrica} onVerDetalles={() => setVista('web')} />
            <CanalCard nombre="Agencia" icono={<Building2 size={20} />} color="var(--canal-agencia)" valor={hoy.agencia} total={hoy.total} anterior={antes.agencia} totalAnterior={antes.total} metrica={metrica} onVerDetalles={() => setVista('agencia')} />
          </div>
        </section>

        <section aria-labelledby="tendencia-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="tendencia-titulo" className="font-display text-xl font-bold">Tendencia por canal</h2>
              <p className="mt-1 text-sm text-text-500">{metrica === 'pasajes' ? 'Pasajes vendidos' : 'Ingresos netos'} por día{suavizado ? ' · promedio de los últimos 7 días' : ''}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-text-700">
              <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--canal-web)' }} />Web</span>
              <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded-full" style={{ backgroundColor: 'var(--canal-agencia)' }} />Agencia</span>
              <span className="flex items-center gap-1.5 text-text-500"><i className="w-4 border-t-2 border-dashed border-text-400" />Período anterior</span>
            </div>
          </div>
          <div className="mt-6 h-72" role="img" aria-label={`Tendencia de ${metrica} para Web y Agencia comparada con el período anterior`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" tickFormatter={(fecha: string) => fechaVisible(fecha).replace(/ 2026$/, '')} tick={{ fill: 'var(--color-text-500)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis tickFormatter={(valor: number) => metrica === 'ingresos' ? `S/ ${compacto.format(valor)}` : compacto.format(valor)} tick={{ fill: 'var(--color-text-500)', fontSize: 11 }} tickLine={false} axisLine={false} width={64} />
                <Tooltip labelFormatter={(fecha) => fechaVisible(String(fecha))} formatter={(valor, nombre) => [cifra(Number(valor), metrica), nombresSerie[String(nombre)] ?? nombre]} />
                <Line dataKey="WebAnterior" type="monotone" stroke="var(--canal-web)" strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                <Line dataKey="AgenciaAnterior" type="monotone" stroke="var(--canal-agencia)" strokeOpacity={0.45} strokeDasharray="5 4" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                <Line dataKey="Web" type="monotone" stroke="var(--canal-web)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
                <Line dataKey="Agencia" type="monotone" stroke="var(--canal-agencia)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <SalidasImpulso datos={operacion} />

        <IncidenciasResumen datos={operacion} periodo={periodo} />

        <button type="button" onClick={() => setVista('rutas')} className="flex w-full items-center gap-4 rounded-2xl border border-border bg-surface-card p-5 text-left shadow-sm transition-colors hover:bg-surface-sunken sm:p-6">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-text"><MapIcon size={20} aria-hidden="true" /></span>
          <span className="min-w-0"><span className="block font-display text-lg font-bold text-text-900">Ver rutas y ocupación</span><span className="block text-sm text-text-500">Ocupación por ruta, rutas de mayor ingreso y distribución por servicio.</span></span>
          <ArrowRight size={20} className="ml-auto shrink-0 text-text-500" aria-hidden="true" />
        </button>

        <p className="text-xs text-text-500">{modoEjemplo ? 'Esta vista usa cifras simuladas para revisar el diseño. No representa ventas registradas en la base de datos.' : 'Los resultados se calculan con ventas confirmadas de ambos canales.'}</p>
      </Contenedor>
    </div>
  )
}
