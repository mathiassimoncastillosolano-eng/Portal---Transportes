import { ArrowDown, ArrowUp, CalendarCheck, ChevronLeft, ChevronRight, MapPin, Search, Ticket, TicketCheck, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DatePicker } from '@/components/ui/DatePicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useRetardo } from '@/hooks/useRetardo'
import { pasajesService } from '@/services'
import { useUIStore } from '@/stores/uiStore'
import type { Pasaje, ConsultaPasajes, FasePasaje } from '@/types/listadoPasajes'
import { cn } from '@/utils/cn'
import { formatearNumero } from '@/utils/formato'
import { BoletoModal } from '@/features/clientes/components/BoletoModal'
import { ClienteDetalle } from '@/features/clientes/components/ClienteDetalle'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import { TarjetaPasaje } from './components/TarjetaPasaje'

const FASES: { id: FasePasaje; label: string }[] = [
  { id: '', label: 'Todos' },
  { id: 'PROXIMO', label: 'Próximos' },
  { id: 'REALIZADO', label: 'Realizados' },
  { id: 'OTROS', label: 'Otros' },
]

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'REEMBOLSADA', label: 'Reembolsadas' },
  { value: 'SIN_CONFIRMAR', label: 'Sin confirmar' },
]

const ORDENES = [
  { value: 'salida', label: 'Fecha de salida' },
  { value: 'precio', label: 'Precio' },
  { value: 'pasajero', label: 'Pasajero' },
]

const consultaBase: ConsultaPasajes = {
  q: '',
  cliente: null,
  origen: '',
  destino: '',
  desde: '',
  hasta: '',
  estado: '',
  fase: '',
  orden: 'salida',
  direccion: 'desc',
  pagina: 0,
  tamano: 12,
}

function Indicador({ etiqueta, valor, icono: Icono, cargando }: { etiqueta: string; valor: string | undefined; icono: LucideIcon; cargando: boolean }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-text">
        <Icono className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">{etiqueta}</p>
        {cargando ? (
          <Skeleton className="mt-1.5 h-7 w-20" />
        ) : (
          <p className="truncate font-display text-[26px] font-semibold leading-tight tabular-nums text-text-900">{valor ?? '—'}</p>
        )}
      </div>
    </Card>
  )
}

function TarjetaCarga() {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-5">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-16 w-full" />
    </li>
  )
}

