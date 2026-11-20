import { ArrowRight, Banknote, CircleAlert, CreditCard, Equal, MoveDown, MoveUp, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioCardGroup } from '@/components/ui/RadioCardGroup'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { ViajeHistorial } from '@/types/cliente'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import type { IntentoPago } from '../usePostergacion'
import { ETIQUETA_METODO, type ComparacionTarifa, type EscenarioTarifa, type MetodoCambio, type ResultadoTerminal } from '../reglas'

interface PasoTarifaProps {
  pasaje: ViajeHistorial
  viaje: ViajeConsulta
  comparacion: ComparacionTarifa
  acepta: boolean
  metodo: MetodoCambio
  terminal: ResultadoTerminal
  intentos: IntentoPago[]
  aviso: string | null
  onAceptar: (valor: boolean) => void
  onMetodo: (metodo: MetodoCambio) => void
  onTerminal: (terminal: ResultadoTerminal) => void
}

const ESCENARIOS: Record<EscenarioTarifa, { titulo: string; texto: string; icono: LucideIcon; clase: string }> = {
  IGUAL: {
    titulo: 'Sin diferencia por pagar',
    texto: 'Ambas tarifas son iguales: la postergación no genera ningún cobro.',
    icono: Equal,
    clase: 'border-border bg-surface-sunken/60 text-text-700',
  },
  SUPERIOR: {
    titulo: 'El cliente debe pagar la diferencia',
    texto: 'La nueva tarifa es mayor a lo pagado. La postergación solo se aplica cuando el pago es aprobado.',
    icono: MoveUp,
    clase: 'border-status-low/50 bg-status-low/10 text-warning-text',
  },
  INFERIOR: {
    titulo: 'La nueva tarifa es menor',
    texto: 'La diferencia no se devuelve ni queda como saldo a favor. El cliente debe aceptarlo expresamente.',
    icono: MoveDown,
    clase: 'border-accent-line/40 bg-accent-50 text-accent-text',
  },
}

const METODOS = [
  { value: 'EFECTIVO' as const, label: 'Efectivo', description: 'Se registra como aprobado', icono: Banknote },
  { value: 'YAPE' as const, label: 'Yape', description: 'Según el resultado de la operación', icono: Smartphone },
  { value: 'TARJETA' as const, label: 'Tarjeta', description: 'Según el resultado del terminal', icono: CreditCard },
]

export function PasoTarifa({ pasaje, viaje, comparacion, acepta, metodo, terminal, intentos, aviso, onAceptar, onMetodo, onTerminal }: PasoTarifaProps) {
  const moneda = pasaje.moneda
  const escenario = ESCENARIOS[comparacion.escenario]
  const Icono = escenario.icono
  const importe =
    comparacion.escenario === 'SUPERIOR' ? comparacion.montoAPagar : comparacion.escenario === 'INFERIOR' ? comparacion.montoNoDevuelto : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="font-display text-lg font-semibold text-text-900">Tarifa y pago</h3>
        <p className="mt-0.5 text-sm text-text-500">Comparamos lo pagado por el pasaje original con la tarifa del asiento elegido.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Pagado</p>
            <p className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums text-text-900">{formatearPrecio(comparacion.original, moneda)}</p>
            <p className="mt-1.5 truncate text-xs text-text-500">
              {pasaje.origen} → {pasaje.destino}
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-text-400" aria-hidden="true" />
          <div className="min-w-0 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Nueva tarifa</p>
            <p className="mt-1 font-display text-[28px] font-semibold leading-none tabular-nums text-text-900">{formatearPrecio(comparacion.nueva, moneda)}</p>
            <p className="mt-1.5 truncate text-xs text-text-500">
              {viaje.origen} → {viaje.destino}
            </p>
          </div>
        </div>

        <div className={cn('mt-5 flex items-center gap-4 rounded-xl border p-4', escenario.clase)} role="status">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-card/80">
            <Icono className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-900">{escenario.titulo}</p>
            <p className="mt-0.5 text-xs text-text-700">{escenario.texto}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">
              {comparacion.escenario === 'SUPERIOR' ? 'A cobrar' : comparacion.escenario === 'INFERIOR' ? 'No se devuelve' : 'Diferencia'}
            </p>
            <p className="font-display text-xl font-semibold tabular-nums text-text-900">{formatearPrecio(importe, moneda)}</p>
          </div>
        </div>
      </div>

      {comparacion.escenario === 'SUPERIOR' && (
        <section aria-label="Cobro de la diferencia" className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
          <RadioCardGroup<MetodoCambio>
            legend="Método de pago de la diferencia"
            name="metodo-diferencia"
            value={metodo}
            onChange={onMetodo}
            options={METODOS.map((m) => ({
              value: m.value,
              label: m.label,
              description: m.description,
              icon: <m.icono className="h-4 w-4" aria-hidden="true" />,
            }))}
            className="[&>div]:sm:grid-cols-3"
          />

          {metodo !== 'EFECTIVO' && (
            <SegmentedControl
              label={`Resultado informado por ${metodo === 'YAPE' ? 'Yape' : 'el terminal'}`}
              name="resultado-terminal"
              value={terminal}
              onChange={(v) => onTerminal(v as ResultadoTerminal)}
              options={[
                { value: 'APROBADO', label: 'Aprobado' },
                { value: 'RECHAZADO', label: 'Rechazado' },
              ]}
            />
          )}

          {aviso && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/8 px-3 py-2.5 text-sm text-danger-500">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {aviso}
            </p>
          )}

          {intentos.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Intentos registrados</p>
              <ul className="flex flex-col divide-y divide-border-subtle rounded-xl border border-border-subtle">
                {intentos.map((i) => (
                  <li key={i.numero} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="text-text-700">
                      <span className="tabular-nums text-text-500">#{i.numero}</span> · {ETIQUETA_METODO[i.metodo]} · {i.hora}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums text-text-900">{formatearPrecio(i.monto, moneda)}</span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                          i.resultado === 'APROBADO' ? 'bg-status-ok/15 text-accent-text' : 'bg-status-out/12 text-danger-500',
                        )}
                      >
                        {i.resultado === 'APROBADO' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {comparacion.escenario === 'INFERIOR' && (
        <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
          <Checkbox
            checked={acepta}
            onChange={(e) => onAceptar(e.target.checked)}
            label={`El cliente aceptó expresamente que no se le devolverá ${formatearPrecio(comparacion.montoNoDevuelto, moneda)} ni se le dejará saldo a favor.`}
            description="Es obligatorio registrar esta aceptación para poder confirmar la postergación."
          />
        </div>
      )}

      <ul className="grid gap-2 text-xs text-text-500 sm:grid-cols-2">
        <li className="rounded-lg bg-surface-sunken/60 px-3 py-2">Se conserva el mismo pasaje y la misma venta; no se crea una venta nueva.</li>
        <li className="rounded-lg bg-surface-sunken/60 px-3 py-2">El pago original no se modifica; cualquier diferencia queda como pago adicional.</li>
        <li className="rounded-lg bg-surface-sunken/60 px-3 py-2">El asiento nuevo queda ocupado y el original disponible, en una sola operación.</li>
        <li className="rounded-lg bg-surface-sunken/60 px-3 py-2">Se registran el viaje anterior, el nuevo, los importes y quién realizó el cambio.</li>
      </ul>
    </div>
  )
}
