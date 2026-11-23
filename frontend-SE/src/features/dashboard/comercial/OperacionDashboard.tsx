import { useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, RotateCcw, Search, Ticket } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DatosOperacion, FilaRanking, RutaOcupacion, SalidaEnRiesgo } from './datosOperacionEjemplo'

interface Props {
  datos: DatosOperacion
  periodo: number
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('es-PE')
const coloresServicio = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)']

function ocupacion(vendidos: number, capacidad: number): number {
  return capacidad === 0 ? 0 : (vendidos / capacidad) * 100
}

function BarraOcupacion({ fila }: { fila: RutaOcupacion }) {
  const porcentaje = ocupacion(fila.vendidos, fila.capacidad)
  const color = porcentaje < 60 ? 'var(--color-warning-text)' : 'var(--color-accent-500)'

  return (
    <li className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-text-900">{fila.nombre}</span>
        <span className="font-semibold tabular-nums text-text-900">{porcentaje.toFixed(0)} %</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={`${fila.nombre}: ${fila.vendidos} de ${fila.capacidad} asientos ocupados`}>
        <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs tabular-nums text-text-500">{numero.format(fila.vendidos)} de {numero.format(fila.capacidad)} asientos</p>
    </li>
  )
}

function Salida({ fila }: { fila: SalidaEnRiesgo }) {
  const porcentaje = ocupacion(fila.vendidos, fila.capacidad)

  return (
    <li className="rounded-xl border border-border bg-surface-sunken p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-text-900">{fila.ruta}</p><p className="mt-1 text-xs text-text-500">{fila.salida}</p></div>
        <span className="rounded-full bg-warning-50 px-2 py-1 text-xs font-bold tabular-nums text-warning-text">{porcentaje.toFixed(0)} %</span>
      </div>
      <p className="mt-2 text-xs text-text-700">{fila.vendidos} de {fila.capacidad} asientos vendidos</p>
    </li>
  )
}