export function PasajesView() {
  const [busqueda, setBusqueda] = useState('')
  const [consulta, setConsulta] = useState<ConsultaPasajes>(() => ({
    ...consultaBase,
    cliente: useUIStore.getState().filtroPasajesCliente,
  }))
  const [boleto, setBoleto] = useState<Pasaje | null>(null)
  const [clienteAbierto, setClienteAbierto] = useState<number | null>(null)
  const q = useRetardo(busqueda, 350)

  useEffect(() => {
    useUIStore.getState().setFiltroPasajesCliente(null)
  }, [])

  const parametros = useMemo(() => ({ ...consulta, q }), [consulta, q])
  const clave = JSON.stringify(parametros)

  const { data: pagina, cargando, error, reintentar } = useAsyncResource(clave, () => pasajesService.listar(parametros))
  const { data: opciones } = useAsyncResource('pasajes-opciones', () => pasajesService.opciones())

  const [qAnterior, setQAnterior] = useState(q)
  if (qAnterior !== q) {
    setQAnterior(q)
    setConsulta((c) => ({ ...c, pagina: 0 }))
  }

  const total = pagina?.total ?? 0
  const paginas = Math.max(1, Math.ceil(total / consulta.tamano))
  const desde = total === 0 ? 0 : consulta.pagina * consulta.tamano + 1
  const hasta = Math.min(total, (consulta.pagina + 1) * consulta.tamano)
  const hayFiltros =
    busqueda !== '' ||
    consulta.cliente !== null ||
    consulta.origen !== '' ||
    consulta.destino !== '' ||
    consulta.desde !== '' ||
    consulta.hasta !== '' ||
    consulta.estado !== '' ||
    consulta.fase !== ''

  function cambiar(parcial: Partial<ConsultaPasajes>) {
    setConsulta((c) => ({ ...c, ...parcial, pagina: 'pagina' in parcial ? (parcial.pagina as number) : 0 }))
  }

  function restablecer() {
    setBusqueda('')
    setConsulta((c) => ({ ...consultaBase, orden: c.orden, direccion: c.direccion }))
  }

  const listaOrigenes = [{ value: '', label: 'Cualquier origen' }, ...(opciones?.origenes ?? []).map((o) => ({ value: o, label: o }))]
  const listaDestinos = [{ value: '', label: 'Cualquier destino' }, ...(opciones?.destinos ?? []).map((d) => ({ value: d, label: d }))]
  const resumen = pagina?.resumen

  return (
    <PageContainer title="Pasajes" description="Todos los pasajes vendidos, con filtros por fecha, ruta, cliente y estado.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Pasajes encontrados" valor={pagina ? formatearNumero(pagina.total) : undefined} icono={Ticket} cargando={cargando && !pagina} />
        <Indicador etiqueta="Confirmados" valor={resumen ? formatearNumero(resumen.confirmados) : undefined} icono={TicketCheck} cargando={cargando && !pagina} />
        <Indicador etiqueta="Próximos viajes" valor={resumen ? formatearNumero(resumen.proximos) : undefined} icono={CalendarCheck} cargando={cargando && !pagina} />
        <Indicador etiqueta="Ingresos confirmados" valor={resumen ? formatearPrecio(resumen.ingresos, 'PEN') : undefined} icono={Wallet} cargando={cargando && !pagina} />
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            id="pasajes-busqueda"
            label="Buscar"
            placeholder="Pasajero, documento o número de boleto"
            iconLeft={<Search className="h-4 w-4" aria-hidden="true" />}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            containerClassName="flex-1"
            autoComplete="off"
          />
          <Select
            label="Estado"
            containerClassName="md:w-52"
            value={consulta.estado}
            onChange={(estado) => cambiar({ estado: estado as ConsultaPasajes['estado'] })}
            options={ESTADOS}
          />
          <div className="flex items-end gap-2">
            <Select
              label="Ordenar por"
              containerClassName="md:w-44"
              value={consulta.orden}
              onChange={(orden) => cambiar({ orden: orden as ConsultaPasajes['orden'], pagina: 0 })}
              options={ORDENES}
            />
            <Button
              variant="outline"
              onClick={() => cambiar({ direccion: consulta.direccion === 'asc' ? 'desc' : 'asc', pagina: 0 })}
              aria-label={consulta.direccion === 'asc' ? 'Orden ascendente' : 'Orden descendente'}
              iconLeft={
                consulta.direccion === 'asc' ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Select
            label="Origen"
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            searchable
            value={consulta.origen}
            onChange={(origen) => cambiar({ origen })}
            options={listaOrigenes}
          />
          <Select
            label="Destino"
            icon={<MapPin className="h-4 w-4" aria-hidden="true" />}
            searchable
            value={consulta.destino}
            onChange={(destino) => cambiar({ destino })}
            options={listaDestinos}
          />
          <DatePicker label="Salida desde" value={consulta.desde} max={consulta.hasta || undefined} onChange={(desde) => cambiar({ desde })} />
          <DatePicker label="Salida hasta" value={consulta.hasta} min={consulta.desde || undefined} onChange={(hasta) => cambiar({ hasta })} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="Momento del viaje" className="flex flex-wrap gap-1.5">
            {FASES.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={consulta.fase === f.id}
                onClick={() => cambiar({ fase: f.id })}
                className={cn(
                  'inline-flex h-8 items-center rounded-full border px-3 text-[13px] font-medium transition-colors duration-150 active:scale-[0.97]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
                  consulta.fase === f.id
                    ? 'border-accent-line bg-accent-line/12 text-text-900'
                    : 'border-border text-text-700 hover:border-border-strong hover:bg-surface-hover',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {consulta.cliente && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-accent-line bg-accent-line/12 pl-3 pr-1 text-[13px] font-medium text-text-900">
                <span className="max-w-[220px] truncate">Cliente: {consulta.cliente.nombre}</span>
                <button
                  type="button"
                  onClick={() => cambiar({ cliente: null })}
                  aria-label="Quitar filtro de cliente"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            )}
            {hayFiltros && (
              <Button variant="ghost" size="sm" onClick={restablecer} iconLeft={<X className="h-4 w-4" aria-hidden="true" />}>
                Restablecer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {error ? (
        <ErrorState title="No pudimos cargar los pasajes" description="Revisa tu conexión e inténtalo de nuevo." onRetry={reintentar} />
      ) : !cargando && pagina && pagina.contenido.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No se encontraron pasajes"
          description="Prueba con otras fechas o rutas, o quita algún filtro."
          action={
            hayFiltros ? (
              <Button variant="outline" size="sm" onClick={restablecer}>
                Restablecer filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3" aria-busy={cargando}>
          {cargando || !pagina
            ? Array.from({ length: 6 }, (_, i) => <TarjetaCarga key={i} />)
            : pagina.contenido.map((p) => (
                <TarjetaPasaje key={p.idPasaje} pasaje={p} onBoleto={() => setBoleto(p)} onCliente={() => setClienteAbierto(p.idPasajero)} />
              ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 text-sm text-text-500 sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="tabular-nums">
          {total === 0 ? 'Sin resultados' : `Mostrando ${desde}–${hasta} de ${formatearNumero(total)}`}
        </p>
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

      <ClienteDetalle idPasajero={clienteAbierto} onClose={() => setClienteAbierto(null)} onVerPasajes={(cliente) => {
        setClienteAbierto(null)
        cambiar({ cliente })
      }} />
      <BoletoModal viaje={boleto} onClose={() => setBoleto(null)} />
    </PageContainer>
  )
}
