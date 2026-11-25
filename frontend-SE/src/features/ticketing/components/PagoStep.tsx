import { useState } from 'react'
import { ArrowLeft, Info, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FormularioPago } from '@/features/pasajes/postergacion/components/FormularioPago'
import type { DatosPago } from '@/features/pasajes/postergacion/useCambioViaje'
import { formatearFechaCorta, formatearMoneda } from '@/utils/formato'
import { useTicketWizard } from '../hooks/useTicketWizard'

const MONEDA = 'PEN'

const pagoInicial: DatosPago = { metodo: 'EFECTIVO', resultado: 'APROBADO', codigo: '', recibido: '', clave: '' }

export function PagoStep() {
  const { viaje, asientos, pasajerosPorAsiento, total, irA } = useTicketWizard()
  const [pago, setPago] = useState<DatosPago>(pagoInicial)

  if (!viaje || asientos.length === 0) return null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">Paso 4 de 4</p>
        <h3 className="mt-1 font-display text-xl font-semibold leading-tight text-text-900">Pago del registro</h3>
        <p className="mt-1 text-sm text-text-500">
          {viaje.origen} → {viaje.destino} · {formatearFechaCorta(viaje.fechaSalida)} · {viaje.horaSalida} h
        </p>
      </div>

      <section aria-label="Pasajes a cobrar" className="rounded-2xl bg-surface-card p-4 shadow-panel ring-1 ring-border">
        <ul className="flex flex-col divide-y divide-border-subtle">
          {asientos.map((a, i) => {
            const p = pasajerosPorAsiento[a.idAsiento]
            return (
              <li key={a.idAsiento} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 shrink-0 items-center rounded-md bg-accent-line/12 px-2 text-xs font-semibold tabular-nums text-accent-text">
                    {a.numero}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text-900">
                      {p ? `${p.nombres} ${p.apellidos}`.trim() : `Pasaje ${i + 1}`}
                    </span>
                    <span className="block text-xs tabular-nums text-text-500">DNI {p?.dni}</span>
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-text-900">{formatearMoneda(a.precio)}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
          <span className="text-sm font-semibold text-text-700">Total a cobrar</span>
          <span className="rounded-full bg-[image:var(--gradient-brand-deep)] px-3 py-1 font-display text-base font-semibold tabular-nums text-white">
            {formatearMoneda(total)}
          </span>
        </div>
      </section>

      <section aria-label="Cobro del pasaje" className="flex flex-col gap-4 rounded-2xl bg-surface-card p-4 shadow-panel ring-1 ring-border">
        <p className="text-sm font-semibold text-text-900">Forma de pago</p>
        <FormularioPago
          montoAPagar={total}
          moneda={MONEDA}
          pago={pago}
          onCambiar={(parcial) => setPago((previo) => ({ ...previo, ...parcial }))}
        />
      </section>

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-xs text-text-500" role="note">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-400" aria-hidden="true" />
        <p>
          Esta etapa es solo una vista del formulario de pago. Aún no se procesa el cobro, no se registra la venta ni se emiten boletos.
        </p>
      </div>

      <div className="mt-2 flex flex-col-reverse items-stretch gap-3 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => irA('pasajeros')} iconLeft={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
          Atrás
        </Button>
        <Button variant="accent" disabled iconLeft={<Lock className="h-4 w-4" aria-hidden="true" />}>
          Confirmar pago · próxima etapa
        </Button>
      </div>
    </div>
  )
}
