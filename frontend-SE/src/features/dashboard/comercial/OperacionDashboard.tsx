import { useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, CreditCard, RotateCcw, Search, Ticket } from 'lucide-react'
import type { DatosOperacion, FilaRanking, RutaOcupacion, SalidaEnRiesgo } from './datosOperacionEjemplo'
import { ocupacionTotal } from './datosOperacionEjemplo'
import { coloresRanking } from './paletaRanking'

interface Props {
  datos: DatosOperacion
  periodo: number
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('es-PE')
const compacto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 })
const coloresServicio = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)']

function ocupacion(vendidos: number, capacidad: number): number {
  return capacidad === 0 ? 0 : (vendidos / capacidad) * 100
}

function BarraOcupacion({ fila }: { fila: RutaOcupacion }) {
  const porcentaje = ocupacion(fila.vendidos, fila.capacidad)
  const color = porcentaje < 60 ? 'var(--color-warning-text)' : 'var(--serie-neutra)'

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

function Ranking({ titulo, detalle, filas }: { titulo: string; detalle: string; filas: FilaRanking[] }) {
  const destacadas = [...filas].sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)
  const mayor = Math.max(...destacadas.map((fila) => fila.ingresos), 1)

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h3 className="font-display text-lg font-bold text-text-900">{titulo}</h3>
      <p className="mt-1 text-sm text-text-500">{detalle}</p>
      <ol className="mt-6 grid flex-1 grid-cols-5 items-end gap-2 sm:gap-4" aria-label={titulo}>
        {destacadas.map((fila, indice) => {
          const { fondo, texto } = coloresRanking[indice]
          const [origen, destino] = fila.nombre.split(' → ')
          const alto = Math.max((fila.ingresos / mayor) * 100, 16)
          return (
            <li key={fila.nombre} title={fila.nombre} className="flex h-full flex-col items-center justify-end text-center">
              <div className="flex h-60 w-full flex-col items-center justify-end" role="img" aria-label={`${indice + 1}. ${fila.nombre}: ${moneda.format(fila.ingresos)}, ${fila.pasajes} pasajes`}>
                <span className="text-xs font-bold tabular-nums text-text-900 sm:text-sm">{compacto.format(fila.ingresos)}</span>
                <span className="mb-1.5 text-[11px] tabular-nums text-text-500">{numero.format(fila.pasajes)} pas.</span>
                <div className="flex w-full items-end justify-center rounded-t-xl pb-2 transition-[height] duration-500" style={{ height: `${alto * 0.78}%`, backgroundColor: fondo }}>
                  <span className="flex size-7 items-center justify-center rounded-full border-2 font-display text-xs font-bold tabular-nums" style={{ borderColor: texto, color: texto }}>{String(indice + 1).padStart(2, '0')}</span>
                </div>
              </div>
              <div className="mt-2 w-full rounded-lg bg-surface-sunken px-1 py-1.5">
                <p className="truncate text-xs font-semibold text-text-900">{origen}</p>
                <p className="truncate text-[11px] text-text-500">→ {destino}</p>
              </div>
            </li>
          )
        })}
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
  const ordenadas = [...filas].sort((a, b) => b.ingresos - a.ingresos)

  return (
    <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold text-text-900">Distribución por servicio</h3>
        <span className="text-sm text-text-700">Total <strong className="tabular-nums text-text-900">{moneda.format(total)}</strong></span>
      </div>
      <p className="mt-1 text-sm text-text-500">Participación en ingresos de ambos canales</p>
      <ul className="mt-6 space-y-5">
        {ordenadas.map((fila) => {
          const porcentaje = total === 0 ? 0 : (fila.ingresos / total) * 100
          const color = coloresServicio[filas.indexOf(fila)]
          return (
            <li key={fila.nombre}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
                <span className="flex items-center gap-2 font-medium text-text-900"><i className="size-2.5 rounded-full" style={{ backgroundColor: color }} />{fila.nombre}</span>
                <span className="ml-auto tabular-nums text-text-700"><strong className="text-text-900">{porcentaje.toFixed(1)} %</strong> · {moneda.format(fila.ingresos)} · {numero.format(fila.pasajes)} pasajes</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color }} /></div>
            </li>
          )
        })}
      </ul>
    </article>
  )
}

