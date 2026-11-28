import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Building2, CalendarClock, CalendarDays, CreditCard, Banknote, Smartphone, CalendarCheck, Clock, MapPin, Zap, Globe2, Minus, Repeat, RotateCcw, Star, Wallet } from 'lucide-react'
import type { Canal, Totales } from './modelo'
import { participacion, variacion } from './modelo'
import { ciudadesSalidaEjemplo, datosDetalleEjemplo } from './datosDetalleEjemplo'
import {
  anticipacionEjemplo, cambiosConDiferenciaEjemplo, comprasPorHorarioEjemplo, diasSemana, franjasHorarias,
  incidenciasCanalEjemplo, metodosPagoEjemplo, vendedoresEjemplo, type Segmento,
} from './datosCanalEjemplo'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { ConversionPortal } from './OperacionDashboard'
import { coloresInfografia, coloresRanking } from './paletaRanking'
import { TemaComercial } from './TemaComercial'

interface Props {
  canal: Canal
  onClose: () => void
  periodo: 7 | 30 | 90
  onPeriodoChange: (periodo: 7 | 30 | 90) => void
  totales: Totales
  anteriores: Totales
  otroCanal: Totales
  integrado?: boolean
}

interface Resumen {
  nombre: string
  ingresos: number
  pasajes: number
  viajes: number
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const precio = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
const numero = new Intl.NumberFormat('es-PE')
const decimal = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** neutral: comparación entre canales (no es mejora ni caída), se muestra en gris. */
function Variacion({ valor, texto, neutral = false }: { valor: number | null; texto: string; neutral?: boolean }) {
  const Icono = valor === null || Math.abs(valor) < 0.05 ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight
  const color = neutral ? 'text-text-500' : valor !== null && valor < 0 ? 'text-red-600' : 'text-accent-text'
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${color}`}><Icono size={15} aria-hidden="true" />{valor === null ? 'Sin comparación' : `${valor > 0 ? '+' : ''}${valor.toFixed(1)} % ${texto}`}</span>
}

function Indicador({ titulo, valor, pie }: { titulo: string; valor: string; pie: ReactNode }) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-500">{titulo}</p>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums text-text-900">{valor}</p>
      <div className="mt-2 text-xs text-text-500">{pie}</div>
    </article>
  )
}

function Tarjeta({ titulo, detalle, children, className = '' }: { titulo: string; detalle: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6 ${className}`}>
      <h2 className="font-display text-lg font-bold text-text-900">{titulo}</h2>
      <p className="mt-1 text-sm text-text-500">{detalle}</p>
      {children}
    </section>
  )
}

const iconosPago: Record<string, typeof CreditCard> = { Tarjeta: CreditCard, Yape: Smartphone, Efectivo: Banknote }
/** Cada medio tiene su color fijo: Yape morado, Tarjeta azul, Efectivo verde. */
const coloresPago: Record<string, string> = { Yape: '#7b3fc4', Tarjeta: '#1f78c8', Efectivo: '#2f9e5b' }
const colorPago = (nombre: string) => coloresPago[nombre] ?? '#6b7f8e'

