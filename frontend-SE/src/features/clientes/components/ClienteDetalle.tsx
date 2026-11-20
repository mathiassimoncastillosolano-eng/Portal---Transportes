import { useMemo, useState } from 'react'
import { Armchair, Bus, Cake, CalendarClock, CalendarDays, FileText, Fingerprint, Phone, Ticket, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { clientesService } from '@/services'
import { useToastStore } from '@/stores/toastStore'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import { formatearFecha, formatearFechaHora, nombrePropio } from '@/utils/formato'
import { ETIQUETA_ESTADO, formatearPrecio, textoLlegada, textoSalida } from '../utils/boleto'
import { BoletoModal } from './BoletoModal'

interface ClienteDetalleProps {
  idPasajero: number | null
  onClose: () => void
}

type Pestana = 'proximos' | 'realizados' | 'otros'

const BORDE_FASE: Record<ViajeHistorial['fase'], string> = {
  PROXIMO: 'border-l-accent-line',
  REALIZADO: 'border-l-border-strong',
  NO_REALIZADO: 'border-l-border',
  SIN_INFORMACION: 'border-l-border',
}

function edadDe(fechaNacimiento: string): number | null {
  const nacimiento = new Date(fechaNacimiento)
  if (Number.isNaN(nacimiento.getTime())) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const cumpleHecho =
    hoy.getMonth() > nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate())
  if (!cumpleHecho) edad -= 1
  return edad >= 0 ? edad : null
}

function Estadistica({ etiqueta, valor, icono: Icono }: { etiqueta: string; valor: string; icono: LucideIcon }) {
  return (
    <div className="min-w-0 rounded-xl border border-border-subtle bg-surface-sunken/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-text-500">
        <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <dt className="truncate text-[10px] font-semibold uppercase tracking-[0.08em]">{etiqueta}</dt>
      </div>
      <dd className="mt-1.5 truncate font-display text-xl font-semibold tabular-nums text-text-900">{valor}</dd>
    </div>
  )
}

function Dato({ etiqueta, valor, icono: Icono }: { etiqueta: string; valor: string; icono: LucideIcon }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-text-500">
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] text-text-500">{etiqueta}</dt>
        <dd className="truncate text-[13px] font-medium text-text-900">{valor}</dd>
      </div>
    </div>
  )
}

