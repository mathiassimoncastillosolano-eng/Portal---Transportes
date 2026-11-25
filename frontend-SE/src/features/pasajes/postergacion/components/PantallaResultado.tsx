import { ArrowDown, CalendarCheck, CircleX, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatearPrecio, textoSalida } from '@/features/clientes/utils/boleto'
import type { CotizacionCambio } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import { formatearFechaLarga } from '@/utils/formato'
import { ETIQUETA_METODO } from '../reglas'
import type { ResultadoCambio } from '../useCambioViaje'

interface PantallaResultadoProps {
  pasaje: ViajeHistorial
  resultado: ResultadoCambio
  cotizacion: CotizacionCambio | null
  pisoNuevo: number | null
  tipoBus: string | null
  onVerBoleto: () => void
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-text-500">{etiqueta}</dt>
      <dd className="text-right font-medium tabular-nums text-text-900">{valor}</dd>
    </div>
  )
}

export function PantallaResultado({ pasaje, resultado, cotizacion, pisoNuevo, tipoBus, onVerBoleto }: PantallaResultadoProps) {
  if (!resultado.exito || !resultado.confirmacion) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/10 text-danger-500">
          <CircleX className="h-7 w-7" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold text-text-900">No se puede cambiar este pasaje</h3>
        <p className="mt-2 text-sm text-text-500">{resultado.mensaje}</p>
        <p className="mt-4 rounded-lg bg-surface-sunken/60 px-3 py-2 text-xs text-text-500">
          El pasaje conserva su viaje, asiento y estado originales.
        </p>
      </div>
    )
  }

  const { confirmacion, metodo } = resultado
  const moneda = pasaje.moneda

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
      <span className="animate-check-pop flex h-14 w-14 items-center justify-center rounded-full bg-status-ok/15 text-accent-text">
        <CalendarCheck className="h-7 w-7" aria-hidden="true" />
      </span>
      <h3 className="mt-4 font-display text-2xl font-semibold text-text-900">Viaje cambiado</h3>
      <p className="mt-1 text-sm text-text-500">
        El boleto {pasaje.numeroBoleto} conserva su compra y su pago original. Entregue al pasajero los datos de su nuevo viaje.
      </p>

      <div className="mt-6 w-full overflow-hidden rounded-2xl border border-border bg-surface-card text-left shadow-panel">
        <div className="px-5 py-4 opacity-70">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Viaje anterior</p>
          <p className="mt-1 text-sm font-medium text-text-900">
            {pasaje.origen} → {pasaje.destino}
          </p>
          <p className="text-xs tabular-nums text-text-500">
            {textoSalida(pasaje)} · Asiento {pasaje.asiento ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-3 px-5" aria-hidden="true">
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
          <ArrowDown className="h-4 w-4 text-text-400" />
          <span className="h-px flex-1 border-t border-dashed border-border-strong" />
        </div>
        <div className="bg-gradient-to-br from-ink-700 via-ink-600 to-accent-500 px-5 py-4 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">Nuevo viaje</p>
          <p className="mt-1 font-display text-lg font-semibold">
            {confirmacion.origen} → {confirmacion.destino}
          </p>
          <p className="text-sm tabular-nums text-white/85">
            {formatearFechaLarga(confirmacion.fechaSalida)} · {confirmacion.horaSalida.slice(0, 5)} h{tipoBus ? ` · ${tipoBus}` : ''}
          </p>
          <p className="mt-1 text-sm font-semibold">
            Asiento {confirmacion.asientoNuevo}
            {pisoNuevo ? ` · Piso ${pisoNuevo}` : ''}
          </p>
        </div>
      </div>

      {cotizacion && (
        <dl className="mt-4 w-full divide-y divide-border-subtle rounded-2xl border border-border bg-surface-card px-5 text-left">
          <Fila etiqueta="Ya pagado" valor={formatearPrecio(cotizacion.importePagado, moneda)} />
          <Fila etiqueta="Nueva tarifa" valor={formatearPrecio(cotizacion.tarifaNueva, moneda)} />
          {cotizacion.escenario === 'SUPERIOR' && metodo && (
            <Fila etiqueta={`Diferencia cobrada (${ETIQUETA_METODO[metodo]})`} valor={formatearPrecio(confirmacion.importeAdicional, moneda)} />
          )}
          {cotizacion.escenario === 'INFERIOR' && <Fila etiqueta="Diferencia no devuelta" valor={formatearPrecio(cotizacion.montoNoDevuelto, moneda)} />}
          {cotizacion.escenario === 'IGUAL' && <Fila etiqueta="Cobro adicional" valor="Ninguno" />}
        </dl>
      )}

      <Button variant="outline" className="mt-5" onClick={onVerBoleto} iconLeft={<FileText className="h-4 w-4" aria-hidden="true" />}>
        Ver boleto actualizado
      </Button>
    </div>
  )
}
