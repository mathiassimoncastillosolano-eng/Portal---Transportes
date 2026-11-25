import { CalendarDays, Loader2, MousePointerClick } from 'lucide-react'
import { useState } from 'react'
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
import { cn } from '@/utils/cn'
import { formatearFechaCorta } from '@/utils/formato'
import { ContadorReserva } from './ContadorReserva'
import { EncabezadoPaso } from './EncabezadoPaso'

interface PasoAsientoProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta
  asiento: AsientoElegido | null
  apartando: number | null
  cotizacion: CotizacionCambio | null
  expiraEn: number | null
  onAlternar: (asiento: AsientoConsulta) => void
  onAsientoLiberado: (idAsiento: number) => void
}

export function PasoAsiento({ pasaje, viaje, asiento, apartando, cotizacion, expiraEn, onAlternar, onAsientoLiberado }: PasoAsientoProps) {
  // Mapa en tiempo real (el mismo de Registrar pasaje): si el Portal u otra agencia toma un asiento, se ve al instante.
  const { mapa, cargando, error, recargar } = useMapaAsientos(viaje.id, (evento: EventoAsiento) => {
    if (evento.estado === 'disponible') onAsientoLiberado(evento.idAsiento)
  })
  const [pisoElegido, setPisoElegido] = useState<number | null>(null)

  const pisos = mapa?.porPiso ?? []
  // Se muestra un piso a la vez (como en el Portal). Por defecto, el del asiento elegido o el primero.
  const pisoVisible = pisos.find((p) => p.piso === (pisoElegido ?? asiento?.piso)) ?? pisos[0]
  const conteo = mapa ? contarAsientos(mapa) : null
  const moneda = pasaje.moneda

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPaso paso={3} titulo="Elija el asiento" extra={<ContadorReserva expiraEn={expiraEn} />} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-route-50 px-4 py-3 text-sm ring-1 ring-route-100">
        <span className="font-display font-semibold text-text-900">
          {viaje.origen} → {viaje.destino}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums text-text-700">
          <CalendarDays className="h-4 w-4 text-route-500" aria-hidden="true" />
          {formatearFechaCorta(viaje.fechaSalida)} · {viaje.horaSalida}
        </span>
        <span className="rounded-md bg-surface-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-route-600 ring-1 ring-route-100">
          {viaje.tipoBus}
        </span>
        {conteo && (
          <span className="ml-auto text-xs tabular-nums text-text-500">
            {conteo.disponibles} de {conteo.total} libres
          </span>
        )}
      </div>

      {cargando ? (
        <div role="status" aria-label="Cargando mapa de asientos" className="flex justify-center">
          <Skeleton className="h-[420px] w-full max-w-[260px] rounded-[28px]" />
        </div>
      ) : error || !mapa || !pisoVisible ? (
        <ErrorState title="No pudimos cargar el mapa de asientos" description={error ?? 'Inténtalo de nuevo.'} onRetry={recargar} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex flex-col items-center gap-3">
            {pisos.length > 1 && (
              <div role="tablist" aria-label="Piso del bus" className="inline-flex rounded-full bg-surface-sunken p-1 ring-1 ring-border">
                {pisos.map((p) => {
                  const activo = p.piso === pisoVisible.piso
                  const libres = p.asientos.filter((a) => a.estado === 'disponible').length
                  return (
                    <button
                      key={p.piso}
                      type="button"
                      role="tab"
                      aria-selected={activo}
                      onClick={() => setPisoElegido(p.piso)}
                      className={cn(
                        'rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                        activo ? 'bg-[image:var(--gradient-brand-deep)] text-white shadow-panel' : 'text-text-500 hover:text-text-900',
                      )}
                    >
                      Piso {p.piso} <span className={cn('ml-1 text-xs font-medium', activo ? 'text-white/70' : 'text-text-400')}>{libres} libres</span>
                    </button>
                  )
                })}
              </div>
            )}
            <div className="w-full">
              <SeatMap pisos={[pisoVisible]} elegidos={asiento ? [asiento] : []} procesando={apartando} puedeSeleccionarMas onToggle={onAlternar} />
            </div>
          </div>

          <div aria-live="polite" className="overflow-hidden rounded-2xl bg-surface-card shadow-panel ring-1 ring-border xl:sticky xl:top-0">
            {apartando !== null ? (
              <p className="flex items-center gap-2 p-4 text-sm text-text-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Reservando…
              </p>
            ) : asiento ? (
              <>
                <div className="bg-gradient-to-br from-ink-700 via-ink-600 to-accent-500 px-4 py-3 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">Asiento elegido</p>
                  <p className="font-display text-3xl font-semibold leading-tight">{asiento.numero}</p>
                  <p className="text-xs text-white/80">Piso {asiento.piso}</p>
                </div>
                <dl className="flex flex-col gap-1.5 px-4 py-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-500">Ya pagó</dt>
                    <dd className="font-semibold tabular-nums text-text-900">{cotizacion ? formatearPrecio(cotizacion.importePagado, moneda) : '…'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-500">Nueva tarifa</dt>
                    <dd className="font-semibold tabular-nums text-text-900">{formatearPrecio(asiento.precio, moneda)}</dd>
                  </div>
                </dl>
                {/* Lo que el agente le dice al cliente desde ya, antes de confirmar. */}
                <p
                  className={cn(
                    'border-t border-border-subtle px-4 py-2.5 text-center text-sm font-semibold',
                    !cotizacion && 'text-text-400',
                    cotizacion?.escenario === 'SUPERIOR' && 'bg-warning-50 text-warning-text',
                    cotizacion?.escenario === 'INFERIOR' && 'bg-accent-50 text-accent-text',
                    cotizacion?.escenario === 'IGUAL' && 'text-text-700',
                  )}
                >
                  {!cotizacion
                    ? 'Calculando…'
                    : cotizacion.escenario === 'SUPERIOR'
                      ? `Debe pagar ${formatearPrecio(cotizacion.montoAPagar, moneda)}`
                      : cotizacion.escenario === 'INFERIOR'
                        ? `${formatearPrecio(cotizacion.montoNoDevuelto, moneda)} no se devuelven`
                        : 'Sin costo adicional'}
                </p>
              </>
            ) : (
              <p className="flex items-start gap-2 p-4 text-sm text-text-500">
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-route-500" aria-hidden="true" />
                Toque un asiento libre. Para soltarlo, tóquelo otra vez.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
