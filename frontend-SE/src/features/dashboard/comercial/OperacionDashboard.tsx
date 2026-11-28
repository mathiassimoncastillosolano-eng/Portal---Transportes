import { useState } from 'react'
import { AlertTriangle, Armchair, ArrowRight, CalendarClock, CreditCard, RotateCcw, Search, Ticket } from 'lucide-react'
import type { DatosOperacion, FilaRanking, RutaOcupacion, SalidaEnRiesgo } from './datosOperacionEjemplo'
import { ocupacionTotal } from './datosOperacionEjemplo'
import { coloresRanking } from './paletaRanking'
import { OrigenesDestinos } from './OrigenesDestinos'
import type { Totales } from './modelo'

interface Props {
  datos: DatosOperacion
  periodo: number
}

interface PropsPanorama extends Props {
  web: Totales
  agencia: Totales
}

const moneda = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })
const numero = new Intl.NumberFormat('es-PE')
const compacto = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact', maximumFractionDigits: 1 })
const coloresServicio = ['var(--serie-1)', 'var(--serie-2)', 'var(--serie-3)', 'var(--serie-4)']

function ocupacion(vendidos: number, capacidad: number): number {
  return capacidad === 0 ? 0 : (vendidos / capacidad) * 100
}

const META_OCUPACION = 75

function nivelOcupacion(porcentaje: number) {
  if (porcentaje >= META_OCUPACION) return { etiqueta: 'Buena', color: 'var(--color-success-500)' }
  if (porcentaje >= 60) return { etiqueta: 'Regular', color: 'var(--color-warning-500)' }
  return { etiqueta: 'Baja', color: 'var(--color-danger-500)' }
}

