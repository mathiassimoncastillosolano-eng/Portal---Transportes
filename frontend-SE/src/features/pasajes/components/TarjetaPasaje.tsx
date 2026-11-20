import { Armchair, Bus, FileText, Hash, UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { FaseViaje } from '@/types/cliente'
import type { Pasaje } from '@/types/listadoPasajes'
import { cn } from '@/utils/cn'
import { nombrePropio } from '@/utils/formato'
import { ETIQUETA_ESTADO, formatearPrecio, textoLlegada, textoSalida } from '@/features/clientes/utils/boleto'

const FASE: Record<FaseViaje, { etiqueta: string; franja: string }> = {
  PROXIMO: { etiqueta: 'Próximo', franja: 'bg-accent-line' },
  REALIZADO: { etiqueta: 'Realizado', franja: 'bg-border-strong' },
  NO_REALIZADO: { etiqueta: 'No realizado', franja: 'bg-border' },
  SIN_INFORMACION: { etiqueta: 'Sin información', franja: 'bg-border' },
}

interface TarjetaPasajeProps {
  pasaje: Pasaje
  onBoleto: () => void
  onCliente: () => void
}

export function TarjetaPasaje({ pasaje, onBoleto, onCliente }: TarjetaPasajeProps) {
  const fase = FASE[pasaje.fase]
  const llegada = textoLlegada(pasaje)
  const pasajero = nombrePropio(pasaje.pasajero)
  const tono = pasaje.estadoPasaje === 'CONFIRMADA' ? 'success' : pasaje.estadoPasaje === 'REEMBOLSADA' ? 'warning' : 'neutral'

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-card shadow-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel-hover">
      <span className={cn('absolute inset-y-0 left-0 w-1', fase.franja)} aria-hidden="true" />

      <div className="flex items-center justify-between gap-3 px-5 pt-4 pl-6">
        <p className="flex min-w-0 items-center gap-1.5 text-xs font-medium tabular-nums text-text-500">
          <Hash className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{pasaje.numeroBoleto}</span>
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge tone="neutral">{fase.etiqueta}</Badge>
          <Badge tone={tono}>{ETIQUETA_ESTADO[pasaje.estadoPasaje]}</Badge>
        </div>
      </div>

      <div className="flex items-start gap-3 px-5 pt-5 pl-6">
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-lg font-semibold leading-tight text-text-900">{pasaje.origen}</p>
          <p className="mt-1.5 text-xs tabular-nums text-text-500">{textoSalida(pasaje)}</p>
        </div>
        <div className="flex min-w-10 flex-1 items-center gap-1.5 pt-2 text-text-400" aria-hidden="true">
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
          <Bus className="h-4 w-4 shrink-0" />
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="break-words font-display text-lg font-semibold leading-tight text-text-900">{pasaje.destino}</p>
          <p className="mt-1.5 text-xs tabular-nums text-text-500">{llegada ? `Llega ${llegada}` : 'Llegada sin registrar'}</p>
        </div>
      </div>

      <div className="relative mt-5" aria-hidden="true">
        <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full border border-border bg-surface-sunken" />
        <span className="absolute -right-2.5 -top-2.5 h-5 w-5 rounded-full border border-border bg-surface-sunken" />
        <div className="mx-4 border-t border-dashed border-border-strong" />
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-4 pl-6">
        <button
          type="button"
          onClick={onCliente}
          className="flex min-w-0 items-center gap-3 rounded-xl text-left transition-colors hover:bg-surface-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line"
          aria-label={`Ver cliente ${pasajero}`}
        >
          <Avatar name={pasajero || 'Pasajero'} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text-900">{pasajero || 'Pasajero sin nombre'}</span>
            <span className="block truncate text-xs tabular-nums text-text-500">{pasaje.documento || 'Sin documento'}</span>
          </span>
          <UserRound className="h-4 w-4 shrink-0 text-text-400 transition-colors group-hover:text-text-700" aria-hidden="true" />
        </button>

        <dl className="grid grid-cols-3 divide-x divide-border-subtle rounded-lg bg-surface-sunken/60 py-2.5 text-xs">
          <div className="flex min-w-0 items-center gap-2 px-3">
            <Armchair className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-text-500">Asiento</dt>
              <dd className="mt-0.5 truncate font-semibold text-text-900">{`${pasaje.asiento ?? '—'}${pasaje.piso ? ` · P${pasaje.piso}` : ''}`}</dd>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 px-3">
            <Bus className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-text-500">Bus</dt>
              <dd className="mt-0.5 truncate font-semibold text-text-900">{pasaje.bus ?? '—'}</dd>
            </div>
          </div>
          <div className="min-w-0 px-3">
            <dt className="text-text-500">Compra</dt>
            <dd className="mt-0.5 truncate font-semibold tabular-nums text-text-900">{pasaje.codigoCompra}</dd>
          </div>
        </dl>

        <div className="mt-auto flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-500">Precio</p>
            <p className="font-display text-xl font-semibold tabular-nums text-text-900">{formatearPrecio(pasaje.precio, pasaje.moneda)}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={!pasaje.documentoDisponible}
            onClick={onBoleto}
            iconLeft={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Ver boleto
          </Button>
        </div>
      </div>
    </li>
  )
}