function TarjetaViaje({ viaje, onBoleto }: { viaje: ViajeHistorial; onBoleto: () => void }) {
  const pushToast = useToastStore((s) => s.push)
  const llegada = textoLlegada(viaje)
  return (
    <li className={cn('rounded-xl border border-l-4 border-border bg-surface-card p-4', BORDE_FASE[viaje.fase])}>
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium tabular-nums text-text-500">Boleto {viaje.numeroBoleto}</p>
        <Badge tone={viaje.estadoPasaje === 'CONFIRMADA' ? 'success' : viaje.estadoPasaje === 'REEMBOLSADA' ? 'warning' : 'neutral'}>
          {ETIQUETA_ESTADO[viaje.estadoPasaje]}
        </Badge>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-base font-semibold leading-tight text-text-900">{viaje.origen}</p>
          <p className="mt-1 text-xs tabular-nums text-text-500">{textoSalida(viaje)}</p>
        </div>
        <div className="flex min-w-12 flex-1 items-center gap-1.5 pt-1 text-text-400" aria-hidden="true">
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
          <Bus className="h-4 w-4 shrink-0" />
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="break-words text-base font-semibold leading-tight text-text-900">{viaje.destino}</p>
          <p className="mt-1 text-xs tabular-nums text-text-500">{llegada ? `Llega ${llegada}` : 'Llegada sin registrar'}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-border-subtle rounded-lg bg-surface-sunken/60 py-2.5 text-xs">
        <div className="flex min-w-0 items-center gap-2 px-3">
          <Armchair className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-text-500">Asiento</dt>
            <dd className="mt-0.5 truncate font-semibold text-text-900">{`${viaje.asiento ?? '—'}${viaje.piso ? ` · P${viaje.piso}` : ''}`}</dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 px-3">
          <Bus className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-text-500">Bus</dt>
            <dd className="mt-0.5 truncate font-semibold text-text-900">{viaje.bus ?? '—'}</dd>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 px-3">
          <Wallet className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-text-500">Precio</dt>
            <dd className="mt-0.5 truncate font-semibold tabular-nums text-text-900">{formatearPrecio(viaje.precio, viaje.moneda)}</dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-3">
        {viaje.fase === 'PROXIMO' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => pushToast({ tone: 'info', title: 'Postergar pasaje', description: 'Esta opción estará disponible próximamente.' })}
            iconLeft={<CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Postergar este pasaje
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={!viaje.documentoDisponible}
          onClick={onBoleto}
          iconLeft={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Ver boleto
        </Button>
      </div>
    </li>
  )
}

export function ClienteDetalle({ idPasajero, onClose }: ClienteDetalleProps) {
  const { data, cargando, error, reintentar } = useAsyncResource(idPasajero === null ? null : `cliente-${idPasajero}`, () =>
    clientesService.detalle(idPasajero as number),
  )
  const [pestana, setPestana] = useState<Pestana>('proximos')
  const [idPrevio, setIdPrevio] = useState(idPasajero)
  if (idPrevio !== idPasajero) {
    setIdPrevio(idPasajero)
    setPestana('proximos')
  }
  const [boleto, setBoleto] = useState<ViajeHistorial | null>(null)

  const grupos = useMemo(() => {
    const historial = data?.historial ?? []
    return {
      proximos: historial.filter((v) => v.fase === 'PROXIMO'),
      realizados: historial.filter((v) => v.fase === 'REALIZADO'),
      otros: historial.filter((v) => v.fase !== 'PROXIMO' && v.fase !== 'REALIZADO'),
    }
  }, [data])

  const totalPagado = useMemo(() => {
    const confirmados = (data?.historial ?? []).filter((v) => v.estadoPasaje === 'CONFIRMADA' && v.precio !== null)
    if (confirmados.length === 0) return '—'
    return formatearPrecio(
      confirmados.reduce((suma, v) => suma + (v.precio ?? 0), 0),
      confirmados[0].moneda,
    )
  }, [data])

  const pestanas: { id: Pestana; label: string }[] = [
    { id: 'proximos', label: 'Próximos' },
    { id: 'realizados', label: 'Realizados' },
    ...(grupos.otros.length > 0 ? [{ id: 'otros' as Pestana, label: 'Otros' }] : []),
  ]
  const lista = grupos[pestana]
  const nombre = data ? nombrePropio(`${data.nombres} ${data.apellidos}`.trim()) : ''
  const edad = data?.fechaNacimiento ? edadDe(data.fechaNacimiento) : null

  return (
    <>
      <Drawer
        open={idPasajero !== null}
        onClose={onClose}
        side="right"
        widthClassName="w-full max-w-[640px]"
        aria-label="Detalle del cliente"
        panelClassName="flex flex-col bg-surface-card"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-5">
          {data ? (
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={nombre} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-semibold text-text-900">{nombre}</h2>
                <p className="mt-0.5 truncate text-sm tabular-nums text-text-500">
                  {data.tipoDocumento} {data.numeroDocumento}
                </p>
                <div className="mt-2">
                  <Badge tone={data.proximoViaje ? 'success' : 'neutral'}>
                    {data.proximoViaje ? `Próximo viaje ${formatearFecha(data.proximoViaje)}` : data.viajes > 0 ? 'Sin viajes próximos' : 'Aún sin viajes'}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className="h-16 w-64" />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-500 transition-colors hover:bg-surface-hover hover:text-text-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {cargando ? (
            <div role="status" aria-label="Cargando cliente" className="flex flex-col gap-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-28 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : error || !data ? (
            <ErrorState title="No pudimos cargar el cliente" description="Inténtalo de nuevo." onRetry={reintentar} />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <Estadistica etiqueta="Viajes" valor={String(data.viajes)} icono={Ticket} />
                <Estadistica etiqueta="Realizados" valor={String(grupos.realizados.length)} icono={CalendarDays} />
                <Estadistica etiqueta="Próximos" valor={String(grupos.proximos.length)} icono={CalendarClock} />
                <Estadistica etiqueta="Total pagado" valor={totalPagado} icono={Wallet} />
              </dl>

              <section className="mt-6" aria-label="Datos del cliente">
                <h3 className="mb-3 text-sm font-semibold text-text-900">Datos del cliente</h3>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border-subtle p-4 sm:grid-cols-2">
                  <Dato etiqueta="Documento" valor={`${data.tipoDocumento} ${data.numeroDocumento}`} icono={Fingerprint} />
                  <Dato etiqueta="Teléfono" valor={data.telefono ?? 'Sin teléfono'} icono={Phone} />
                  <Dato
                    etiqueta="Nacimiento"
                    valor={data.fechaNacimiento ? `${formatearFecha(data.fechaNacimiento)}${edad !== null ? ` · ${edad} años` : ''}` : '—'}
                    icono={Cake}
                  />
                  <Dato etiqueta="Cliente desde" valor={data.fechaRegistro ? formatearFecha(data.fechaRegistro) : '—'} icono={CalendarDays} />
                  <Dato etiqueta="Primer viaje" valor={data.primerViaje ? formatearFechaHora(data.primerViaje) : '—'} icono={Armchair} />
                  <Dato etiqueta="Último viaje" valor={data.ultimoViaje ? formatearFechaHora(data.ultimoViaje) : '—'} icono={Bus} />
                </dl>
              </section>

              <section className="mt-6" aria-label="Historial de viajes">
                <div className="mb-3 flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-text-400" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-text-900">Historial de viajes</h3>
                </div>

                <div role="tablist" aria-label="Historial de viajes" className="mb-3 inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
                  {pestanas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={pestana === p.id}
                      onClick={() => setPestana(p.id)}
                      className={cn(
                        'h-7 rounded-md px-3 text-[13px] font-medium transition-colors duration-150',
                        pestana === p.id ? 'bg-surface-card text-text-900 shadow-sm' : 'text-text-500 hover:text-text-900',
                      )}
                    >
                      {p.label} <span className="tabular-nums text-text-400">({grupos[p.id].length})</span>
                    </button>
                  ))}
                </div>

                {lista.length === 0 ? (
                  <EmptyState
                    icon={Ticket}
                    title={pestana === 'proximos' ? 'Sin viajes próximos' : pestana === 'realizados' ? 'Sin viajes realizados' : 'Sin viajes'}
                    description="Cuando haya pasajes en esta categoría, aparecerán aquí."
                  />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {lista.map((v) => (
                      <TarjetaViaje key={v.idPasaje} viaje={v} onBoleto={() => setBoleto(v)} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </Drawer>

      <BoletoModal viaje={boleto} onClose={() => setBoleto(null)} />
    </>
  )
}