/** Medidor circular: el anillo muestra la ocupación y la marca indica la meta. */
function MedidorOcupacion({ fila }: { fila: RutaOcupacion }) {
  const porcentaje = ocupacion(fila.vendidos, fila.capacidad)
  const { etiqueta, color } = nivelOcupacion(porcentaje)
  const radio = 42
  const circunferencia = 2 * Math.PI * radio
  const anguloMeta = (META_OCUPACION / 100) * 2 * Math.PI - Math.PI / 2
  const vacios = fila.capacidad - fila.vendidos
  const [origen, destino] = fila.nombre.split(' → ')

  return (
    <li className="hover-elevar flex flex-col items-center rounded-xl bg-surface-sunken p-4 text-center">
      <svg viewBox="0 0 100 100" className="size-32" role="img" aria-label={`${fila.nombre}: ${porcentaje.toFixed(0)} % de ocupación (${etiqueta}), ${fila.vendidos} de ${fila.capacidad} asientos`}>
        <circle cx="50" cy="50" r={radio} fill="none" stroke="var(--color-border)" strokeWidth="9" />
        <circle cx="50" cy="50" r={radio} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(porcentaje / 100) * circunferencia} ${circunferencia}`} transform="rotate(-90 50 50)" />
        <line x1={50 + 34 * Math.cos(anguloMeta)} y1={50 + 34 * Math.sin(anguloMeta)} x2={50 + 50 * Math.cos(anguloMeta)} y2={50 + 50 * Math.sin(anguloMeta)} stroke="var(--color-text-900)" strokeWidth="2" strokeLinecap="round" />
        <text x="50" y="50" textAnchor="middle" className="fill-text-900 font-display" fontSize="20" fontWeight="700">{porcentaje.toFixed(0)}%</text>
        <text x="50" y="65" textAnchor="middle" fontSize="9" fontWeight="600" fill={color}>{etiqueta}</text>
      </svg>
      <p className="mt-2 text-sm font-semibold text-text-900">{origen} <span className="font-normal text-text-400">→</span> {destino}</p>
      <p className="mt-1 text-xs tabular-nums text-text-500">{numero.format(fila.vendidos)} de {numero.format(fila.capacidad)} asientos</p>
      <p className="mt-1 text-xs font-semibold tabular-nums text-text-700">{numero.format(vacios)} asientos vacíos</p>
    </li>
  )
}

function Salida({ fila }: { fila: SalidaEnRiesgo }) {
  const porcentaje = ocupacion(fila.vendidos, fila.capacidad)

  return (
    <li className="hover-elevar rounded-xl border border-border bg-surface-sunken p-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-semibold text-text-900">{fila.ruta}</p><p className="mt-1 text-xs text-text-500">{fila.salida}</p></div>
        <span className="rounded-full bg-warning-50 px-2 py-1 text-xs font-bold tabular-nums text-warning-text">{porcentaje.toFixed(0)} %</span>
      </div>
      <p className="mt-2 text-xs text-text-700">{fila.vendidos} de {fila.capacidad} asientos vendidos</p>
    </li>
  )
}

function Ranking({ titulo, detalle, filas }: { titulo: string; detalle: string; filas: FilaRanking[] }) {
  const ordenadas = [...filas].sort((a, b) => b.ingresos - a.ingresos)
  const destacadas = ordenadas.slice(0, 5)
  const resto = ordenadas.slice(5)
  const mayor = Math.max(...destacadas.map((fila) => fila.ingresos), 1)
  const totalRutas = filas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const ingresosTop = destacadas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const cuotaTop = totalRutas === 0 ? 0 : (ingresosTop / totalRutas) * 100
  const mejorPrecio = [...filas].filter((fila) => fila.pasajes > 0).sort((a, b) => b.ingresos / b.pasajes - a.ingresos / a.pasajes)[0]

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h3 className="font-display text-lg font-bold text-text-900">{titulo}</h3>
      <p className="mt-1 text-sm text-text-500">{detalle}</p>
      <ol className="hover-grupo mt-6 grid grid-cols-5 items-end gap-2 sm:gap-4" aria-label={titulo}>
        {destacadas.map((fila, indice) => {
          const { fondo, texto } = coloresRanking[indice]
          const [origen, destino] = fila.nombre.split(' → ')
          const alto = Math.max((fila.ingresos / mayor) * 100, 16)
          return (
            <li key={fila.nombre} title={fila.nombre} className="hover-item flex h-full cursor-default flex-col items-center justify-end text-center">
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
      <div className="mt-auto pt-6">
        <div className="rounded-xl bg-surface-sunken p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-text-900">Concentración de ingresos</p>
            <p className="text-xs text-text-500">{filas.length} rutas en total</p>
          </div>
          <div className="hover-grupo mt-3 flex h-4 rounded-full bg-surface-card" role="img" aria-label={`Las 5 rutas principales suman el ${cuotaTop.toFixed(0)} % de los ingresos`}>
            {destacadas.map((fila, indice) => <div key={fila.nombre} title={`${fila.nombre}: ${moneda.format(fila.ingresos)}`} className="hover-item h-full cursor-default first:rounded-l-full" style={{ width: `${totalRutas === 0 ? 0 : (fila.ingresos / totalRutas) * 100}%`, backgroundColor: coloresRanking[indice].fondo }} />)}
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div><dt className="text-text-500">Top 5</dt><dd className="mt-0.5 text-base font-bold tabular-nums text-text-900">{cuotaTop.toFixed(0)} %</dd><dd className="tabular-nums text-text-500">{moneda.format(ingresosTop)}</dd></div>
            <div><dt className="text-text-500">Otras {resto.length} rutas</dt><dd className="mt-0.5 text-base font-bold tabular-nums text-text-900">{(100 - cuotaTop).toFixed(0)} %</dd><dd className="tabular-nums text-text-500">{moneda.format(totalRutas - ingresosTop)}</dd></div>
            <div><dt className="text-text-500">Mejor precio prom.</dt><dd className="mt-0.5 text-base font-bold tabular-nums text-text-900">{mejorPrecio ? moneda.format(mejorPrecio.ingresos / mejorPrecio.pasajes) : '—'}</dd><dd className="truncate text-text-500" title={mejorPrecio?.nombre}>{mejorPrecio?.nombre ?? ''}</dd></div>
          </dl>
        </div>
      </div>
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

/** Reparte 100 asientos entre los servicios según su participación (conserva el total). */
function asientosPorServicio(valores: number[]): number[] {
  const total = valores.reduce((suma, valor) => suma + valor, 0)
  if (total === 0) return valores.map(() => 0)
  const cuotas = valores.map((valor) => (valor / total) * 100)
  const enteros = cuotas.map(Math.floor)
  const orden = cuotas.map((cuota, indice) => ({ indice, resto: cuota - enteros[indice] })).sort((a, b) => b.resto - a.resto)
  for (let i = 0; i < 100 - enteros.reduce((suma, valor) => suma + valor, 0); i++) enteros[orden[i].indice]++
  return enteros
}

function Servicios({ filas }: { filas: FilaRanking[] }) {
  const [metrica, setMetrica] = useState<'ingresos' | 'pasajes'>('ingresos')
  const [activo, setActivo] = useState<number | null>(null)
  const total = filas.reduce((suma, fila) => suma + fila[metrica], 0)
  const cantidades = asientosPorServicio(filas.map((fila) => fila[metrica]))
  const asientos = cantidades.flatMap((cantidad, indice) => Array.from({ length: cantidad }, () => indice))
  const elegido = activo ?? 0
  const porPrecio = [...filas].filter((f) => f.pasajes > 0).sort((a, b) => b.ingresos / b.pasajes - a.ingresos / a.pasajes)
  const caro = porPrecio[0]
  const barato = porPrecio[porPrecio.length - 1]
  const fila = filas[elegido]
  const porcentaje = total === 0 ? 0 : (fila[metrica] / total) * 100
  // Bus visto desde arriba: 4 filas de asientos (2 + pasillo + 2) y 25 columnas.
  const columnas = 25
  const filasBus = [0, 1, 2, 3]

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-text-900">Distribución por servicio</h3>
          <p className="mt-1 text-sm text-text-500">Un bus de 100 asientos: cada asiento es 1 % de los {metrica}</p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-surface-sunken p-1" role="group" aria-label="Distribuir por">
          {(['ingresos', 'pasajes'] as const).map((opcion) => (
            <button key={opcion} type="button" onClick={() => setMetrica(opcion)} aria-pressed={metrica === opcion} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${metrica === opcion ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900'}`}>{opcion}</button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-stretch rounded-[1.25rem] border-2 border-border-strong bg-surface-sunken p-2" role="img" aria-label={filas.map((f, i) => `${f.nombre}: ${cantidades[i]} %`).join(', ')}>
          <div className="mr-1.5 flex w-7 shrink-0 flex-col items-center justify-center rounded-l-xl border-r-2 border-dashed border-border-strong text-text-400">
            <SteeringWheel />
          </div>
          <div className="grid flex-1 gap-y-0.5" style={{ gridTemplateRows: '1fr 1fr 0.6fr 1fr 1fr' }}>
            {filasBus.map((filaBus) => (
              <div key={filaBus} className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))`, gridRow: filaBus < 2 ? filaBus + 1 : filaBus + 2 }}>
                {Array.from({ length: columnas }, (_, columna) => {
                  const servicio = asientos[columna * 4 + filaBus]
                  const apagado = activo !== null && servicio !== activo
                  return (
                    <Armchair key={columna} strokeWidth={2.4} aria-hidden="true"
                      className={`hover-celda mx-auto h-auto w-full max-w-[18px] cursor-pointer ${apagado ? 'opacity-15' : 'opacity-100'}`}
                      style={{ color: coloresServicio[servicio] ?? 'var(--color-border)' }}
                      onMouseEnter={() => setActivo(servicio)} onMouseLeave={() => setActivo(null)} />
                  )
                })}
              </div>
            ))}
            <div className="flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.3em] text-text-400" style={{ gridRow: 3 }}>pasillo</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ul className="space-y-1.5">
          {filas.map((servicio, indice) => (
            <li key={servicio.nombre}>
              <button type="button" onMouseEnter={() => setActivo(indice)} onMouseLeave={() => setActivo(null)} onFocus={() => setActivo(indice)} onBlur={() => setActivo(null)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${elegido === indice ? 'bg-surface-sunken' : 'hover:bg-surface-sunken'}`}>
                <Armchair size={16} strokeWidth={2.4} style={{ color: coloresServicio[indice] }} aria-hidden="true" />
                <span className="font-medium text-text-900">{servicio.nombre}</span>
                <span className="ml-auto font-semibold tabular-nums text-text-900">{cantidades[indice]} %</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="rounded-xl border p-4" style={{ borderColor: coloresServicio[elegido] }} aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-bold text-text-900"><Armchair size={18} strokeWidth={2.4} style={{ color: coloresServicio[elegido] }} aria-hidden="true" />{fila.nombre}</p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums text-text-900">{porcentaje.toFixed(1)} %</p>
          <dl className="mt-2 space-y-1 text-xs text-text-700">
            <div className="flex justify-between gap-2"><dt>Ingresos</dt><dd className="font-semibold tabular-nums text-text-900">{moneda.format(fila.ingresos)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Pasajes</dt><dd className="font-semibold tabular-nums text-text-900">{numero.format(fila.pasajes)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Precio promedio</dt><dd className="font-semibold tabular-nums text-text-900">{fila.pasajes === 0 ? '—' : moneda.format(fila.ingresos / fila.pasajes)}</dd></div>
          </dl>
          {activo === null && <p className="mt-2 text-[11px] text-text-400">Pasa el mouse por un asiento o servicio</p>}
        </div>
      </div>
      <div className="mt-auto pt-5">
        <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-sunken p-4 text-xs">
          <div><p className="text-text-500">Precio más alto</p><p className="mt-0.5 text-base font-bold tabular-nums text-text-900">{caro ? moneda.format(caro.ingresos / caro.pasajes) : '—'}</p><p className="text-text-500">{caro?.nombre}</p></div>
          <div><p className="text-text-500">Precio más bajo</p><p className="mt-0.5 text-base font-bold tabular-nums text-text-900">{barato ? moneda.format(barato.ingresos / barato.pasajes) : '—'}</p><p className="text-text-500">{barato?.nombre}</p></div>
        </div>
      </div>
    </article>
  )
}

function SteeringWheel() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 14.5V21M9.6 11.2 3.5 9.5M14.4 11.2l6.1-1.7" />
    </svg>
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
          <li key={titulo} className="hover-elevar flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
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
export function PanoramaRutas({ datos, periodo, web, agencia }: PropsPanorama) {
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
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-700">
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ backgroundColor: 'var(--color-success-500)' }} />Buena (75 % o más)</span>
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ backgroundColor: 'var(--color-warning-500)' }} />Regular (60–74 %)</span>
          <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ backgroundColor: 'var(--color-danger-500)' }} />Baja (menos de 60 %)</span>
          <span className="flex items-center gap-1.5"><i className="h-3 w-0.5 rounded-full bg-text-900" />Meta 75 %</span>
        </div>
        <ul className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{datos.ocupacionPorRuta.map((fila) => <MedidorOcupacion key={fila.nombre} fila={fila} />)}</ul>
      </article>

      <OrigenesDestinos web={web} agencia={agencia} />

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
