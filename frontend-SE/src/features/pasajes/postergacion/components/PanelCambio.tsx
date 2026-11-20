import { Armchair, ArrowDown, Bus, Clock, Hash, Wallet } from 'lucide-react'
import { formatearPrecio, textoSalida } from '@/features/clientes/utils/boleto'
import type { AsientoElegido } from '@/features/ticketing/types'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearFechaLarga, nombrePropio } from '@/utils/formato'
import { formatearMomento, plazoPostergacionMs, type ComparacionTarifa, type EscenarioTarifa } from '../reglas'

interface PanelCambioProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta | null
  asiento: AsientoElegido | null
  comparacion: ComparacionTarifa | null
}

const ETIQUETA_ESCENARIO: Record<EscenarioTarifa, { texto: (c: ComparacionTarifa, moneda: string) => string; clase: string }> = {
  IGUAL: { texto: () => 'Misma tarifa · sin cobro', clase: 'bg-surface-sunken text-text-700' },
  SUPERIOR: { texto: (c, m) => `Por cobrar ${formatearPrecio(c.montoAPagar, m)}`, clase: 'bg-status-low/15 text-warning-text' },
  INFERIOR: { texto: (c, m) => `${formatearPrecio(c.montoNoDevuelto, m)} no se devuelve`, clase: 'bg-accent-50 text-accent-text' },
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: typeof Bus; etiqueta: string; valor: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icono className="h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-text-500">{etiqueta}</dt>
        <dd className="truncate text-[13px] font-semibold tabular-nums text-text-900">{valor}</dd>
      </div>
    </div>
  )
}

function Ruta({ origen, destino }: { origen: string; destino: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="min-w-0 flex-1 break-words font-display text-[17px] font-semibold leading-tight text-text-900">{origen}</p>
      <span className="flex w-8 shrink-0 items-center gap-1 text-text-400" aria-hidden="true">
        <span className="h-px flex-1 border-t border-dashed border-border-strong" />
        <Bus className="h-3.5 w-3.5 shrink-0" />
      </span>
      <p className="min-w-0 flex-1 break-words text-right font-display text-[17px] font-semibold leading-tight text-text-900">{destino}</p>
    </div>
  )
}

export function PanelCambio({ pasaje, viaje, asiento, comparacion }: PanelCambioProps) {
  const moneda = pasaje.moneda
  const pasajero = nombrePropio(pasaje.pasajero)

  return (
    <div className="flex flex-col gap-3">
      <section aria-label="Pasaje actual" className="relative overflow-hidden rounded-2xl border border-border bg-surface-card p-4 shadow-panel">
        <span className="absolute inset-y-0 left-0 w-1 bg-border-strong" aria-hidden="true" />
        <div className="flex items-center justify-between gap-2 pl-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Pasaje actual</p>
          <p className="flex items-center gap-1 text-xs tabular-nums text-text-500">
            <Hash className="h-3 w-3" aria-hidden="true" />
            {pasaje.numeroBoleto}
          </p>
        </div>
        <p className="mt-2 truncate pl-1 text-sm font-medium text-text-900">{pasajero}</p>
        <div className="mt-3 pl-1">
          <Ruta origen={pasaje.origen} destino={pasaje.destino} />
          <p className="mt-1.5 text-xs tabular-nums text-text-500">{textoSalida(pasaje)}</p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-sunken/70 px-3 py-2.5">
          <Dato icono={Armchair} etiqueta="Asiento" valor={`${pasaje.asiento ?? '—'}${pasaje.piso ? ` · P${pasaje.piso}` : ''}`} />
          <Dato icono={Bus} etiqueta="Bus" valor={pasaje.bus ?? '—'} />
          <Dato icono={Wallet} etiqueta="Pagado" valor={formatearPrecio(pasaje.precio, moneda)} />
        </dl>
        <p className="mt-3 flex items-center gap-1.5 pl-1 text-xs text-text-500">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Postergable hasta el <span className="font-medium tabular-nums text-text-700">{formatearMomento(plazoPostergacionMs(pasaje))}</span>
        </p>
      </section>

      <div className="flex justify-center" aria-hidden="true">
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface-card text-text-500 shadow-sm">
          <ArrowDown className="h-4 w-4" />
        </span>
      </div>

      <section
        aria-label="Nuevo pasaje"
        className={cn(
          'relative overflow-hidden rounded-2xl border p-4 transition-colors duration-200',
          viaje ? 'border-accent-line bg-surface-selected shadow-panel' : 'border-dashed border-border-strong bg-transparent',
        )}
      >
        {viaje && <span className="absolute inset-y-0 left-0 w-1 bg-accent-line" aria-hidden="true" />}
        <p className="pl-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Nuevo pasaje</p>
        {viaje ? (
          <div className="animate-fade-in">
            <div className="mt-3 pl-1">
              <Ruta origen={viaje.origen} destino={viaje.destino} />
              <p className="mt-1.5 text-xs tabular-nums text-text-500">
                {formatearFechaLarga(viaje.fechaSalida)} · {viaje.horaSalida}
              </p>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-surface-card/70 px-3 py-2.5">
              <Dato icono={Armchair} etiqueta="Asiento" valor={asiento ? `${asiento.numero} · P${asiento.piso}` : 'Pendiente'} />
              <Dato icono={Bus} etiqueta="Servicio" valor={viaje.tipoBus} />
              <Dato icono={Wallet} etiqueta="Tarifa" valor={asiento ? formatearPrecio(asiento.precio, moneda) : 'Pendiente'} />
            </dl>
            {comparacion && (
              <p className={cn('mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold', ETIQUETA_ESCENARIO[comparacion.escenario].clase)}>
                {ETIQUETA_ESCENARIO[comparacion.escenario].texto(comparacion, moneda)}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 pl-1 text-sm text-text-500">Elige el viaje al que se postergará el pasaje.</p>
        )}
      </section>
    </div>
  )
}