/** Única alerta accionable de la vista general. */
export function SalidasImpulso({ datos }: { datos: DatosOperacion }) {
  return (
    <article className="rounded-2xl border border-warning-500/30 bg-surface-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-warning-text"><AlertTriangle size={15} aria-hidden="true" />Requiere atención</p>
          <h2 className="mt-1 font-display text-xl font-bold">Salidas que necesitan impulso</h2>
          <p className="mt-1 text-sm text-text-500">Próximos días · por debajo del 40 % de ocupación</p>
        </div>
        <span className="rounded-full bg-warning-50 px-3 py-1 text-sm font-bold tabular-nums text-warning-text">{datos.salidasEnRiesgo.length}</span>
      </div>
      <ul className="mt-5 grid gap-3 md:grid-cols-3">{datos.salidasEnRiesgo.map((fila) => <Salida key={`${fila.ruta}-${fila.salida}`} fila={fila} />)}</ul>
    </article>
  )
}

/** Resumen compacto: el desglose por canal está en cada detalle. */
export function IncidenciasResumen({ datos, periodo }: Props) {
  const items = [
    { titulo: 'Devoluciones aprobadas', valor: datos.incidencias.devoluciones, Icono: RotateCcw },
    { titulo: 'Cambios de fecha', valor: datos.incidencias.cambiosFecha, Icono: CalendarClock },
    { titulo: 'Pagos fallidos', valor: datos.incidencias.pagosFallidos, Icono: CreditCard },
  ]
  return (
    <section aria-labelledby="incidencias-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h2 id="incidencias-titulo" className="font-display text-lg font-bold">Incidencias del período</h2>
      <p className="mt-1 text-sm text-text-500">Últimos {periodo} días · ambos canales</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map(({ titulo, valor, Icono }) => (
          <li key={titulo} className="flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
            <Icono size={18} className="shrink-0" style={{ color: 'var(--serie-neutra)' }} aria-hidden="true" />
            <span className="text-sm text-text-700">{titulo}</span>
            <strong className="ml-auto font-display text-xl tabular-nums text-text-900">{valor}</strong>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Contenido de la vista "Rutas y ocupación". */
export function PanoramaRutas({ datos, periodo }: Props) {
  const total = ocupacionTotal(datos)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-500">Ocupación del período</p>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-text-900">{total.porcentaje.toFixed(1)} %</p>
          <p className="mt-2 text-xs text-text-500">{numero.format(total.vendidos)} asientos ocupados de {numero.format(total.capacidad)} disponibles · salidas de los últimos {periodo} días</p>
        </article>
        <article className="rounded-2xl border border-warning-500/30 bg-warning-50 p-5 shadow-sm">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-warning-text"><AlertTriangle size={16} aria-hidden="true" />Próximas salidas con baja venta</p>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-text-900">{datos.salidasEnRiesgo.length}</p>
          <p className="mt-2 text-xs text-text-700">Salidas por debajo del 40 % de ocupación. Revisar promoción o capacidad.</p>
        </article>
      </div>

      <article className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
        <h3 className="font-display text-lg font-bold">Ocupación por ruta</h3>
        <p className="mt-1 text-sm text-text-500">Asientos ocupados ÷ capacidad de salidas realizadas en el período</p>
        <ul className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-2">{datos.ocupacionPorRuta.map((fila) => <BarraOcupacion key={fila.nombre} fila={fila} />)}</ul>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranking titulo="Rutas de mayor ingreso" detalle={`5 rutas principales de ambos canales · últimos ${periodo} días`} filas={datos.rutasPorIngreso} />
        <Servicios filas={datos.servicios} />
      </div>
      <TablaRutas filas={datos.rutasPorIngreso} />
    </div>
  )
}

/** Solo aplica a la web: se muestra en su detalle. */
export function ConversionPortal() {
  return (
    <section aria-labelledby="conversion-titulo" className="rounded-2xl border border-dashed border-border-strong bg-surface-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-text-500">Siguiente etapa</p><h2 id="conversion-titulo" className="mt-1 font-display text-xl font-bold">Conversión del portal</h2><p className="mt-1 text-sm text-text-500">Disponible cuando el portal registre cada paso de la compra.</p></div><span className="rounded-full bg-surface-sunken px-3 py-1 text-xs font-semibold text-text-700">Pendiente de datos</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><Search size={18} aria-hidden="true" />Búsquedas <ArrowRight size={15} className="ml-auto text-text-400" aria-hidden="true" /></div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><Ticket size={18} aria-hidden="true" />Reservas <ArrowRight size={15} className="ml-auto text-text-400" aria-hidden="true" /></div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-sunken p-3 text-sm text-text-700"><CreditCard size={18} aria-hidden="true" />Pagos confirmados</div>
      </div>
    </section>
  )
}
