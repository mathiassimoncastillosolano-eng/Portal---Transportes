import { useState } from 'react'
import { Flag, MapPin, Trophy } from 'lucide-react'
import type { Canal, Totales } from './modelo'
import { participacion } from './modelo'
import { datosDetalleEjemplo, type VentaDetalle } from './datosDetalleEjemplo'

interface Props {
  web: Totales
  agencia: Totales
}

interface Ciudad {
  nombre: string
  pasajes: number
  ingresos: number
}

type Filtro = 'todos' | Canal

const numero = new Intl.NumberFormat('es-PE')
const VISIBLES = 8
/** Paletas pastel: orígenes en tonos cálidos y destinos en tonos fríos. El texto encima va oscuro. */
const coloresOrigen = ['#8fd3a8', '#c9a7e8', '#f4b6cf', '#f7d48a', '#8fcfe0', '#c3ccd5']
const coloresDestino = ['#9bbcf0', '#d3b3ef', '#93dcd2', '#f4b6cf', '#b9d98f', '#c3ccd5']
const textoSobrePastel = '#1f2a37'

function agruparCiudades(filas: VentaDetalle[], lado: 'origen' | 'destino'): Ciudad[] {
  const grupos = new Map<string, Ciudad>()
  for (const fila of filas) {
    const [origen, destino] = fila.ruta.split(' → ')
    const nombre = lado === 'origen' ? origen : destino
    const grupo = grupos.get(nombre) ?? { nombre, pasajes: 0, ingresos: 0 }
    grupo.pasajes += fila.pasajes
    grupo.ingresos += fila.ingresos
    grupos.set(nombre, grupo)
  }
  return [...grupos.values()].filter((ciudad) => ciudad.pasajes > 0).sort((a, b) => b.pasajes - a.pasajes)
}

function RankingCiudades({ titulo, detalle, ciudades, Icono, paleta }: { titulo: string; detalle: string; ciudades: Ciudad[]; Icono: typeof MapPin; paleta: string[] }) {
  const [verTodas, setVerTodas] = useState(false)
  const total = ciudades.reduce((suma, ciudad) => suma + ciudad.pasajes, 0)
  const mayor = Math.max(...ciudades.map((ciudad) => ciudad.pasajes), 1)
  const lider = ciudades[0]
  const visibles = verTodas ? ciudades : ciudades.slice(0, VISIBLES)

  return (
    <article className="flex flex-col rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 font-display text-lg font-bold text-text-900"><Icono size={18} aria-hidden="true" />{titulo}</h3>
      <p className="mt-1 text-sm text-text-500">{detalle}</p>
      {lider && (
        <div className="mt-4 flex items-center gap-3 rounded-xl p-4" style={{ backgroundColor: paleta[0], color: textoSobrePastel }}>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/45"><Trophy size={22} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">Primer lugar</p>
            <p className="truncate font-display text-xl font-bold">{lider.nombre}</p>
            <p className="text-xs tabular-nums opacity-85">{numero.format(lider.pasajes)} pasajes · {participacion(lider.pasajes, total).toFixed(0)} % del total</p>
          </div>
        </div>
      )}
      <ol className="hover-grupo mt-4 space-y-2">
        {visibles.map((ciudad, indice) => {
          const color = indice < 5 ? paleta[indice] : paleta[5]
          return (
            <li key={ciudad.nombre} className="hover-item hover-horizontal grid cursor-default grid-cols-[1.75rem_7.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-lg">
              <span className="flex size-7 items-center justify-center rounded-full text-xs font-bold tabular-nums" style={{ backgroundColor: color, color: textoSobrePastel }}>{indice + 1}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-text-900"><MapPin size={14} className="shrink-0" style={{ color }} aria-hidden="true" /><span className="truncate">{ciudad.nombre}</span></span>
              <span className="h-3 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><span className="block h-full rounded-full" style={{ width: `${(ciudad.pasajes / mayor) * 100}%`, backgroundColor: color }} /></span>
              <span className="text-right text-xs tabular-nums text-text-700"><strong className="text-text-900">{numero.format(ciudad.pasajes)}</strong> · {participacion(ciudad.pasajes, total).toFixed(0)} %</span>
            </li>
          )
        })}
      </ol>
      {ciudades.length > VISIBLES && (
        <button type="button" onClick={() => setVerTodas(!verTodas)} className="mt-auto self-start pt-4 text-sm font-semibold text-accent-text hover:underline">
          {verTodas ? 'Ver menos' : `Ver las ${ciudades.length} ciudades`}
        </button>
      )}
    </article>
  )
}

/** Orígenes y destinos de toda la red, con opción de ver un solo canal. */
export function OrigenesDestinos({ web, agencia }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const filas = [
    ...(filtro !== 'agencia' ? datosDetalleEjemplo('web', web) : []),
    ...(filtro !== 'web' ? datosDetalleEjemplo('agencia', agencia) : []),
  ]
  const opciones: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'todos', etiqueta: 'Todos' }, { valor: 'web', etiqueta: 'Web' }, { valor: 'agencia', etiqueta: 'Agencia' },
  ]

  return (
    <section aria-labelledby="origenes-destinos-titulo" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="origenes-destinos-titulo" className="font-display text-xl font-bold text-text-900">Orígenes y destinos</h2>
          <p className="mt-1 text-sm text-text-500">Desde dónde salen y a dónde llegan los pasajeros, por pasajes vendidos</p>
        </div>
        <div className="inline-flex rounded-xl border border-border bg-surface-card p-1 shadow-sm" role="group" aria-label="Canal">
          {opciones.map(({ valor, etiqueta }) => (
            <button key={valor} type="button" onClick={() => setFiltro(valor)} aria-pressed={filtro === valor}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${filtro === valor ? 'bg-surface-sunken text-text-900' : 'text-text-500 hover:text-text-900'}`}>{etiqueta}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankingCiudades titulo="¿Desde dónde viajan más?" detalle="Ciudades de origen" ciudades={agruparCiudades(filas, 'origen')} Icono={MapPin} paleta={coloresOrigen} />
        <RankingCiudades titulo="¿A dónde llegan más?" detalle="Ciudades de destino" ciudades={agruparCiudades(filas, 'destino')} Icono={Flag} paleta={coloresDestino} />
      </div>
    </section>
  )
}
