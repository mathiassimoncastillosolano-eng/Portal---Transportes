import { useEffect, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowLeft, ArrowUpRight, Building2, CalendarClock, CalendarDays, CreditCard, Globe2, Minus, Repeat, RotateCcw } from 'lucide-react'
import type { Canal, Totales } from './modelo'
import { participacion, variacion } from './modelo'
import { ciudadesSalidaEjemplo, datosDetalleEjemplo } from './datosDetalleEjemplo'
import {
  anticipacionEjemplo, cambiosConDiferenciaEjemplo, comprasPorHorarioEjemplo, diasSemana, franjasHorarias,
  agenciasEjemplo, incidenciasCanalEjemplo, metodosPagoEjemplo, participacionAgencia, vendedoresEjemplo, type Segmento,
} from './datosCanalEjemplo'
import { ConversionPortal } from './OperacionDashboard'
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
const coloresSegmento = ['var(--color-chart-1)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)']

function Variacion({ valor, texto }: { valor: number | null; texto: string }) {
  const Icono = valor === null || Math.abs(valor) < 0.05 ? Minus : valor > 0 ? ArrowUpRight : ArrowDownRight
  const color = valor !== null && valor < 0 ? 'text-red-600' : 'text-accent-text'
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

function BarrasSegmento({ filas, color }: { filas: Segmento[]; color: string }) {
  const total = filas.reduce((suma, fila) => suma + fila.pasajes, 0)
  return (
    <ul className="mt-5 space-y-4">
      {filas.map((fila) => {
        const porcentaje = participacion(fila.pasajes, total)
        return (
          <li key={fila.nombre}>
            <div className="flex items-baseline justify-between gap-3 text-sm"><span className="font-medium text-text-900">{fila.nombre}</span><span className="tabular-nums text-text-700"><strong className="text-text-900">{porcentaje.toFixed(0)} %</strong> · {numero.format(fila.pasajes)} pasajes</span></div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${porcentaje}%`, backgroundColor: color }} /></div>
          </li>
        )
      })}
    </ul>
  )
}

function MetodosPago({ filas }: { filas: Segmento[] }) {
  const total = filas.reduce((suma, fila) => suma + fila.ingresos, 0)
  return (
    <>
      <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-surface-sunken" role="img" aria-label={filas.map((fila) => `${fila.nombre} ${participacion(fila.ingresos, total).toFixed(0)} %`).join(', ')}>
        {filas.map((fila, indice) => <div key={fila.nombre} className="h-full" style={{ width: `${participacion(fila.ingresos, total)}%`, backgroundColor: coloresSegmento[indice] }} />)}
      </div>
      <ul className="mt-5 space-y-3">
        {filas.map((fila, indice) => (
          <li key={fila.nombre} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-2 text-text-900"><i className="size-2.5 rounded-full" style={{ backgroundColor: coloresSegmento[indice] }} />{fila.nombre}</span>
            <span className="tabular-nums text-text-700">{moneda.format(fila.ingresos)} · <strong className="text-text-900">{participacion(fila.ingresos, total).toFixed(0)} %</strong></span>
          </li>
        ))}
      </ul>
    </>
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
                const intensidad = Math.round(12 + (valor / mayor) * 78)
                return <td key={franjasHorarias[columna]} className="h-9 rounded-md text-center font-semibold tabular-nums" style={{ backgroundColor: `color-mix(in srgb, ${color} ${intensidad}%, transparent)`, color: intensidad > 55 ? 'white' : 'var(--color-text-900)' }} title={`${diasSemana[indice]} ${franjasHorarias[columna]}: ${valor} pasajes`}>{valor}</td>
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
      <div className="flex items-center gap-2 text-sm text-text-700"><span className="text-route-500">{icono}</span>{titulo}</div>
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

function RankingBarras({ filas, color, unaColumna = false }: { filas: Resumen[]; color: string; unaColumna?: boolean }) {
  const mayor = Math.max(...filas.map((fila) => fila.ingresos), 1)
  return (
    <ol className={`mt-6 grid gap-5 ${unaColumna ? '' : 'lg:grid-cols-2'}`}>
      {filas.map((fila, indice) => (
        <li key={fila.nombre}>
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm"><span className="min-w-0 font-medium"><span className="mr-2 text-text-400">{indice + 1}.</span>{fila.nombre}</span><span className="ml-auto text-right tabular-nums"><strong className="block">{moneda.format(fila.ingresos)}</strong><span className="text-xs text-text-500">{numero.format(fila.pasajes)} pasajes</span></span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-sunken" aria-hidden="true"><div className="h-full rounded-full" style={{ width: `${(fila.ingresos / mayor) * 100}%`, backgroundColor: color }} /></div>
        </li>
      ))}
    </ol>
  )
}

export function DetalleCanal({ canal, onClose, periodo, onPeriodoChange, totales, anteriores, otroCanal, integrado = false }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [servicio, setServicio] = useState('todos')
  const [ciudadSalida, setCiudadSalida] = useState('todas')
  const [agenciaId, setAgenciaId] = useState('todas')
  const esWeb = canal === 'web'
  const agenciasCiudad = agenciasEjemplo.filter((agencia) => agencia.ciudad === ciudadSalida)
  const agenciaElegida = agenciasCiudad.find((agencia) => String(agencia.id) === agenciaId)
  const factorAgencia = agenciaElegida ? participacionAgencia(ciudadSalida, agenciaElegida.id) : 1
  const filas = datosDetalleEjemplo(canal, totales)
  const servicios = [...new Set(filas.map((fila) => fila.servicio))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtradas = filas.filter((fila) =>
    (servicio === 'todos' || fila.servicio === servicio) &&
    (esWeb || ciudadSalida === 'todas' || fila.ciudadSalida === ciudadSalida),
  ).map((fila) => factorAgencia === 1 ? fila : {
    ...fila,
    pasajes: Math.round(fila.pasajes * factorAgencia),
    ingresos: Math.round(fila.ingresos * factorAgencia),
    viajes: Math.round(fila.viajes * factorAgencia),
  })
  const pasajes = filtradas.reduce((suma, fila) => suma + fila.pasajes, 0)
  const ingresos = filtradas.reduce((suma, fila) => suma + fila.ingresos, 0)
  const proporcion = totales.pasajes === 0 ? 0 : pasajes / totales.pasajes
  const filtrado: Totales = { pasajes, ingresos, compras: Math.round(totales.compras * proporcion) }

  const rutas = agrupar(filtradas, 'ruta')
  const sedes = ciudadSalida === 'todas' || esWeb
    ? agrupar(filtradas, 'ciudadSalida')
    : agenciasCiudad
      .filter((agencia) => !agenciaElegida || agencia.id === agenciaElegida.id)
      .map((agencia) => {
        const factor = participacionAgencia(ciudadSalida, agencia.id) / factorAgencia
        return { nombre: agencia.nombre, pasajes: Math.round(pasajes * factor), ingresos: Math.round(ingresos * factor), viajes: 0 }
      })
      .sort((a, b) => b.ingresos - a.ingresos)
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
  const color = esWeb ? 'var(--color-accent-500)' : 'var(--color-route-500)'
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

        <section aria-label="Filtros del canal" className={`grid gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6 ${esWeb ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          {!esWeb && <label className="space-y-2 text-sm font-semibold text-text-700">Sede (ciudad de salida)
            <select value={ciudadSalida} onChange={(evento) => { setCiudadSalida(evento.target.value); setAgenciaId('todas') }} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500">
              <option value="todas">Todas las sedes</option>
              {ciudadesSalidaEjemplo.map((ciudad) => <option key={ciudad} value={ciudad}>{ciudad}</option>)}
            </select>
          </label>}
          {!esWeb && <label className="space-y-2 text-sm font-semibold text-text-700">Agencia
            <select value={agenciaId} onChange={(evento) => setAgenciaId(evento.target.value)} disabled={ciudadSalida === 'todas'} className="block w-full rounded-xl border border-border bg-surface-card px-3 py-2.5 font-normal text-text-900 outline-none focus:border-accent-500 disabled:cursor-not-allowed disabled:opacity-60">
              <option value="todas">{ciudadSalida === 'todas' ? 'Elige primero una sede' : `Todas las agencias de ${ciudadSalida} (${agenciasCiudad.length})`}</option>
              {agenciasCiudad.map((agencia) => <option key={agencia.id} value={agencia.id}>{agencia.nombre}</option>)}
            </select>
            {agenciaElegida && <span className="block text-xs font-normal text-text-500">{agenciaElegida.direccion}</span>}
          </label>}
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
          <Indicador titulo="Ticket promedio" valor={sinVentas ? '—' : precio.format(ticket)} pie={sinVentas ? 'Sin ventas con estos filtros' : <Variacion valor={variacion(ticket, ticketOtro)} texto={`vs. ${nombreOtro} (${precio.format(ticketOtro)})`} />} />
          <Indicador titulo="Pasajes por compra" valor={decimal.format(pasajesPorCompra)} pie={<Variacion valor={variacion(pasajesPorCompra, pasajesPorCompraAntes)} texto="vs. período anterior" />} />
        </section>

        {sinVentas ? <p className="rounded-xl bg-surface-sunken p-4 text-sm text-text-500">{esWeb ? 'No hay ventas simuladas para este servicio.' : 'No hay ventas simuladas para esta sede, agencia y servicio.'}</p> : <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Anticipación de compra" detalle={esWeb ? 'Días entre la compra y la salida · útil para planificar promociones' : 'Días entre la compra y la salida · en mostrador predomina la venta del mismo día'}>
              <BarrasSegmento filas={anticipacion} color={color} />
            </Tarjeta>
            <Tarjeta titulo="Método de pago" detalle={esWeb ? 'Participación en ingresos del portal' : 'Participación en ingresos · sirve para cuadrar caja por sede'}>
              <MetodosPago filas={metodos} />
            </Tarjeta>
          </div>

          {esWeb ? (
            <Tarjeta titulo="¿Cuándo compran en la web?" detalle="Pasajes por día de la semana y franja horaria de compra">
              <MapaHorario valores={comprasPorHorarioEjemplo(filtrado)} color={color} />
            </Tarjeta>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <Tarjeta titulo={ciudadSalida === 'todas' ? 'Ventas por sede' : `Ventas por agencia · ${ciudadSalida}`} detalle="Ordenado por ingresos netos">
                <RankingBarras filas={sedes.slice(0, 6)} color={color} unaColumna />
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
                    <div className="flex items-center gap-2 text-sm text-text-700"><span className="text-route-500"><Repeat size={18} aria-hidden="true" /></span>Cambios de viaje con diferencia</div>
                    <p className="mt-2 font-display text-2xl font-bold tabular-nums text-text-900">{numero.format(cambios.conCobro)} <span className="text-sm font-semibold text-text-500">de {numero.format(cambios.cambios)} cambios</span></p>
                    <p className="mt-1 text-xs text-text-500">{moneda.format(cambios.montoCobrado)} cobrados por diferencia de tarifa</p>
                  </li>}
            </ul>
          </Tarjeta>

          <section aria-labelledby="rutas-canal-titulo" className="rounded-2xl border border-border bg-surface-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div><h2 id="rutas-canal-titulo" className="font-display text-lg font-bold">Ranking de rutas</h2><p className="mt-1 text-sm text-text-500">Ordenado por ingresos netos · {nombreCanal}</p></div>
              <p className="text-sm text-text-700">Ingresos del filtro: <strong className="tabular-nums text-text-900">{moneda.format(ingresos)}</strong></p>
            </div>
            <RankingBarras filas={rutas.slice(0, 6)} color={color} />
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
