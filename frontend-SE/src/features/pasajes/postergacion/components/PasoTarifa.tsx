import { ArrowRight, Equal, Megaphone, MoveDown, MoveUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { CotizacionCambio, EscenarioTarifa, IntentoPagoCambio } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import type { DatosPago } from '../useCambioViaje'
import { FormularioPago } from './FormularioPago'

interface PasoTarifaProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta
  cotizacion: CotizacionCambio
  acepta: boolean
  pago: DatosPago
  intentos: IntentoPagoCambio[]
  onAceptar: (valor: boolean) => void
  onPago: (parcial: Partial<DatosPago>) => void
}

const ESCENARIOS: Record<EscenarioTarifa, { titulo: string; icono: LucideIcon; clase: string; etiqueta: string }> = {
  IGUAL: { titulo: 'Misma tarifa, sin cobro', icono: Equal, clase: 'border-border bg-surface-sunken/60 text-text-700', etiqueta: 'Diferencia' },
  SUPERIOR: { titulo: 'El pasajero debe pagar la diferencia', icono: MoveUp, clase: 'border-status-low/50 bg-status-low/10 text-warning-text', etiqueta: 'A cobrar' },
  INFERIOR: { titulo: 'La nueva tarifa es menor', icono: MoveDown, clase: 'border-accent-line/40 bg-accent-50 text-accent-text', etiqueta: 'No se devuelve' },
}

export function PasoTarifa({ pasaje, viaje, cotizacion, acepta, pago, intentos, onAceptar, onPago }: PasoTarifaProps) {
  const moneda = pasaje.moneda
  const escenario = ESCENARIOS[cotizacion.escenario]
  const Icono = escenario.icono
  const importe = cotizacion.requierePago ? cotizacion.montoAPagar : cotizacion.montoNoDevuelto

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">Tarifa y confirmación</h3>
        <p className="mt-0.5 text-sm text-text-500">Se compara lo que el pasajero ya pagó con la tarifa del asiento elegido.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Ya pagó</p>
            <p className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums text-text-900">{formatearPrecio(cotizacion.importePagado, moneda)}</p>
            <p className="mt-1.5 truncate text-xs text-text-500">
              {pasaje.origen} → {pasaje.destino}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-text-400" aria-hidden="true" />
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Nueva tarifa</p>
            <p className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums text-text-900">{formatearPrecio(cotizacion.tarifaNueva, moneda)}</p>
            <p className="mt-1.5 truncate text-xs text-text-500">
              {viaje.origen} → {viaje.destino}
            </p>
          </div>
        </div>

        <div className={cn('mt-5 flex items-center gap-4 rounded-xl border p-4', escenario.clase)} role="status">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-card/80">
            <Icono className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-text-900">{escenario.titulo}</p>
          {cotizacion.escenario !== 'IGUAL' && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">{escenario.etiqueta}</p>
              <p className="font-display text-xl font-semibold tabular-nums text-text-900">{formatearPrecio(importe, moneda)}</p>
            </div>
          )}
        </div>

        {/* Lo que el agente debe decirle al pasajero (texto que arma el backend). */}
        <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-surface-sunken/70 px-4 py-3 text-sm text-text-700">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          {cotizacion.mensajeParaAgente}
        </p>
      </div>

      {cotizacion.requiereAceptacion && (
        <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
          <Checkbox
            checked={acepta}
            onChange={(e) => onAceptar(e.target.checked)}
            label={`Informé al pasajero que la diferencia de ${formatearPrecio(cotizacion.montoNoDevuelto, moneda)} no se devuelve ni queda como saldo a favor, y lo acepta.`}
            description="Sin esta confirmación no se puede realizar el cambio."
          />
        </div>
      )}

      {cotizacion.requierePago && (
        <section aria-label="Cobro de la diferencia" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
          <FormularioPago montoAPagar={cotizacion.montoAPagar} moneda={moneda} pago={pago} onCambiar={onPago} />
          {intentos.length > 0 && <ListaIntentos intentos={intentos} moneda={moneda} />}
        </section>
      )}
    </div>
  )
}

function ListaIntentos({ intentos, moneda }: { intentos: IntentoPagoCambio[]; moneda: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Intentos de pago de este pasaje</p>
      <ul className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle">
        {intentos.map((intento) => {
          const aprobado = intento.resultado === 'APROBADO'
          return (
            <li key={intento.numero} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 text-text-700">
                <span className="tabular-nums text-text-500">#{intento.numero}</span> · {intento.metodo}
                {intento.numeroOperacion && <span className="text-text-500"> · {intento.numeroOperacion}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="tabular-nums text-text-900">{formatearPrecio(intento.monto, moneda)}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    aprobado ? 'bg-status-ok/15 text-accent-text' : 'bg-status-out/12 text-danger-500',
                  )}
                >
                  {aprobado ? 'Aprobado' : 'Rechazado'}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