function MetodosPago({ filas }: { filas: Segmento[] }) {
  const [activo, setActivo] = useState<number | null>(null)
  const total = filas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const principal = [...filas].sort((a, b) => b.ingresos - a.ingresos)[0]
  const IconoPrincipal = principal ? iconosPago[principal.nombre] ?? CreditCard : CreditCard
  const centro = activo === null ? null : filas[activo]
  const IconoCentro = centro ? iconosPago[centro.nombre] ?? CreditCard : Wallet

  return (
    <div className="mt-5 flex flex-1 flex-col">
      <div className="grid flex-1 items-stretch gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="relative mx-auto size-52 self-center" role="img" aria-label={filas.map((fila) => `${fila.nombre} ${participacion(fila.ingresos, total).toFixed(0)} %`).join(', ')}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={filas} dataKey="ingresos" nameKey="nombre" innerRadius="64%" outerRadius="100%" paddingAngle={3} stroke="none" isAnimationActive={false}
                onMouseEnter={(_, indice) => setActivo(indice)} onMouseLeave={() => setActivo(null)}>
                {filas.map((fila, indice) => <Cell key={fila.nombre} fill={colorPago(fila.nombre)} opacity={activo === null || activo === indice ? 1 : 0.35} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <IconoCentro size={18} style={{ color: centro ? colorPago(centro.nombre) : 'var(--color-text-500)' }} aria-hidden="true" />
            <span className="mt-0.5 font-display text-lg font-bold tabular-nums text-text-900">{centro ? `${participacion(centro.ingresos, total).toFixed(0)} %` : moneda.format(total)}</span>
            <span className="text-[11px] text-text-500">{centro ? centro.nombre : 'Total'}</span>
          </div>
        </div>
        <ul className="flex flex-col gap-2">
          {filas.map((fila, indice) => {
            const Icono = iconosPago[fila.nombre] ?? CreditCard
            const color = colorPago(fila.nombre)
            const cuota = participacion(fila.ingresos, total)
            return (
              <li key={fila.nombre} className="flex flex-1">
                <button type="button" onMouseEnter={() => setActivo(indice)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(indice)} onBlur={() => setActivo(null)}
                  className={`flex w-full flex-col justify-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${activo === indice ? 'bg-surface-sunken' : 'border-border'}`} style={activo === indice ? { borderColor: color } : undefined}>
                  <span className="flex w-full items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}><Icono size={20} aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-900">{fila.nombre}</span>
                      <span className="block text-xs tabular-nums text-text-500">{numero.format(fila.pasajes)} pasajes</span>
                    </span>
                    <span className="ml-auto font-display text-2xl font-bold tabular-nums" style={{ color }}>{cuota.toFixed(0)} %</span>
                  </span>
                  <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-sunken"><span className="block h-full rounded-full" style={{ width: `${cuota}%`, backgroundColor: color }} /></span>
                  <span className="text-xs tabular-nums text-text-700"><strong className="text-text-900">{moneda.format(fila.ingresos)}</strong> en ingresos</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {principal && (
        <div className="mt-auto pt-4"><p className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-xs text-text-700">
          <IconoPrincipal size={16} className="shrink-0" style={{ color: colorPago(principal.nombre) }} aria-hidden="true" />
          <span><strong className="text-text-900">{principal.nombre}</strong> es el medio más usado: {participacion(principal.ingresos, total).toFixed(0)} % de los ingresos.</span>
        </p></div>
      )}
    </div>
  )
}

function MapaHorario({ valores, color }: { valores: number[][]; color: string }) {
  const mayor = Math.max(...valores.flat(), 1)
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[360px] border-separate border-spacing-1 text-xs">
        <thead><tr><th scope="col" className="sr-only">Día</th>{franjasHorarias.map((franja) => <th key={franja} scope="col" className="pb-1 font-medium text-text-500">{franja}</th>)}</tr></thead>
        <tbody>
          {valores.map((fila, indice) => (
            <tr key={diasSemana[indice]}>
              <th scope="row" className="pr-2 text-left font-medium text-text-700">{diasSemana[indice]}</th>
              {fila.map((valor, columna) => {
                const intensidad = Math.round(22 + (valor / mayor) * 70)
                return <td key={franjasHorarias[columna]} className="h-9 rounded-md text-center font-semibold tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${color} ${intensidad}%, transparent)`, color: intensidad > 60 ? 'white' : 'var(--color-text-900)' }} title={`${diasSemana[indice]} ${franjasHorarias[columna]}: ${valor} pasajes`}>{valor}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Incidencia({ icono, titulo, valor, base, detalle }: { icono: ReactNode; titulo: string; valor: number; base: number; detalle: string }) {
  return (
    <li className="rounded-xl bg-surface-sunken p-4">
      <div className="flex items-center gap-2 text-sm text-text-700"><span style={{ color: 'var(--serie-neutra)' }}>{icono}</span>{titulo}</div>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text-900">{numero.format(valor)} <span className="text-sm font-semibold text-text-500">· {participacion(valor, base).toFixed(1)} %</span></p>
      <p className="mt-1 text-xs text-text-500">{detalle}</p>
    </li>
  )
}

function agrupar(filas: ReturnType<typeof datosDetalleEjemplo>, clave: 'ruta' | 'ciudadSalida'): Resumen[] {
  const grupos = new Map<string, Resumen>()
  for (const fila of filas) {
    const grupo = grupos.get(fila[clave]) ?? { nombre: fila[clave], ingresos: 0, pasajes: 0, viajes: 0 }
    grupo.ingresos += fila.ingresos
    grupo.pasajes += fila.pasajes
    grupo.viajes += fila.viajes
    grupos.set(fila[clave], grupo)
  }
  return [...grupos.values()].filter((grupo) => grupo.pasajes > 0).sort((a, b) => b.ingresos - a.ingresos)
}

/** Del más urgente (rojo) al más planificado (verde), con un icono por tramo. */
const tramosAnticipacion = [
  { Icono: Zap, color: '#e8572a' },
  { Icono: Clock, color: '#f2a516' },
  { Icono: CalendarDays, color: '#1597b8' },
  { Icono: CalendarCheck, color: '#1fae8f' },
]

function AnticipacionCompra({ filas, esWeb }: { filas: Segmento[]; esWeb: boolean }) {
  const total = filas.reduce((suma, fila) => suma + fila.pasajes, 0)
  const mayor = Math.max(...filas.map((fila) => fila.pasajes), 1)
  const principal = filas.reduce((max, fila) => (fila.pasajes > max.pasajes ? fila : max), filas[0])
  const indicePrincipal = filas.indexOf(principal)
  const IconoPrincipal = tramosAnticipacion[indicePrincipal]?.Icono ?? Zap

  return (
    <div className="mt-5 flex flex-1 flex-col">
      <ol className="grid grid-cols-4 items-end gap-3">
        {filas.map((fila, indice) => {
          const { Icono, color } = tramosAnticipacion[indice]
          const porcentaje = participacion(fila.pasajes, total)
          return (
            <li key={fila.nombre} className="flex flex-col items-center text-center" title={`${fila.nombre}: ${fila.pasajes} pasajes`}>
              <div className="flex h-36 w-full flex-col items-center justify-end">
                <span className="mb-1 font-display text-lg font-bold tabular-nums text-text-900">{porcentaje.toFixed(0)} %</span>
                <div className="w-full rounded-t-lg transition-[height] duration-500" style={{ height: `${Math.max((fila.pasajes / mayor) * 78, 5)}%`, backgroundColor: color }} />
              </div>
              <span className="mt-2 flex size-9 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)`, color }}><Icono size={18} aria-hidden="true" /></span>
              <span className="mt-1 text-xs font-semibold text-text-900">{fila.nombre}</span>
              <span className="text-[11px] tabular-nums text-text-500">{numero.format(fila.pasajes)} pasajes</span>
            </li>
          )
        })}
      </ol>
      <div className="mt-auto pt-4">
        <p className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-xs text-text-700">
          <IconoPrincipal size={16} className="shrink-0" style={{ color: tramosAnticipacion[indicePrincipal]?.color }} aria-hidden="true" />
          <span>La mayoría compra con <strong className="text-text-900">{principal.nombre.toLowerCase()}</strong> de anticipación ({participacion(principal.pasajes, total).toFixed(0)} %). {esWeb ? 'Conviene lanzar promociones con varios días de anticipación.' : 'Conviene reforzar el personal de mostrador en horas cercanas a la salida.'}</span>
        </p>
      </div>
    </div>
  )
}

/** Mapa de bloques: cada sede ocupa un espacio proporcional a sus ingresos. */

/**
 * Columnas con punta de flecha, piso en perspectiva y líneas guía hacia la leyenda.
 * La más alta va al centro, como en la referencia (orden 05 · 02 · 01 · 04 · 03).
 */
function VentasPorSede({ filas }: { filas: Resumen[] }) {
  const total = filas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const top = filas.slice(0, 5)
  const mayor = Math.max(...top.map((fila) => fila.ingresos), 1)
  const principales = filas.slice(0, 2)
  const cuotaPrincipales = participacion(principales.reduce((suma, fila) => suma + fila.ingresos, 0), total)
  const resto = filas.slice(5)
  const ingresosResto = resto.reduce((suma, fila) => suma + fila.ingresos, 0)

  // Columnas ordenadas de mayor a menor, repartidas en todo el ancho.
  const anchoLienzo = 1000
  const separacion = 44
  const ancho = (anchoLienzo - separacion * (top.length + 1)) / Math.max(top.length, 1)
  const base = 270
  const alturaMax = 200

  return (
    <div className="mt-4 flex flex-1 flex-col">
      <svg viewBox={`0 0 ${anchoLienzo} 330`} className="h-auto w-full" role="img" aria-label={top.map((fila, i) => `${String(i + 1).padStart(2, '0')} ${fila.nombre}: ${participacion(fila.ingresos, total).toFixed(0)} %`).join(', ')}>
        <line x1="0" y1={base} x2={anchoLienzo} y2={base} stroke="var(--color-border)" strokeWidth="2" />
        {top.map((fila, rank) => {
          const color = coloresInfografia[rank]
          const x = separacion + rank * (ancho + separacion)
          const alto = Math.max((fila.ingresos / mayor) * alturaMax, 86)
          const tope = base - alto
          const centroX = x + ancho / 2
          const cuota = participacion(fila.ingresos, total)
          return (
            <g key={fila.nombre}>
              <title>{`${fila.nombre}: ${moneda.format(fila.ingresos)} · ${fila.pasajes} pasajes`}</title>
              <text x={centroX} y={tope - 34} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{cuota.toFixed(0)} %</text>
              <text x={centroX} y={tope - 12} textAnchor="middle" fontSize="15" fill="var(--color-text-500)">{moneda.format(fila.ingresos)}</text>
              <polygon points={`${x},${tope + 24} ${centroX},${tope} ${x + ancho},${tope + 24} ${x + ancho},${base} ${x},${base}`} fill={color} />
              <polyline points={`${x + 18},${tope + 38} ${centroX},${tope + 18} ${x + ancho - 18},${tope + 38}`} fill="none" stroke="white" strokeWidth="4" strokeLinejoin="round" opacity="0.9" />
              <text x={centroX} y={tope + 72} textAnchor="middle" fill="white" fontSize="26" fontWeight="700">{String(rank + 1).padStart(2, '0')}</text>
              <g transform={`translate(${centroX}, ${base + 30})`}>
                <path d="M0 -12 a6 6 0 0 1 6 6 c0 4.5 -6 10.5 -6 10.5 s-6 -6 -6 -10.5 A6 6 0 0 1 0 -12 z" fill={color} transform={`translate(${-fila.nombre.length * 4.9 - 12}, 0)`} />
                <text x="6" y="4" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--color-text-900)">{fila.nombre}</text>
              </g>
              <text x={centroX} y={base + 52} textAnchor="middle" fontSize="13" fill="var(--color-text-500)">{numero.format(fila.pasajes)} pasajes</text>
            </g>
          )
        })}
      </svg>
      <div className="mt-auto pt-3">
        <p className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2.5 text-xs text-text-700">
          <MapPin size={16} className="shrink-0 text-text-500" aria-hidden="true" />
          <span>
            <strong className="text-text-900">{principales.map((fila) => fila.nombre).join(' y ')}</strong> concentran el {cuotaPrincipales.toFixed(0)} % de las ventas en mostrador.
            {resto.length > 0 && <> Además, {resto.length} {resto.length === 1 ? 'sede más suma' : 'sedes más suman'} {moneda.format(ingresosResto)} ({participacion(ingresosResto, total).toFixed(0)} %).</>}
          </span>
        </p>
      </div>
    </div>
  )
}

function RankingRutas({ filas }: { filas: Resumen[] }) {
  const [metrica, setMetrica] = useState<'ingresos' | 'pasajes'>('ingresos')
  const ordenadas = [...filas].sort((a, b) => b[metrica] - a[metrica]).slice(0, 6)
  const mayor = Math.max(...ordenadas.map((fila) => fila[metrica]), 1)
  const suma = filas.reduce((acumulado, fila) => acumulado + fila[metrica], 0)
  const formato = (valor: number) => metrica === 'ingresos' ? moneda.format(valor) : `${numero.format(valor)} pasajes`

  return (
    <>
      <div className="mt-4 inline-flex rounded-xl border border-border bg-surface-sunken p-1" role="group" aria-label="Ordenar ranking por">
        {(['ingresos', 'pasajes'] as const).map((opcion) => (
          <button key={opcion} type="button" onClick={() => setMetrica(opcion)} aria-pressed={metrica === opcion} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${metrica === opcion ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900'}`}>{opcion}</button>
        ))}
      </div>
      <ol className="mt-6 space-y-4">
        {ordenadas.map((fila, indice) => {
          const { fondo, texto } = coloresRanking[indice]
          const ancho = Math.max((fila[metrica] / mayor) * 100, 10)
          const cuota = participacion(fila[metrica], suma)
          const dentro = ancho > 34
          return (
            <li key={fila.nombre} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[2.5rem_11rem_minmax(0,1fr)]">
              <span className="relative flex size-10 items-center justify-center rounded-xl font-display text-sm font-bold tabular-nums shadow-sm" style={{ backgroundColor: fondo, color: texto }}>
                {String(indice + 1).padStart(2, '0')}
                {indice === 0 && <Star size={14} className="absolute -right-1.5 -top-1.5 fill-yellow-300 text-yellow-400" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-900">{fila.nombre}</p>
                <p className="text-xs text-text-500 tabular-nums">{cuota.toFixed(1)} % del canal</p>
              </div>
              <div className="relative col-span-2 h-9 overflow-hidden rounded-xl bg-surface-sunken sm:col-span-1" role="img" aria-label={`${indice + 1}. ${fila.nombre}: ${formato(fila[metrica])}, ${cuota.toFixed(1)} % del canal`}>
                <div className="flex h-full items-center justify-end rounded-xl px-3 transition-[width] duration-500" style={{ width: `${ancho}%`, backgroundColor: fondo }}>
                  {dentro && <span className="text-sm font-bold tabular-nums" style={{ color: texto }}>{formato(fila[metrica])}</span>}
                </div>
                {!dentro && <span className="absolute inset-y-0 flex items-center text-sm font-bold tabular-nums text-text-900" style={{ left: `calc(${ancho}% + 10px)` }}>{formato(fila[metrica])}</span>}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}

export function DetalleCanal({ canal, onClose, periodo, onPeriodoChange, totales, anteriores, otroCanal, integrado = false }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [servicio, setServicio] = useState('todos')
  const [ciudadSalida, setCiudadSalida] = useState('todas')
  const esWeb = canal === 'web'
  const filas = datosDetalleEjemplo(canal, totales)
  const servicios = [...new Set(filas.map((fila) => fila.servicio))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtradas = filas.filter((fila) =>
    (servicio === 'todos' || fila.servicio === servicio) &&
    (ciudadSalida === 'todas' || fila.ciudadSalida === ciudadSalida),
  )
  const pasajes = filtradas.reduce((suma, fila) => suma + fila.pasajes, 0)
  const ingresos = filtradas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const proporcion = totales.pasajes === 0 ? 0 : pasajes / totales.pasajes
  const filtrado: Totales = { pasajes, ingresos, compras: Math.round(totales.compras * proporcion) }

  const rutas = agrupar(filtradas, 'ruta')
  const sedes = agrupar(filtradas, 'ciudadSalida')
  const ciudadesFiltro = ciudadesSalidaEjemplo
  const ticket = pasajes === 0 ? 0 : ingresos / pasajes
  const ticketOtro = otroCanal.pasajes === 0 ? 0 : otroCanal.ingresos / otroCanal.pasajes
  const pasajesPorCompra = totales.compras === 0 ? 0 : totales.pasajes / totales.compras
  const pasajesPorCompraAntes = anteriores.compras === 0 ? 0 : anteriores.pasajes / anteriores.compras
  const anticipacion = anticipacionEjemplo(canal, filtrado)
  const metodos = metodosPagoEjemplo(canal, filtrado)
  const incidencias = incidenciasCanalEjemplo(canal, filtrado)
  const vendedores = esWeb ? [] : vendedoresEjemplo(filtrado, ciudadSalida === 'todas' ? undefined : ciudadSalida)
  const cambios = cambiosConDiferenciaEjemplo(filtrado)
  const nombreCanal = esWeb ? 'Web' : 'Agencia'
  const nombreOtro = esWeb ? 'Agencia' : 'Web'
  const color = esWeb ? 'var(--canal-web)' : 'var(--canal-agencia)'
  const Contenedor = integrado ? 'div' : 'main'
  const sinVentas = pasajes === 0

  return (
    <div className={integrado ? 'text-text-900' : 'min-h-screen bg-surface text-text-900'}>
      {!integrado && <header className="border-b border-border bg-surface-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-ink-950 font-display text-sm font-bold text-accent-400">RL</span>
            <div><p className="font-display text-base font-bold leading-tight">RutaLibre</p><p className="text-xs text-text-500">Sistema Empresarial · Gerencia</p></div>
          </div>
          <TemaComercial />
        </div>
      </header>}

      <Contenedor className={integrado ? 'mx-auto w-full max-w-[1400px] space-y-6' : 'mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8'}>
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold text-accent-text hover:underline"><ArrowLeft size={17} aria-hidden="true" />Volver al resumen</button>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent-text">{esWeb ? <Globe2 size={16} /> : <Building2 size={16} />} Detalle del canal {nombreCanal}</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">Ventas por {nombreCanal}</h1>
            <p className="mt-2 text-sm text-text-500">{esWeb ? 'Cómo y cuándo compran los clientes en el portal.' : 'Ventas por sede y vendedor, medios de pago y cambios en mostrador.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-warning-50 px-3 py-1.5 text-xs font-bold text-warning-text">Datos de ejemplo</span>
            <label className="flex items-center gap-2 rounded-xl border border-border bg-surface-card px-3 py-2 text-sm shadow-sm">
              <CalendarDays size={16} className="text-text-500" aria-hidden="true" />Período
              <select value={periodo} onChange={(evento) => onPeriodoChange(Number(evento.target.value) as 7 | 30 | 90)} className="bg-transparent font-semibold outline-none" aria-label="Período">
                <option value={7}>7 días</option><option value={30}>30 días</option><option value={90}>90 días</option>
              </select>
            </label>
          </div>
        </div>

        <section aria-label="Filtros del canal" className="grid gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          <label className="space-y-2 text-sm font-semibold text-text-700">{esWeb ? 'Ciudad de origen' : 'Sede (ciudad de salida)'}
            <select value={ciudadSalida} onChange={(evento) => setCiudadSalida(evento.target.value)} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500">
              <option value="todas">{esWeb ? 'Todos los orígenes' : 'Todas las sedes'}</option>
              {ciudadesFiltro.map((ciudad) => <option key={ciudad} value={ciudad}>{ciudad}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-text-700">Servicio
            <select value={servicio} onChange={(evento) => setServicio(evento.target.value)} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500">
              <option value="todos">Todos los servicios</option>
              {servicios.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
        </section>

        <section aria-label="Indicadores del canal" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Indicador titulo="Pasajes vendidos" valor={numero.format(pasajes)} pie={<Variacion valor={variacion(totales.pasajes, anteriores.pasajes)} texto="vs. período anterior" />} />
          <Indicador titulo="Ingresos netos" valor={moneda.format(ingresos)} pie={<Variacion valor={variacion(totales.ingresos, anteriores.ingresos)} texto="vs. período anterior" />} />
          <Indicador titulo="Ticket promedio" valor={sinVentas ? '—' : precio.format(ticket)} pie={sinVentas ? 'Sin ventas con estos filtros' : <Variacion valor={variacion(ticket, ticketOtro)} texto={`vs. ${nombreOtro} (${precio.format(ticketOtro)})`} neutral />} />
          <Indicador titulo="Pasajes por compra" valor={decimal.format(pasajesPorCompra)} pie={<Variacion valor={variacion(pasajesPorCompra, pasajesPorCompraAntes)} texto="vs. período anterior" />} />
        </section>

        {sinVentas ? <p className="rounded-xl bg-surface-sunken p-4 text-sm text-text-500">{esWeb ? 'No hay ventas simuladas para este servicio.' : 'No hay ventas simuladas para esta sede y servicio.'}</p> : <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta className="flex flex-col" titulo="Anticipación de compra" detalle="¿Con cuántos días de anticipación compran antes de viajar?">
              <AnticipacionCompra filas={anticipacion} esWeb={esWeb} />
            </Tarjeta>
            <Tarjeta className="flex flex-col" titulo="Método de pago" detalle={esWeb ? 'Participación en ingresos del portal' : 'Participación en ingresos · sirve para cuadrar caja por sede'}>
              <MetodosPago filas={metodos} />
            </Tarjeta>
          </div>

          {esWeb ? (
            <Tarjeta titulo="¿Cuándo compran en la web?" detalle="Pasajes por día de la semana y franja horaria de compra">
              <MapaHorario valores={comprasPorHorarioEjemplo(filtrado)} color={color} />
            </Tarjeta>
          ) : (
            <div className="grid gap-4">
              <Tarjeta className="flex flex-col" titulo="Ventas por sede" detalle="Las 5 sedes que más venden, de mayor a menor">
                <VentasPorSede filas={sedes} />
              </Tarjeta>
              <Tarjeta titulo="Ranking de vendedores" detalle="Pasajes e ingresos por empleado (id_empleado)">
                <div className="mt-5 overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[440px] text-sm">
                    <thead className="bg-surface-sunken text-xs uppercase text-text-500"><tr><th scope="col" className="px-3 py-3 text-left">Vendedor</th><th scope="col" className="px-3 py-3 text-left">Sede</th><th scope="col" className="px-3 py-3 text-right">Pasajes</th><th scope="col" className="px-3 py-3 text-right">Ingresos</th><th scope="col" className="px-3 py-3 text-right">Ticket</th></tr></thead>
                    <tbody>{vendedores.map((vendedor, indice) => (
                      <tr key={vendedor.idEmpleado} className="border-t border-border">
                        <th scope="row" className="px-3 py-3 text-left font-medium"><span className="mr-2 text-text-400">{indice + 1}.</span>{vendedor.nombre}<span className="block pl-5 text-xs font-normal text-text-500">ID {vendedor.idEmpleado}</span></th>
                        <td className="px-3 py-3 text-text-700">{vendedor.sede}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{numero.format(vendedor.pasajes)}</td>
                        <td className="px-3 py-3 text-right font-semibold tabular-nums">{moneda.format(vendedor.ingresos)}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-text-700">{vendedor.pasajes === 0 ? '—' : precio.format(vendedor.ingresos / vendedor.pasajes)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </Tarjeta>
            </div>
          )}

          <Tarjeta titulo={esWeb ? 'Postergaciones, reembolsos y pagos' : 'Cambios y devoluciones en mostrador'} detalle={`Porcentaje sobre los pasajes ${esWeb ? 'web' : 'de agencia'} del período`}>
            <ul className={`mt-5 grid gap-3 ${esWeb ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
              <Incidencia icono={<CalendarClock size={18} aria-hidden="true" />} titulo="Postergaciones" valor={incidencias.postergaciones} base={pasajes} detalle="Pasajes cambiados a otra fecha" />
              <Incidencia icono={<RotateCcw size={18} aria-hidden="true" />} titulo="Reembolsos" valor={incidencias.reembolsos} base={pasajes} detalle="Devoluciones aprobadas" />
              {esWeb
                ? <Incidencia icono={<CreditCard size={18} aria-hidden="true" />} titulo="Pagos fallidos" valor={incidencias.pagosFallidos} base={filtrado.compras} detalle="Porcentaje sobre intentos de compra" />
                : <li className="rounded-xl bg-surface-sunken p-4">
                    <div className="flex items-center gap-2 text-sm text-text-700"><span style={{ color: 'var(--serie-neutra)' }}><Repeat size={18} aria-hidden="true" /></span>Cambios de viaje con diferencia</div>
                    <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text-900">{numero.format(cambios.conCobro)} <span className="text-sm font-semibold text-text-500">de {numero.format(cambios.cambios)} cambios</span></p>
                    <p className="mt-1 text-xs text-text-500">{moneda.format(cambios.montoCobrado)} cobrados por diferencia de tarifa</p>
                  </li>}
            </ul>
          </Tarjeta>

          <section aria-labelledby="rutas-canal-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="rutas-canal-titulo" className="font-display text-lg font-bold">Ranking de rutas</h2><p className="mt-1 text-sm text-text-500">Las 6 rutas que más venden por {nombreCanal} · % sobre el total del canal</p></div>
              <p className="text-sm text-text-700">Ingresos del filtro: <strong className="tabular-nums text-text-900">{moneda.format(ingresos)}</strong></p>
            </div>
            <RankingRutas filas={rutas} />
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-semibold text-accent-text">Ver todas las rutas del canal</summary>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-surface-sunken text-xs uppercase text-text-500"><tr><th scope="col" className="px-4 py-3 text-left">Ruta</th><th scope="col" className="px-4 py-3 text-right">Pasajes</th><th scope="col" className="px-4 py-3 text-right">Viajes</th><th scope="col" className="px-4 py-3 text-right">Ingresos</th></tr></thead>
                  <tbody>{rutas.map((ruta) => <tr key={ruta.nombre} className="border-t border-border"><th scope="row" className="px-4 py-3 text-left font-medium">{ruta.nombre}</th><td className="px-4 py-3 text-right tabular-nums">{numero.format(ruta.pasajes)}</td><td className="px-4 py-3 text-right tabular-nums">{numero.format(ruta.viajes)}</td><td className="px-4 py-3 text-right tabular-nums">{moneda.format(ruta.ingresos)}</td></tr>)}</tbody>
                </table>
              </div>
            </details>
          </section>

          {esWeb && <ConversionPortal />}
        </>}

        <p className="text-xs text-text-500">Vista de ejemplo: las cifras de este detalle son simuladas y se reemplazarán por los registros reales.</p>
      </Contenedor>
    </div>
  )
}
