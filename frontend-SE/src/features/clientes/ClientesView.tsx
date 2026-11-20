import { ArrowDown, ArrowUp, CalendarCheck, ChevronLeft, ChevronRight, ChevronsUpDown, Search, Ticket, UserCheck, Users, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { clientesService } from '@/services'
import type { ActividadCliente, ClienteResumen, ConsultaClientes, OrdenCliente } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { formatearFechaHora, formatearNumero, nombrePropio } from '@/utils/formato'
import { ClienteDetalle } from './components/ClienteDetalle'

const ACTIVIDADES: { id: ActividadCliente; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'proximos', label: 'Con próximos viajes' },
  { id: 'realizados', label: 'Con viajes realizados' },
  { id: 'sin-viajes', label: 'Sin viajes' },
]

const TAMANOS = [10, 20, 50]

const COLUMNAS: { orden: OrdenCliente; label: string; className?: string }[] = [
  { orden: 'nombre', label: 'Pasajero' },
  { orden: 'documento', label: 'Documento' },
  { orden: 'viajes', label: 'Viajes', className: 'text-right' },
  { orden: 'ultimo', label: 'Último viaje' },
  { orden: 'proximo', label: 'Próximo viaje' },
]

const consultaInicial: ConsultaClientes = {
  q: '',
  tipoDocumento: '',
  actividad: 'todos',
  orden: 'nombre',
  direccion: 'asc',
  pagina: 0,
  tamano: 10,
}

function useRetardo<T>(valor: T, ms: number): T {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const temporizador = window.setTimeout(() => setRetardado(valor), ms)
    return () => window.clearTimeout(temporizador)
  }, [valor, ms])
  return retardado
}

function Indicador({ etiqueta, valor, icono: Icono, cargando }: { etiqueta: string; valor: number | undefined; icono: typeof Users; cargando: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-text">
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">{etiqueta}</p>
        {cargando ? (
          <Skeleton className="mt-1.5 h-7 w-16" />
        ) : (
          <p className="font-display text-[26px] font-semibold leading-tight tabular-nums text-text-900">
            {valor === undefined ? '—' : formatearNumero(valor)}
          </p>
        )}
      </div>
    </Card>
  )
}

function FilaCliente({ cliente, onAbrir }: { cliente: ClienteResumen; onAbrir: () => void }) {
  const nombre = nombrePropio(`${cliente.nombres} ${cliente.apellidos}`.trim())
  return (
    <tr
      onClick={onAbrir}
      className="cursor-pointer border-t border-border-subtle transition-colors duration-150 hover:bg-surface-hover"
    >
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAbrir()
          }}
          className="flex min-w-0 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line"
        >
          <Avatar name={nombre} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text-900">{nombre}</span>
            <span className="block truncate text-xs text-text-500">{cliente.telefono ?? 'Sin teléfono'}</span>
          </span>
        </button>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-text-700">
        <span className="mr-1.5 text-xs text-text-500">{cliente.tipoDocumento}</span>
        {cliente.numeroDocumento}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-text-900">{cliente.viajes}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-text-700">{cliente.ultimoViaje ? formatearFechaHora(cliente.ultimoViaje) : '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums text-text-700">{cliente.proximoViaje ? formatearFechaHora(cliente.proximoViaje) : '—'}</td>
      <td className="w-8 px-3 py-3 text-text-400">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </td>
    </tr>
  )
}