function Ranking({ titulo, detalle, filas, color }: { titulo: string; detalle: string; filas: FilaRanking[]; color: string }) {
  const destacadas = [...filas].sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)
  const mayor = Math.max(...destacadas.map((fila) => fila.ingresos), 1)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h3 className="font-display text-lg font-bold text-text-900">{titulo}</h3>
      <p className="mt-1 text-sm text-text-500">{detalle}</p>
      <ol className="mt-5 space-y-5">
        {destacadas.map((fila, indice) => (
          <li key={fila.nombre}>
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 text-sm">
              <span className="min-w-0 font-medium text-text-900"><span className="mr-2 text-text-400">{indice + 1}.</span>{fila.nombre}</span>
              <span className="ml-auto text-right tabular-nums"><strong className="block text-text-900">{moneda.format(fila.ingresos)}</strong><span className="text-xs text-text-500">{numero.format(fila.pasajes)} pasajes</span></span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${(fila.ingresos / mayor) * 100}%`, backgroundColor: color }} />
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}

function TablaRutas({ filas }: { filas: FilaRanking[] }) {
  type Columna = 'nombre' | 'ingresos' | 'pasajes'
  const [columna, setColumna] = useState<Columna>('ingresos')
  const [ascendente, setAscendente] = useState(false)
  const totalIngresos = filas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const totalPasajes = filas.reduce((suma, fila) => suma + fila.pasajes, 0)
  const filasOrdenadas = [...filas].sort((a, b) => {
    const resultado = columna === 'nombre'
      ? a.nombre.localeCompare(b.nombre, 'es')
      : a[columna] - b[columna]
    return ascendente ? resultado : -resultado
  })

  function ordenar(nuevaColumna: Columna) {
    setAscendente(nuevaColumna === columna ? !ascendente : nuevaColumna === 'nombre')
    setColumna(nuevaColumna)
  }

  function encabezado(nombre: string, clave: Columna) {
    return (
      <th scope="col" aria-sort={columna === clave ? ascendente ? 'ascending' : 'descending' : 'none'} className="px-3 py-3 text-left font-semibold">
        <button type="button" onClick={() => ordenar(clave)} className="inline-flex items-center gap-1 hover:text-text-900">
          {nombre}<span aria-hidden="true">{columna === clave ? ascendente ? '↑' : '↓' : '↕'}</span>
        </button>
      </th>
    )
  }

  return (
    <details className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
        <summary className="cursor-pointer text-sm font-semibold text-accent-text"><span className="sm:hidden">Ver todas las rutas (ordenables)</span><span className="hidden sm:inline">Ver todas las rutas en tabla (ordenable)</span></summary>
        <div className="mt-4 sm:hidden">
          <label className="block text-sm font-medium text-text-700">Ordenar rutas
            <select value={`${columna}-${ascendente ? 'asc' : 'desc'}`} onChange={(evento) => {
              const [clave, orden] = evento.target.value.split('-')
              setColumna(clave as Columna)
              setAscendente(orden === 'asc')
            }} className="mt-2 block w-full rounded-xl border border-border bg-surface-card px-3 py-2 text-text-900">
              <option value="ingresos-desc">Ingresos: mayor a menor</option>
              <option value="ingresos-asc">Ingresos: menor a mayor</option>
              <option value="pasajes-desc">Pasajes: mayor a menor</option>
              <option value="pasajes-asc">Pasajes: menor a mayor</option>
              <option value="nombre-asc">Ruta: A a Z</option>
              <option value="nombre-desc">Ruta: Z a A</option>
            </select>
          </label>
          <ul className="mt-4 divide-y divide-border rounded-xl border border-border" aria-label="Todas las rutas">
            {filasOrdenadas.map((fila) => <li key={fila.nombre} className="p-4 text-sm">
              <p className="font-semibold text-text-900">{fila.nombre}</p>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-text-700">
                <div><dt className="text-xs text-text-500">Ingresos</dt><dd className="mt-1 tabular-nums">{moneda.format(fila.ingresos)}</dd></div>
                <div><dt className="text-xs text-text-500">Pasajes</dt><dd className="mt-1 tabular-nums">{numero.format(fila.pasajes)}</dd></div>
              </dl>
            </li>)}
          </ul>
          <p className="mt-3 text-sm font-semibold text-text-900">Total: {moneda.format(totalIngresos)} · {numero.format(totalPasajes)} pasajes</p>
        </div>
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border sm:block">
          <table className="w-full min-w-[390px] text-sm">
            <thead className="bg-surface-sunken text-xs uppercase text-text-500">
              <tr>
                {encabezado('Ruta', 'nombre')}
                {encabezado('Ingresos', 'ingresos')}
                {encabezado('Pasajes', 'pasajes')}
              </tr>
            </thead>
            <tbody>
              {filasOrdenadas.map((fila) => (
                <tr key={fila.nombre} className="border-t border-border">
                  <th scope="row" className="px-3 py-3 text-left font-medium text-text-900">{fila.nombre}</th>
                  <td className="px-3 py-3 tabular-nums text-text-700">{moneda.format(fila.ingresos)}</td>
                  <td className="px-3 py-3 tabular-nums text-text-700">{numero.format(fila.pasajes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border-strong bg-surface-sunken font-semibold text-text-900">
              <tr><th scope="row" className="px-3 py-3 text-left">Total</th><td className="px-3 py-3 tabular-nums">{moneda.format(totalIngresos)}</td><td className="px-3 py-3 tabular-nums">{numero.format(totalPasajes)}</td></tr>
            </tfoot>
          </table>
        </div>
    </details>
  )
}

function Servicios({ filas }: { filas: FilaRanking[] }) {
  const total = filas.reduce((suma, fila) => suma + fila.ingresos, 0)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h3 className="font-display text-lg font-bold text-text-900">Distribución por servicio</h3>
      <p className="mt-1 text-sm text-text-500">Participación en ingresos de ambos canales</p>
      <div className="relative mx-auto mt-3 h-48 max-w-64" role="img" aria-label="Distribución de ingresos por tipo de servicio">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={filas} dataKey="ingresos" nameKey="nombre" innerRadius={66} outerRadius={89} paddingAngle={3} stroke="none">
              {filas.map((fila, indice) => <Cell key={fila.nombre} fill={coloresServicio[indice]} />)}
            </Pie>
            <Tooltip formatter={(valor, nombre) => [moneda.format(Number(valor)), nombre]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-text-500">Total</span>
          <strong className="font-display text-lg text-text-900">{moneda.format(total)}</strong>
        </div>
      </div>
      <ul className="mt-2 space-y-3">
        {filas.map((fila, indice) => {
          const porcentaje = total === 0 ? 0 : (fila.ingresos / total) * 100
          return (
            <li key={fila.nombre}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-2 text-text-900"><i className="size-2.5 rounded-full" style={{ backgroundColor: coloresServicio[indice] }} />{fila.nombre}</span>
                <span className="ml-auto tabular-nums text-text-700">{moneda.format(fila.ingresos)} · <strong>{porcentaje.toFixed(1)} %</strong></span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><div className="h-full" style={{ width: `${porcentaje}%`, backgroundColor: coloresServicio[indice] }} /></div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

export function OperacionDashboard({ datos, periodo }: Props) {
  const vendidos = datos.ocupacionPorRuta.reduce((suma, fila) => suma + fila.vendidos, 0)
  const capacidad = datos.ocupacionPorRuta.reduce((suma, fila) => suma + fila.capacidad, 0)
  const ocupacionTotal = ocupacion(vendidos, capacidad)

  return (
    <>
      <section aria-labelledby="operacion-titulo" className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Panorama operativo</p>
          <h2 id="operacion-titulo" className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Servicios, rutas y salidas</h2>
          <p className="mt-1 text-sm text-text-500">Ingresos por servicio y ruta, ocupación y próximas salidas que requieren atención.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-500">Ocupación del período</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-text-900">{ocupacionTotal.toFixed(1)} %</p>
            <p className="mt-2 text-xs text-text-500">{numero.format(vendidos)} asientos ocupados de {numero.format(capacidad)} disponibles · salidas de los últimos {periodo} días</p>
          </article>
          <article className="rounded-2xl border border-warning-500/30 bg-warning-50 p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-warning-text"><AlertTriangle size={16} aria-hidden="true" />Próximas salidas con baja venta</p>
            <p className="mt-3 font-display text-3xl font-bold tabular-nums text-text-900">{datos.salidasEnRiesgo.length}</p>
            <p className="mt-2 text-xs text-text-700">Salidas por debajo del 40 % de ocupación. Revisar promoción o capacidad.</p>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
            <h3 className="font-display text-lg font-bold">Ocupación por ruta</h3>
            <p className="mt-1 text-sm text-text-500">Asientos ocupados ÷ capacidad de salidas realizadas en el período</p>
            <ul className="mt-6 space-y-5">{datos.ocupacionPorRuta.map((fila) => <BarraOcupacion key={fila.nombre} fila={fila} />)}</ul>
          </article>
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
            <h3 className="font-display text-lg font-bold">Salidas que necesitan impulso</h3>
            <p className="mt-1 text-sm text-text-500">Próximos días · ordenadas por menor ocupación</p>
            <ul className="mt-5 space-y-3">{datos.salidasEnRiesgo.map((fila) => <Salida key={`${fila.ruta}-${fila.salida}`} fila={fila} />)}</ul>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Ranking titulo="Rutas de mayor ingreso" detalle={`5 rutas principales de ambos canales · últimos ${periodo} días`} filas={datos.rutasPorIngreso} color="var(--color-accent-500)" />
          <Servicios filas={datos.servicios} />
        </div>
        <TablaRutas filas={datos.rutasPorIngreso} />
      </section>

      <section aria-labelledby="incidencias-titulo" className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Seguimiento</p>
          <h2 id="incidencias-titulo" className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">Incidencias del período</h2>
          <p className="mt-1 text-sm text-text-500">Casos registrados en los últimos {periodo} días.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm"><RotateCcw size={20} className="text-route-500" aria-hidden="true" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-500">Devoluciones aprobadas</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{datos.incidencias.devoluciones}</p></article>
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm"><CalendarClock size={20} className="text-route-500" aria-hidden="true" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-500">Cambios de fecha</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{datos.incidencias.cambiosFecha}</p></article>
          <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm"><CreditCard size={20} className="text-route-500" aria-hidden="true" /><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-500">Pagos fallidos</p><p className="mt-2 font-display text-3xl font-bold tabular-nums">{datos.incidencias.pagosFallidos}</p></article>
        </div>
      </section>

      <section aria-labelledby="conversion-titulo" className="rounded-2xl border border-dashed border-border-strong bg-surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-text-500">Siguiente etapa</p><h2 id="conversion-titulo" className="mt-1 font-display text-xl font-bold">Conversión del portal</h2><p className="mt-1 text-sm text-text-500">Disponible cuando el portal registre cada paso de la compra.</p></div><span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-semibold text-text-700">Pendiente de datos</span></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><Search size={18} aria-hidden="true" />Búsquedas <ArrowRight size={15} className="ml-auto text-text-400" aria-hidden="true" /></div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><Ticket size={18} aria-hidden="true" />Reservas <ArrowRight size={15} className="ml-auto text-text-400" aria-hidden="true" /></div>
          <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><CreditCard size={18} aria-hidden="true" />Pagos confirmados</div>
        </div>
      </section>
    </>
  )
}
