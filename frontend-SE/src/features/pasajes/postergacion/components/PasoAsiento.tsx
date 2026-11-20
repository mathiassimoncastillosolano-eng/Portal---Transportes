import { X } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { SeatMap } from '@/features/ticketing/components/SeatMap'
import type { AsientoElegido } from '@/features/ticketing/types'
import { contarAsientos } from '@/features/ticketing/utils/viajes'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import type { ViajeHistorial } from '@/types/cliente'
import type { AsientoConsulta, ViajeConsulta } from '@/types/consultaViaje'
import { formatearFechaCorta } from '@/utils/formato'
import { obtenerMapaMock } from '../datosMock'

interface PasoAsientoProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta
  asiento: AsientoElegido | null
  onElegir: (asiento: AsientoElegido | null) => void
}

export function PasoAsiento({ pasaje, viaje, asiento, onElegir }: PasoAsientoProps) {
  const { data: mapa, cargando, error, reintentar } = useAsyncResource(`mapa-${viaje.id}`, () => obtenerMapaMock(pasaje, viaje))

  function alternar(a: AsientoConsulta) {
    onElegir(a.idAsiento === asiento?.idAsiento ? null : { idAsiento: a.idAsiento, numero: a.numero, piso: a.piso, precio: a.precio ?? 0 })
  }

  const conteo = mapa ? contarAsientos(mapa) : null
  const precios = mapa ? mapa.porPiso.flatMap((p) => p.asientos).filter((a) => a.estado === 'disponible').map((a) => a.precio ?? 0) : []
  const hayRango = precios.length > 0 && Math.min(...precios) !== Math.max(...precios)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">Elige el nuevo asiento</h3>
        <p className="mt-0.5 text-sm text-text-500">
          Al confirmar, el asiento nuevo queda ocupado y el asiento {pasaje.asiento ?? 'original'} vuelve a estar disponible.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-text-700">
        <span className="font-semibold text-text-900">
          {viaje.origen} → {viaje.destino}
        </span>
        <span className="tabular-nums">
          {formatearFechaCorta(viaje.fechaSalida)} · {viaje.horaSalida} h
        </span>
        <span className="rounded-md border border-border-strong bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
          {viaje.tipoBus}
        </span>
        {conteo && (
          <span className="ml-auto text-xs tabular-nums text-text-500">
            {conteo.disponibles} de {conteo.total} disponibles
          </span>
        )}
      </div>

      {cargando ? (
        <div role="status" aria-label="Cargando mapa de asientos" className="flex justify-center">
          <Skeleton className="h-[420px] w-full max-w-[260px] rounded-[28px]" />
        </div>
      ) : error || !mapa ? (
        <ErrorState title="No pudimos cargar el mapa de asientos" description="Inténtalo de nuevo." onRetry={reintentar} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3">
            {asiento ? (
              <p className="text-sm font-medium text-text-700" aria-live="polite">
                Asiento <span className="font-semibold text-text-900">{asiento.numero}</span> · Piso {asiento.piso} ·{' '}
                <span className="font-semibold tabular-nums text-text-900">{formatearPrecio(asiento.precio, pasaje.moneda)}</span>
              </p>
            ) : (
              <p className="text-sm text-text-500" aria-live="polite">
                Selecciona un asiento disponible del mapa.
              </p>
            )}
            {hayRango && !asiento && (
              <p className="text-xs tabular-nums text-text-500">
                Tarifas por asiento: {formatearPrecio(Math.min(...precios), pasaje.moneda)} – {formatearPrecio(Math.max(...precios), pasaje.moneda)}
              </p>
            )}
            {asiento && (
              <button
                type="button"
                onClick={() => onElegir(null)}
                className="inline-flex items-center gap-1 rounded-full border border-accent-line/40 bg-accent-line/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-accent-text transition-colors hover:border-danger-500/50 hover:bg-danger-500/10"
                aria-label={`Quitar asiento ${asiento.numero}`}
              >
                Quitar
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>

          <SeatMap pisos={mapa.porPiso} elegidos={asiento ? [asiento] : []} procesando={null} puedeSeleccionarMas onToggle={alternar} />
        </>
      )}
    </div>
  )
}
