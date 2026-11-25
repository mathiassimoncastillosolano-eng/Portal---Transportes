import { ArrowDown, ArrowRight, Clock, Ticket } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatearPrecio, textoSalida } from '@/features/clientes/utils/boleto'
import type { AsientoElegido } from '@/features/ticketing/types'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearFechaLarga } from '@/utils/formato'
import { formatearMomento, plazoCambioMs } from '../reglas'

interface PanelCambioProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta | null
  asiento: AsientoElegido | null
}

/** Boleto con franja de color arriba, corte perforado y datos abajo (mismo estilo que "Ver boleto"). */
function Boleto({ franja, etiqueta, origen, destino, fecha, datos }: {
  franja: string
  etiqueta: ReactNode
  origen: string
  destino: string
  fecha: string
  datos: { titulo: string; valor: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-card shadow-panel ring-1 ring-border">
      <div className={cn('px-4 pb-4 pt-3.5 text-white', franja)}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75">{etiqueta}</div>
        <div className="mt-2.5 flex items-center gap-2">
          <p className="min-w-0 flex-1 break-words font-display text-lg font-semibold leading-tight">{origen}</p>
          <ArrowRight className="h-4 w-4 shrink-0 text-white/70" aria-hidden="true" />
          <p className="min-w-0 flex-1 break-words text-right font-display text-lg font-semibold leading-tight">{destino}</p>
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-white/80">{fecha}</p>
      </div>
      <div className="relative" aria-hidden="true">
        <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full bg-surface-sunken" />
        <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full bg-surface-sunken" />
        <div className="mx-3 border-t border-dashed border-border-strong" />
      </div>
      <dl className="grid grid-cols-3 gap-2 px-4 py-3">
        {datos.map((d) => (
          <div key={d.titulo} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-500">{d.titulo}</dt>
            <dd className="mt-0.5 truncate text-[13px] font-semibold tabular-nums text-text-900">{d.valor}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function PanelCambio({ pasaje, viaje, asiento }: PanelCambioProps) {
  const moneda = pasaje.moneda

  return (
    <div className="flex flex-col">
      <Boleto
        franja="bg-[image:var(--gradient-brand-deep)]"
        etiqueta={
          <>
            <span>Pasaje actual</span>
            <span className="tabular-nums normal-case tracking-normal">{pasaje.numeroBoleto}</span>
          </>
        }
        origen={pasaje.origen}
        destino={pasaje.destino}
        fecha={textoSalida(pasaje)}
        datos={[
          { titulo: 'Asiento', valor: `${pasaje.asiento ?? '—'}${pasaje.piso ? ` · P${pasaje.piso}` : ''}` },
          { titulo: 'Bus', valor: pasaje.bus ?? '—' },
          { titulo: 'Pagado', valor: formatearPrecio(pasaje.precio, moneda) },
        ]}
      />
      <p className="mt-2 flex items-center gap-1.5 text-xs text-text-500">
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Cambiable hasta el <span className="font-semibold tabular-nums text-text-700">{formatearMomento(plazoCambioMs(pasaje))}</span>
      </p>

      <div className="my-3 flex justify-center" aria-hidden="true">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-ink-700 to-accent-500 text-white shadow-panel">
          <ArrowDown className="h-4 w-4" />
        </span>
      </div>

      {viaje ? (
        <div className="animate-fade-in">
          <Boleto
            franja="bg-gradient-to-br from-ink-700 via-ink-600 to-accent-500"
            etiqueta={<span>Nuevo pasaje</span>}
            origen={viaje.origen}
            destino={viaje.destino}
            fecha={`${formatearFechaLarga(viaje.fechaSalida)} · ${viaje.horaSalida}`}
            datos={[
              { titulo: 'Asiento', valor: asiento ? `${asiento.numero} · P${asiento.piso}` : 'Por elegir' },
              { titulo: 'Bus', valor: viaje.tipoBus },
              { titulo: 'Tarifa', valor: asiento ? formatearPrecio(asiento.precio, moneda) : '—' },
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border-strong px-4 py-7 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-card text-text-400 ring-1 ring-border">
            <Ticket className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-text-700">Nuevo pasaje</p>
          <p className="text-xs text-text-500">Aparecerá aquí al elegir el viaje.</p>
        </div>
      )}
    </div>
  )
}