export function ClientesView() {
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState(consultaInicial)
  const [abierto, setAbierto] = useState<number | null>(null)
  const q = useRetardo(busqueda, 350)

  const parametros = useMemo(() => ({ ...consulta, q }), [consulta, q])
  const clave = JSON.stringify(parametros)

  const { data: pagina, cargando, error, reintentar } = useAsyncResource(clave, () => clientesService.listar(parametros))
  const { data: indicadores, cargando: cargandoIndicadores } = useAsyncResource('clientes-indicadores', () => clientesService.indicadores())

  const [qAnterior, setQAnterior] = useState(q)
  if (qAnterior !== q) {
    setQAnterior(q)
    setConsulta((c) => ({ ...c, pagina: 0 }))
  }

  const total = pagina?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / consulta.tamano))
  const desde = total === 0 ? 0 : consulta.pagina * consulta.tamano + 1
  const hasta = Math.min(total, (consulta.pagina + 1) * consulta.tamano)
  const hayFiltros = busqueda !== '' || consulta.tipoDocumento !== '' || consulta.actividad !== 'todos'

  function cambiar(parcial: Partial<ConsultaClientes>) {
    setConsulta((c) => ({ ...c, ...parcial, pagina: 'pagina' in parcial ? (parcial.pagina as number) : 0 }))
  }

  function ordenarPor(orden: OrdenCliente) {
    setConsulta((c) => ({
      ...c,
      orden,
      direccion: c.orden === orden && c.direccion === 'asc' ? 'desc' : 'asc',
      pagina: 0,
    }))
  }

  function restablecer() {
    setBusqueda('')
    setConsulta(consultaInicial)
  }

  const tipos = [{ value: '', label: 'Todos los documentos' }, ...(indicadores?.tiposDocumento ?? []).map((t) => ({ value: t, label: t }))]

  return (
    <PageContainer title="Clientes" description="Pasajeros registrados, su actividad y el historial de sus viajes.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Pasajeros" valor={indicadores?.totalPasajeros} icono={UsersRound} cargando={cargandoIndicadores} />
        <Indicador etiqueta="Con próximos viajes" valor={indicadores?.conViajesProximos} icono={CalendarCheck} cargando={cargandoIndicadores} />
        <Indicador etiqueta="Con viajes realizados" valor={indicadores?.conViajesRealizados} icono={UserCheck} cargando={cargandoIndicadores} />
        <Indicador etiqueta="Pasajes confirmados" valor={indicadores?.pasajesConfirmados} icono={Ticket} cargando={cargandoIndicadores} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Input
              id="clientes-busqueda"
              label="Buscar"
              placeholder="Nombre, apellido, DNI o documento"
              iconLeft={<Search className="h-4 w-4" aria-hidden="true" />}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              containerClassName="flex-1"
              autoComplete="off"
            />
            <Select
              label="Documento"
              containerClassName="md:w-56"
              value={consulta.tipoDocumento}
              onChange={(tipoDocumento) => cambiar({ tipoDocumento })}
              options={tipos}
            />
            {hayFiltros && (
              <Button variant="ghost" onClick={restablecer} iconLeft={<X className="h-4 w-4" aria-hidden="true" />}>
                Restablecer
              </Button>
            )}
          </div>

          <div role="group" aria-label="Actividad" className="flex flex-wrap gap-1.5">
            {ACTIVIDADES.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-pressed={consulta.actividad === a.id}
                onClick={() => cambiar({ actividad: a.id })}
                className={cn(
                  'inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors duration-150 active:scale-[0.97]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                  consulta.actividad === a.id
                    ? 'border-accent-line bg-accent-line/12 text-text-900'
                    : 'border-border text-text-700 hover:border-border-strong hover:bg-surface-hover',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState title="No pudimos cargar los clientes" description="Revisa tu conexión e inténtalo de nuevo." onRetry={reintentar} />
          </div>
        ) : !cargando && pagina && pagina.contenido.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="No se encontraron clientes"
              description="Prueba con otro nombre o documento, o quita algún filtro."
              action={
                hayFiltros ? (
                  <Button variant="outline" size="sm" onClick={restablecer}>
                    Restablecer filtros
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <caption className="sr-only">Lista de clientes</caption>
              <thead>
                <tr>
                  {COLUMNAS.map((c) => {
                    const activa = consulta.orden === c.orden
                    return (
                      <th
                        key={c.orden}
                        scope="col"
                        aria-sort={activa ? (consulta.direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className={cn('px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-500', c.className)}
                      >
                        <button
                          type="button"
                          onClick={() => ordenarPor(c.orden)}
                          className={cn(
                            'inline-flex items-center gap-1 uppercase tracking-[0.08em] transition-colors hover:text-text-900',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                            activa && 'text-text-900',
                          )}
                        >
                          {c.label}
                          {activa ? (
                            consulta.direccion === 'asc' ? (
                              <ArrowUp className="h-3 w-3" aria-hidden="true" />
                            ) : (
                              <ArrowDown className="h-3 w-3" aria-hidden="true" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />
                          )}
                        </button>
                      </th>
                    )
                  })}
                  <th scope="col" className="w-8" />
                </tr>
              </thead>
              <tbody>
                {cargando || !pagina
                  ? Array.from({ length: consulta.tamano > 10 ? 10 : consulta.tamano }, (_, i) => (
                      <tr key={i} className="border-t border-border-subtle">
                        {Array.from({ length: 6 }, (_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <Skeleton className="h-4 w-full max-w-[140px]" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : pagina.contenido.map((c) => <FilaCliente key={c.idPasajero} cliente={c} onAbrir={() => setAbierto(c.idPasajero)} />)}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-text-500 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="tabular-nums">
            {total === 0 ? 'Sin resultados' : `Mostrando ${desde}–${hasta} de ${formatearNumero(total)}`}
          </p>
          <div className="flex items-center gap-3">
            <Select
              ariaLabel="Filas por página"
              containerClassName="w-28"
              value={String(consulta.tamano)}
              onChange={(v) => cambiar({ tamano: Number(v) })}
              options={TAMANOS.map((t) => ({ value: String(t), label: `${t} / pág.` }))}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={consulta.pagina === 0 || cargando}
                onClick={() => cambiar({ pagina: consulta.pagina - 1 })}
                aria-label="Página anterior"
                iconLeft={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
              >
                Anterior
              </Button>
              <span className="px-2 tabular-nums">
                {consulta.pagina + 1} / {paginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={consulta.pagina + 1 >= paginas || cargando}
                onClick={() => cambiar({ pagina: consulta.pagina + 1 })}
                aria-label="Página siguiente"
                iconRight={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <ClienteDetalle idPasajero={abierto} onClose={() => setAbierto(null)} />
    </PageContainer>
  )
}
