import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, ChevronDown, ChevronRight, Circle, Route } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { codigoDeAsiento } from '@/utils/asientos'
import { cn } from '@/utils/cn'
import { formatearMoneda } from '@/utils/formato'
import { useAsientos } from '../hooks/useAsientos'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { useViajeInfo } from '../hooks/useViajeInfo'
import { TripTimeline } from './TripTimeline'

const etiquetaSeccion = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-text-500'

function FilaDato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <dt className="text-[13px] text-text-500">{etiqueta}</dt>
      <dd className="min-w-0 truncate text-right text-[13px] font-medium text-text-900">{children}</dd>
    </div>
  )
}

function EstadoVacio() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border-strong text-text-400">
        <Route className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-semibold text-text-900">Selecciona un viaje para comenzar</p>
      <p className="mt-1.5 max-w-[220px] text-xs leading-relaxed text-text-500">
        Aquí aparecerán el horario, la ruta, el servicio y el precio.
      </p>
    </div>
  )
}

/** Itinerario, datos del servicio y asientos/pasajeros elegidos. Es la parte que puede desplazarse dentro del panel. */
function ResumenDetalle() {
  const { viaje, paso, asientos, pasajerosPorAsiento, cantidadPasajes, esAsientoCompleto, irA } = useTicketWizard()
  const { servicio, duracionMin, terminalOrigen, terminalDestino, sede } = useViajeInfo(viaje)
  const { datos } = useAsientos(viaje?.id)
  const codigoDe = (n: number) => (datos ? codigoDeAsiento(n, datos.servicio.distribucion) : String(n))

  if (!viaje) return <EstadoVacio />

  const sinAsientos = cantidadPasajes === 0

  return (
    // `key` por viaje: al cambiar de selección el bloque se anima de nuevo, de forma breve.
    <div key={viaje.id} className="animate-fade-slide-up-sm px-5 pb-4 pt-5">
      <TripTimeline
        origen={viaje.origen}
        destino={viaje.destino}
        hora={viaje.hora}
        duracionMin={duracionMin}
        terminalOrigen={terminalOrigen}
        terminalDestino={terminalDestino}
      />

      <dl className="mt-4 divide-y divide-border-subtle border-t border-border-subtle">
        <FilaDato etiqueta="Servicio">{servicio?.nombre ?? viaje.servicioId}</FilaDato>
        <FilaDato etiqueta="Bus">{servicio?.unidad ?? '—'}</FilaDato>
        <FilaDato etiqueta="Asientos libres">
          <span key={viaje.asientosDisponibles} className="animate-step-swap inline-block tabular-nums">
            {viaje.asientosDisponibles}
          </span>
        </FilaDato>
      </dl>

      {/* Asientos y pasajeros elegidos */}
      <div className="mt-3 border-t border-border-subtle pt-3">
        {sinAsientos ? (
          <button
            type="button"
            onClick={() => irA('asientos')}
            className="group flex w-full items-center justify-between rounded-lg py-1 text-left transition-colors duration-150 hover:text-text-900"
          >
            <span className="text-[13px] text-text-500">Pasajeros</span>
            <span className="flex items-center gap-1 text-[13px] font-medium text-text-900">
              1 pasajero
              <ChevronRight className="h-4 w-4 text-text-400 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </button>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className={etiquetaSeccion}>Asientos ({cantidadPasajes})</p>
              {paso !== 'asientos' && paso !== 'viaje' && (
                <button
                  type="button"
                  onClick={() => irA('asientos')}
                  className="text-[11px] font-medium text-accent-text transition-opacity duration-150 hover:underline"
                >
                  Cambiar
                </button>
              )}
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {asientos.map((n) => (
                <li
                  key={n}
                  className="animate-check-pop rounded-md border border-accent-line/40 bg-accent-line/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-text"
                >
                  {codigoDe(n)}
                </li>
              ))}
            </ul>

            {(paso === 'pasajeros' || paso === 'pago' || paso === 'revision') && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {asientos.map((n) => {
                  const p = pasajerosPorAsiento[n]
                  const completo = esAsientoCompleto(n)
                  const nombre = p && (p.nombres || p.apellidos) ? `${p.nombres} ${p.apellidos}`.trim() : null
                  return (
                    <li key={n} className="flex items-center gap-2 text-[13px]">
                      {completo ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-accent-text" strokeWidth={3} aria-label="Completo" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-text-400" aria-label="Pendiente" />
                      )}
                      <span className="font-medium text-text-900">{codigoDe(n)}</span>
                      <span className="min-w-0 truncate text-text-500">{nombre ?? 'Pendiente'}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {sede && <p className="mt-4 text-[11px] text-text-400">Sede de venta: {sede.name}</p>}
    </div>
  )
}

/** Precio y total. Se anima solo el importe cuando cambia. */
function ResumenTotal() {
  const { viaje, cantidadPasajes, total } = useTicketWizard()
  if (!viaje) return null
  const sinAsientos = cantidadPasajes === 0
  const importe = sinAsientos ? viaje.tarifa : total

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={etiquetaSeccion}>{sinAsientos ? 'Total desde' : 'Total'}</p>
          <p className="mt-1 text-[11px] tabular-nums text-text-500">
            {formatearMoneda(viaje.tarifa)} por pasajero
            {!sinAsientos && ` × ${cantidadPasajes}`}
          </p>
        </div>
        <span key={importe} className="animate-step-swap font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-text-900">
          {formatearMoneda(importe)}
        </span>
      </div>
    </div>
  )
}

/**
 * Panel lateral "Resumen del viaje" (desde `lg`).
 *
 * Es `sticky` dentro de su columna: el contenedor del grid ocupa toda la
 * altura de la lista (no `items-start`), así el panel tiene recorrido para
 * acompañar el scroll sin superponerse al header (`top-24` = header + aire)
 * ni salirse del viewport (`max-h`). Con poca altura scrollea solo el
 * detalle; el total y "Continuar" quedan fijos abajo, siempre visibles.
 */
export function TripSummary() {
  const { viaje, paso, cantidadPasajes, irA } = useTicketWizard()
  return (
    <aside
      aria-label="Resumen del viaje"
      className="hidden overflow-hidden rounded-2xl border border-border bg-surface-card shadow-panel lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh-7rem)] lg:flex-col"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 bg-[image:var(--gradient-brand-deep)] px-5 pb-4 pt-4 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Resumen del viaje</p>
          {viaje && (
            <p className="mt-0.5 font-display text-base font-semibold text-white">{cantidadPasajes > 1 ? 'Tu operación' : 'Tu selección'}</p>
          )}
        </div>
        {viaje && (
          <span className="animate-check-pop mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent-400 text-ink-950" aria-hidden="true">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </header>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ResumenDetalle />
      </div>

      {viaje && (
        <footer className="flex shrink-0 flex-col gap-3 border-t border-border bg-surface-card px-5 py-4">
          <ResumenTotal />
          {paso === 'viaje' && (
            <Button variant="accent" size="lg" className="w-full" onClick={() => irA('asientos')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
              Continuar
            </Button>
          )}
        </footer>
      )}
    </aside>
  )
}

/** Barra inferior fija (por debajo de `lg`): total y acción siempre a mano; se expande al detalle completo. */
export function TripSummaryBar() {
  const [abierto, setAbierto] = useState(false)
  const { viaje, paso, total, cantidadPasajes, irA } = useTicketWizard()
  const tarifa = viaje?.tarifa ?? 0
  const importe = cantidadPasajes > 0 ? total : tarifa

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card/95 shadow-flyout backdrop-blur lg:hidden">
      {abierto && (
        <div className="animate-sheet-up max-h-[68vh] overflow-y-auto overscroll-contain border-b border-border pt-3">
          <ResumenDetalle />
        </div>
      )}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs text-text-500">
              {viaje ? `${viaje.origen} → ${viaje.destino} · ${viaje.hora}` : 'Ningún viaje seleccionado'}
            </span>
            <span key={importe} className="animate-step-swap block text-base font-semibold tabular-nums text-text-900">
              {viaje ? `${cantidadPasajes > 0 ? 'Total' : 'Desde'} ${formatearMoneda(importe)}` : 'Resumen del viaje'}
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-text-400 transition-transform duration-200', !abierto && 'rotate-180')} aria-hidden="true" />
        </button>
        {paso === 'viaje' && (
          <Button variant="accent" disabled={!viaje} onClick={() => irA('asientos')} iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>
            Continuar
          </Button>
        )}
      </div>
    </div>
  )
}
