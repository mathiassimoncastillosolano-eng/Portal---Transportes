import { useState } from 'react'
import { Banknote, CreditCard, Landmark, Smartphone } from 'lucide-react'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/Input'
import { RadioCardGroup } from '@/components/ui/RadioCardGroup'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useCatalogo } from '@/hooks/useCatalogo'
import type { MetodoPagoId } from '@/types/pago'
import { formatearMoneda } from '@/utils/formato'
import { useAsientos } from '../hooks/useAsientos'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { enfocarPrimerError, parsearMonto, validarPago, type ErroresPago } from '../utils/validaciones'
import { PaymentSummary } from './PaymentSummary'
import { StepActions } from './StepActions'

const iconos: Record<MetodoPagoId, ReactNode> = {
  efectivo: <Banknote className="h-5 w-5" aria-hidden="true" />,
  tarjeta: <CreditCard className="h-5 w-5" aria-hidden="true" />,
  'yape-plin': <Smartphone className="h-5 w-5" aria-hidden="true" />,
  transferencia: <Landmark className="h-5 w-5" aria-hidden="true" />,
}

/**
 * Paso 4: método, monto y referencia. Es un único pago para toda la
 * operación (no hay pago por pasaje): el monto a cobrar es la suma de todos
 * los asientos seleccionados. Efectivo: el monto recibido debe cubrirlo y
 * se calcula el vuelto. Tarjeta, Yape/Plin y Transferencia: requieren
 * código de referencia.
 */
export function PaymentForm() {
  const { viaje, pago, setPago, total, irA } = useTicketWizard()
  const { catalogo, error, reintentar } = useCatalogo()
  const { datos } = useAsientos(viaje?.id)
  const [errores, setErrores] = useState<ErroresPago>({})

  if (error) {
    return <ErrorState title="No pudimos cargar los métodos de pago" onRetry={reintentar} />
  }
  if (!catalogo || !datos) {
    return (
      <div role="status" aria-label="Cargando pago" className="flex flex-col gap-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const metodo = catalogo.metodosPago.find((m) => m.id === pago.metodoPagoId)
  const recibido = parsearMonto(pago.montoRecibido)
  const vuelto = metodo?.id === 'efectivo' && !Number.isNaN(recibido) && recibido >= total ? recibido - total : null

  function continuar() {
    const nuevos = validarPago(pago, metodo, total)
    setErrores(nuevos)
    if (nuevos.metodoPagoId) {
      enfocarPrimerError(['metodo-pago-efectivo'])
      return
    }
    const orden = [nuevos.montoRecibido && 'pago-montoRecibido', nuevos.referencia && 'pago-referencia'].filter(
      (x): x is string => !!x,
    )
    if (orden.length > 0) {
      enfocarPrimerError(orden)
      return
    }
    irA('revision')
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        continuar()
      }}
    >
      <PaymentSummary />

      <RadioCardGroup<MetodoPagoId>
        legend="Método de pago"
        name="metodo-pago"
        value={pago.metodoPagoId}
        error={errores.metodoPagoId}
        onChange={(valor) => {
          setPago({ metodoPagoId: valor, montoRecibido: '', referencia: '' })
          setErrores({})
        }}
        options={catalogo.metodosPago.map((m) => ({
          value: m.id,
          label: m.nombre,
          description: m.requiereReferencia ? 'Requiere código de referencia' : 'Cobro en ventanilla',
          icon: iconos[m.id],
        }))}
      />

      {metodo && (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {metodo.id === 'efectivo' ? (
            <>
              <Input
                id="pago-montoRecibido"
                label="Monto recibido"
                required
                prefix="S/"
                inputMode="decimal"
                autoComplete="off"
                value={pago.montoRecibido}
                error={errores.montoRecibido}
                onChange={(e) => {
                  setPago({ montoRecibido: e.target.value })
                  setErrores((prev) => ({ ...prev, montoRecibido: undefined }))
                }}
              />
              <div className="flex flex-col gap-1.5" aria-live="polite">
                <span className="text-sm font-medium text-text-700">Vuelto</span>
                <p className="flex h-9 items-center rounded-lg border border-border bg-surface-sunken px-3 text-sm font-semibold tabular-nums text-text-900">
                  {vuelto !== null ? formatearMoneda(vuelto) : '—'}
                </p>
              </div>
            </>
          ) : (
            <>
              <Input
                id="pago-monto"
                label="Monto"
                prefix="S/"
                disabled
                readOnly
                value={total.toFixed(2)}
                hint="Coincide con el total de la operación."
              />
              <Input
                id="pago-referencia"
                label={metodo.etiquetaReferencia ?? 'Código de referencia'}
                required
                autoComplete="off"
                value={pago.referencia}
                error={errores.referencia}
                onChange={(e) => {
                  setPago({ referencia: e.target.value.trim() })
                  setErrores((prev) => ({ ...prev, referencia: undefined }))
                }}
              />
            </>
          )}
        </div>
      )}

      <StepActions onBack={() => irA('pasajeros')} submit />
    </form>
  )
}
