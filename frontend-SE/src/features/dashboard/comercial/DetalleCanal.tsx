import { useEffect, useState } from 'react'
import { ArrowLeft, Building2, CalendarDays, Globe2 } from 'lucide-react'
import type { Canal, Totales } from './modelo'
import { ciudadesSalidaEjemplo, datosDetalleEjemplo } from './datosDetalleEjemplo'
import { TemaComercial } from './TemaComercial'

interface Props {
  canal: Canal
  onClose: () => void
  periodo: 7 | 30 | 90
  onPeriodoChange: (periodo: 7 | 30 | 90) => void
  totales: Totales
  integrado?: boolean
}

interface RutaResumen {
  nombre: string
  ingresos: number
  pasajes: number
  viajes: number
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const precio = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 })
const numero = new Intl.NumberFormat('es-PE')

function Indicador({ titulo, valor, descripcion }: { titulo: string; valor: string; descripcion: string }) {
  return (
    <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-500">{titulo}</p>
      <p className="mt-4 font-display text-3xl font-bold tabular-nums text-text-900">{valor}</p>
      <p className="mt-2 text-xs text-text-500">{descripcion}</p>
    </article>
  )
}

export function DetalleCanal({ canal, onClose, periodo, onPeriodoChange, totales, integrado = false }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [servicio, setServicio] = useState('todos')
  const [ciudadSalida, setCiudadSalida] = useState('todas')
  const filas = datosDetalleEjemplo(canal, totales)
  const servicios = [...new Set(filas.map((fila) => fila.servicio))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtradas = filas.filter((fila) =>
    (servicio === 'todos' || fila.servicio === servicio) &&
    (canal === 'web' || ciudadSalida === 'todas' || fila.ciudadSalida === ciudadSalida),
  )
  const pasajes = filtradas.reduce((suma, fila) => suma + fila.pasajes, 0)
  const ingresos = filtradas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const viajes = filtradas.reduce((suma, fila) => suma + fila.viajes, 0)

  const porRuta = new Map<string, RutaResumen>()
  for (const fila of filtradas) {
    const ruta = porRuta.get(fila.ruta) ?? { nombre: fila.ruta, ingresos: 0, pasajes: 0, viajes: 0 }
    ruta.ingresos += fila.ingresos
    ruta.pasajes += fila.pasajes
    ruta.viajes += fila.viajes
    porRuta.set(fila.ruta, ruta)
  }
  const rutas = [...porRuta.values()].filter((ruta) => ruta.pasajes > 0).sort((a, b) => b.ingresos - a.ingresos)
  const destacadas = rutas.slice(0, 5)
  const mayor = Math.max(...destacadas.map((ruta) => ruta.ingresos), 1)
  const esWeb = canal === 'web'
  const nombreCanal = esWeb ? 'Web' : 'Agencia'
  const color = esWeb ? 'var(--color-accent-500)' : 'var(--color-route-500)'
  const Contenedor = integrado ? 'div' : 'main'

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
            <p className="mt-2 text-sm text-text-500">Indicadores y rutas del canal durante el período seleccionado.</p>
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

        <p className="rounded-xl border border-warning-500/30 bg-warning-50 px-4 py-3 text-sm font-medium text-warning-text">Vista de ejemplo: estas cifras son ficticias y no representan ventas reales.</p>

        <section aria-label="Filtros del canal" className="grid gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          {canal === 'agencia' && <label className="space-y-2 text-sm font-semibold text-text-700">Ciudad de salida
            <select value={ciudadSalida} onChange={(evento) => setCiudadSalida(evento.target.value)} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500">
              <option value="todas">Todas las ciudades</option>
              {ciudadesSalidaEjemplo.map((ciudad) => <option key={ciudad} value={ciudad}>{ciudad}</option>)}
            </select>
          </label>}
          <label className="space-y-2 text-sm font-semibold text-text-700">Servicio
            <select value={servicio} onChange={(evento) => setServicio(evento.target.value)} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500">
              <option value="todos">Todos los servicios</option>
              {servicios.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </label>
        </section>

        <section aria-label="Indicadores del canal" className="grid gap-4 md:grid-cols-3">
          <Indicador titulo="Pasajes vendidos" valor={numero.format(pasajes)} descripcion="Pasajes confirmados con los filtros seleccionados" />
          <Indicador titulo="Precio promedio por pasaje" valor={pasajes === 0 ? '—' : precio.format(ingresos / pasajes)} descripcion="Ingresos netos divididos entre pasajes vendidos" />
          <Indicador titulo="Viajes con ventas" valor={numero.format(viajes)} descripcion="Salidas con al menos un pasaje vendido" />
        </section>

        <section aria-labelledby="rutas-canal-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="rutas-canal-titulo" className="font-display text-xl font-bold">Ranking de rutas</h2><p className="mt-1 text-sm text-text-500">Ordenado por ingresos netos · {nombreCanal}</p></div>
            <p className="text-sm text-text-700">Ingresos del filtro: <strong className="tabular-nums text-text-900">{moneda.format(ingresos)}</strong></p>
          </div>
          {rutas.length === 0 ? <p className="mt-6 rounded-xl bg-surface-sunken p-4 text-sm text-text-500">{esWeb ? 'No hay ventas simuladas para este servicio.' : 'No hay ventas simuladas para esta ciudad y servicio.'}</p> : <>
            <ol className="mt-6 grid gap-5 lg:grid-cols-2">
              {destacadas.map((ruta, indice) => (
                <li key={ruta.nombre}>
                  <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"><span className="min-w-0 font-medium"><span className="mr-2 text-text-400">{indice + 1}.</span>{ruta.nombre}</span><span className="ml-auto text-right tabular-nums"><strong className="block">{moneda.format(ruta.ingresos)}</strong><span className="text-xs text-text-500">{numero.format(ruta.pasajes)} pasajes</span></span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${(ruta.ingresos / mayor) * 100}%`, backgroundColor: color }} /></div>
                </li>
              ))}
            </ol>
            <ul className="mt-8 divide-y divide-border rounded-xl border border-border sm:hidden" aria-label="Todas las rutas del canal">
              {rutas.map((ruta) => <li key={ruta.nombre} className="p-4 text-sm">
                <p className="font-semibold text-text-900">{ruta.nombre}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-text-700">
                  <div><dt className="text-xs text-text-500">Pasajes</dt><dd className="mt-1 tabular-nums">{numero.format(ruta.pasajes)}</dd></div>
                  <div><dt className="text-xs text-text-500">Viajes</dt><dd className="mt-1 tabular-nums">{numero.format(ruta.viajes)}</dd></div>
                  <div><dt className="text-xs text-text-500">Ingresos</dt><dd className="mt-1 font-semibold tabular-nums">{moneda.format(ruta.ingresos)}</dd></div>
                </dl>
              </li>)}
            </ul>
            <div className="mt-8 hidden overflow-x-auto rounded-xl border border-border sm:block">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-surface-sunken text-xs uppercase text-text-500"><tr><th scope="col" className="px-4 py-3 text-left">Ruta</th><th scope="col" className="px-4 py-3 text-right">Pasajes</th><th scope="col" className="px-4 py-3 text-right">Viajes</th><th scope="col" className="px-4 py-3 text-right">Ingresos</th></tr></thead>
                <tbody>{rutas.map((ruta) => <tr key={ruta.nombre} className="border-t border-border"><th scope="row" className="px-4 py-3 text-left font-medium">{ruta.nombre}</th><td className="px-4 py-3 text-right tabular-nums">{numero.format(ruta.pasajes)}</td><td className="px-4 py-3 text-right tabular-nums">{numero.format(ruta.viajes)}</td><td className="px-4 py-3 text-right tabular-nums">{moneda.format(ruta.ingresos)}</td></tr>)}</tbody>
              </table>
            </div>
          </>}
        </section>
        <p className="text-xs text-text-500">Los viajes con ventas son simulados en esta vista; se calcularán por salida al conectar los registros reales.</p>
      </Contenedor>
    </div>
  )
}
