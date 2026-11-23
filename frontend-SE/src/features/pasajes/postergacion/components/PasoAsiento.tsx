import { Loader2, Radio } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { SeatMap } from '@/features/ticketing/components/SeatMap'
import { useMapaAsientos } from '@/features/ticketing/hooks/useMapaAsientos'
import type { AsientoElegido } from '@/features/ticketing/types'
import { contarAsientos } from '@/features/ticketing/utils/viajes'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { CotizacionCambio } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import type { AsientoConsulta, EventoAsiento, ViajeConsulta } from '@/types/consultaViaje'
import { formatearFechaCorta } from '@/utils/formato'

interface PasoAsientoProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta
  asiento: AsientoElegido | null
  apartando: number | null
  cotizacion: CotizacionCambio | null
  onAlternar: (asiento: AsientoConsulta) => void
  onAsientoLiberado: (idAsiento: number) => void
}

export function PasoAsiento({ pasaje, viaje, asiento, apartando, cotizacion, onAlternar, onAsientoLiberado }: PasoAsientoProps) {
  // Mapa en tiempo real (mismo que Registrar pasaje): si otra agencia o el Portal toma un asiento, se ve al instante.
  const { mapa, cargando, error, enVivo, recargar } = useMapaAsientos(viaje.id, (evento: EventoAsiento) => {
    if (evento.estado === 'disponible') onAsientoLiberado(evento.idAsiento)
  })

  const conteo = mapa ? contarAsientos(mapa) : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">Elija el nuevo asiento</h3>
        <p className="mt-0.5 text-sm text-text-500">
          El asiento queda reservado unos minutos. Al confirmar, queda ocupado y el asiento {pasaje.asiento ?? 'actual'} vuelve a estar disponible.
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
        {enVivo && (
          <span className="inline-flex items-center gap-1 text-xs text-accent-text">
            <Radio className="h-3 w-3" aria-hidden="true" /> En vivo
          </span>
        )}
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
        <ErrorState title="No pudimos cargar el mapa de asientos" description={error ?? 'Inténtalo de nuevo.'} onRetry={recargar} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3" aria-live="polite">
            {apartando !== null ? (
              <p className="flex items-center gap-2 text-sm text-text-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reservando el asiento…
              </p>
            ) : asiento ? (
              <p className="text-sm font-medium text-text-700">
                Asiento <span className="font-semibold text-text-900">{asiento.numero}</span> · Piso {asiento.piso} ·{' '}
                <span className="font-semibold tabular-nums text-text-900">{formatearPrecio(asiento.precio, pasaje.moneda)}</span>
                {!cotizacion && <span className="ml-2 text-xs text-text-500">Calculando tarifa…</span>}
              </p>
            ) : (
              <p className="text-sm text-text-500">Seleccione un asiento disponible del mapa. Para soltarlo, vuelva a hacer clic en él.</p>
            )}
          </div>

          <SeatMap pisos={mapa.porPiso} elegidos={asiento ? [asiento] : []} procesando={apartando} puedeSeleccionarMas onToggle={onAlternar} />
        </>
      )}
    </div>
  )
}
