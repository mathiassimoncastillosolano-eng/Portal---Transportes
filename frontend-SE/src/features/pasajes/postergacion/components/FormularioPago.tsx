import { Banknote, CircleCheck, CircleX, CreditCard, Smartphone } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { RadioCardGroup } from '@/components/ui/RadioCardGroup'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { MetodoPagoAgencia, ResultadoPos } from '@/types/cambioViaje'
import { cn } from '@/utils/cn'
import { BILLETES_RAPIDOS, calcularVuelto } from '../reglas'
import type { DatosPago } from '../useCambioViaje'

interface FormularioPagoProps {
  montoAPagar: number
  moneda: string
  pago: DatosPago
  onCambiar: (parcial: Partial<DatosPago>) => void
}

const METODOS = [
  { value: 'EFECTIVO' as const, label: 'Efectivo', description: 'Se registra como aprobado', icon: <Banknote className="h-4 w-4" aria-hidden="true" /> },
  { value: 'YAPE' as const, label: 'Yape', description: 'Cobrado con el POS', icon: <Smartphone className="h-4 w-4" aria-hidden="true" /> },
  { value: 'TARJETA' as const, label: 'Tarjeta', description: 'Cobrada con el POS', icon: <CreditCard className="h-4 w-4" aria-hidden="true" /> },
]

const RESULTADOS: { valor: ResultadoPos; etiqueta: string; icono: typeof CircleCheck; activo: string }[] = [
  { valor: 'APROBADO', etiqueta: 'Aprobado', icono: CircleCheck, activo: 'border-accent-line bg-accent-50 text-accent-text' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazado', icono: CircleX, activo: 'border-danger-500/50 bg-danger-50 text-danger-500' },
]

export function FormularioPago({ montoAPagar, moneda, pago, onCambiar }: FormularioPagoProps) {
  const esEfectivo = pago.metodo === 'EFECTIVO'
  const recibido = Number(pago.recibido)
  const vuelto = pago.recibido === '' ? null : calcularVuelto(montoAPagar, recibido)
  const faltaDinero = pago.recibido !== '' && vuelto === null
  const etiquetaCodigo = pago.resultado === 'APROBADO' ? 'Código de operación del POS' : 'Código de error del POS'

  return (
    <div className="flex flex-col gap-4">
      <RadioCardGroup<MetodoPagoAgencia>
        legend="Método de pago de la diferencia"
        name="metodo-diferencia"
        value={pago.metodo}
        onChange={(metodo) => onCambiar({ metodo, codigo: '', recibido: '' })}
        options={METODOS}
        className="[&>div]:sm:grid-cols-3"
      />

      {esEfectivo ? (
        <div className="flex flex-col gap-3">
          <Input
            label="Monto recibido"
            inputMode="decimal"
            placeholder="0.00"
            value={pago.recibido}
            onChange={(e) => onCambiar({ recibido: e.target.value.replace(',', '.') })}
            error={faltaDinero ? `El monto recibido es menor a ${formatearPrecio(montoAPagar, moneda)}.` : undefined}
          />
          <div className="flex flex-wrap gap-2">
            <BotonMonto texto="Monto exacto" onClick={() => onCambiar({ recibido: montoAPagar.toFixed(2) })} />
            {BILLETES_RAPIDOS.filter((billete) => billete >= montoAPagar).map((billete) => (
              <BotonMonto key={billete} texto={formatearPrecio(billete, moneda)} onClick={() => onCambiar({ recibido: billete.toFixed(2) })} />
            ))}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-surface-sunken/70 px-4 py-3">
            <span className="text-sm text-text-500">Vuelto a entregar</span>
            <span className="font-display text-xl font-semibold tabular-nums text-text-900">
              {vuelto === null ? '—' : formatearPrecio(vuelto, moneda)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label="Resultado que muestra el POS">
            <p className="mb-1.5 text-sm font-medium text-text-700">Resultado que muestra el POS</p>
            <div className="grid grid-cols-2 gap-2">
              {RESULTADOS.map(({ valor, etiqueta, icono: Icono, activo }) => {
                const elegido = pago.resultado === valor
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={elegido}
                    onClick={() => onCambiar({ resultado: valor })}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors',
                      elegido ? activo : 'border-border bg-surface-card text-text-500 hover:bg-surface-hover hover:text-text-900',
                    )}
                  >
                    <Icono className="h-4 w-4" aria-hidden="true" />
                    {etiqueta}
                  </button>
                )
              })}
            </div>
          </div>
          <Input
            label={etiquetaCodigo}
            placeholder={pago.resultado === 'APROBADO' ? 'Ej. 458921' : 'Ej. P51'}
            maxLength={64}
            value={pago.codigo}
            onChange={(e) => onCambiar({ codigo: e.target.value })}
            hint="Obligatorio. Cópielo tal como aparece en el POS."
          />
        </div>
      )}
    </div>
  )
}

function BotonMonto({ texto, onClick }: { texto: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border border-border-strong bg-surface-card px-3 py-1.5 text-xs font-semibold tabular-nums text-text-700',
        'transition-colors hover:border-accent-line hover:bg-accent-50 hover:text-accent-text',
      )}
    >
      {texto}
    </button>
  )
}
