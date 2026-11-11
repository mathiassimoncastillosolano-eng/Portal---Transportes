import { useState } from 'react'
import { Check, Download, Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useCatalogo } from '@/hooks/useCatalogo'
import { cn } from '@/utils/cn'
import { formatearFecha, formatearMoneda } from '@/utils/formato'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { useViajeInfo } from '../hooks/useViajeInfo'
import { descargarBoleto, descargarTodosLosBoletos } from '../utils/descargaBoletos'
import { BoletoCard } from './BoletoCard'
import { TicketReceipt } from './TicketReceipt'
import { RouteLine } from './TripTimeline'

function Dato({ etiqueta, children, className }: { etiqueta: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-500">{etiqueta}</dt>
      <dd className="mt-1 truncate text-[15px] font-semibold tabular-nums text-text-900">{children}</dd>
    </div>
  )
}

/**
 * Pantalla final: cierre del proceso. Check animado, ruta con hora y fecha,
 * asientos, total pagado y las acciones siguientes (ver pasaje, descargar,
 * nuevo registro). Debajo, un boleto compacto por pasajero.
 */
export function BookingConfirmation() {
  const { comprobante, reiniciar } = useTicketWizard()
  const { catalogo } = useCatalogo()
  const info = useViajeInfo(comprobante?.boletos[0]?.viaje)
  const [verIndice, setVerIndice] = useState<number | null>(null)
  if (!comprobante || comprobante.boletos.length === 0) return null

  const { boletos, cantidadPasajes, operacionId, totalPagado } = comprobante
  const { viaje, servicio } = boletos[0]
  const metodoNombre = catalogo?.metodosPago.find((m) => m.id === boletos[0].pasaje.metodoPagoId)?.nombre ?? 'No especificado'
  const asientos = boletos.map((b) => b.codigoAsiento).join(', ')

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-card shadow-panel">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-accent-line)_14%,transparent),transparent_70%)]" aria-hidden="true" />

        <div className="relative flex flex-col items-center px-6 pb-6 pt-9 text-center" role="status">
          <span className="animate-check-pop relative flex h-16 w-16 items-center justify-center rounded-full bg-cta text-on-cta shadow-[0_8px_30px_-8px_var(--color-accent-line)]">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
            <span className="absolute inset-0 animate-[pulse-ring_1200ms_var(--ease-premium)_1] rounded-full" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-semibold tracking-tight text-text-900" style={{ fontFamily: 'var(--font-display)' }}>
            {cantidadPasajes === 1 ? 'Pasaje registrado correctamente' : `${cantidadPasajes} pasajes registrados correctamente`}
          </h2>
          <p className="mt-1.5 text-sm text-text-500">
            Operación <span className="font-medium tabular-nums text-text-700">{operacionId}</span> · ya se refleja en el Dashboard.
          </p>
        </div>

        <div className="relative px-6 sm:px-8">
          <span className="absolute -left-2.5 top-0 h-5 w-5 -translate-y-1/2 rounded-full bg-surface" aria-hidden="true" />
          <span className="absolute -right-2.5 top-0 h-5 w-5 -translate-y-1/2 rounded-full bg-surface" aria-hidden="true" />
          <div className="border-t border-dashed border-border-strong" />
        </div>

        <div className="px-6 pb-7 pt-6 sm:px-8">
          <RouteLine
            origen={viaje.origen}
            destino={viaje.destino}
            hora={viaje.hora}
            duracionMin={info.duracionMin}
            terminalOrigen={info.terminalOrigen}
            terminalDestino={info.terminalDestino}
          />
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <Dato etiqueta="Salida">
              <span className="text-[22px]">{viaje.hora}</span>
            </Dato>
            <Dato etiqueta="Fecha">{formatearFecha(viaje.fecha)}</Dato>
            <Dato etiqueta={cantidadPasajes === 1 ? 'Asiento' : 'Asientos'}>{asientos}</Dato>
            <Dato etiqueta="Total pagado">{formatearMoneda(totalPagado)}</Dato>
            <Dato etiqueta="Servicio">{servicio.nombre}</Dato>
            <Dato etiqueta="Bus">{servicio.unidad}</Dato>
            <Dato etiqueta="Pago">{metodoNombre}</Dato>
            <Dato etiqueta="Viaje">{viaje.codigo}</Dato>
          </dl>

          <div className="mt-8 flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row">
            <Button variant="outline" size="lg" onClick={reiniciar} iconLeft={<Plus className="h-4 w-4" aria-hidden="true" />}>
              Nuevo registro
            </Button>
            {cantidadPasajes > 1 && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => descargarTodosLosBoletos(boletos, operacionId, metodoNombre)}
                iconLeft={<Download className="h-4 w-4" aria-hidden="true" />}
              >
                Descargar todos
              </Button>
            )}
            <Button variant="accent" size="lg" onClick={() => setVerIndice(0)} iconLeft={<Eye className="h-4 w-4" aria-hidden="true" />}>
              {cantidadPasajes === 1 ? 'Ver pasaje' : 'Ver pasajes'}
            </Button>
          </div>
        </div>
      </section>

      <section aria-label="Boletos generados">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-900">
            {cantidadPasajes === 1 ? 'Boleto generado' : `Boletos generados (${cantidadPasajes})`}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boletos.map((boleto, i) => (
            <BoletoCard
              key={boleto.pasaje.id}
              indice={i + 1}
              comprobante={boleto}
              onVer={() => setVerIndice(i)}
              onDescargar={() => descargarBoleto(boleto, metodoNombre)}
            />
          ))}
        </div>
      </section>

      <Modal
        open={verIndice !== null}
        onClose={() => setVerIndice(null)}
        title={cantidadPasajes === 1 ? 'Pasaje' : `Pasaje ${(verIndice ?? 0) + 1} de ${cantidadPasajes}`}
        size="xl"
      >
        {verIndice !== null && (
          <>
            <TicketReceipt comprobante={boletos[verIndice]} />
            <div className="mt-4 flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {cantidadPasajes > 1 &&
                  boletos.map((b, i) => (
                    <button
                      key={b.pasaje.id}
                      type="button"
                      onClick={() => setVerIndice(i)}
                      aria-pressed={i === verIndice}
                      className={cn(
                        'h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold tabular-nums transition-colors',
                        i === verIndice
                          ? 'border-accent-line bg-accent-line/12 text-accent-text'
                          : 'border-border text-text-500 hover:bg-surface-hover',
                      )}
                    >
                      {b.codigoAsiento}
                    </button>
                  ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => descargarBoleto(boletos[verIndice], metodoNombre)} iconLeft={<Download className="h-3.5 w-3.5" aria-hidden="true" />}>
                Descargar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
