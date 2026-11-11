import { Armchair } from 'lucide-react'
import { codigoDeAsiento } from '@/utils/asientos'
import { formatearFechaCorta, formatearMoneda } from '@/utils/formato'
import { useAsientos } from '../hooks/useAsientos'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { useViajeInfo } from '../hooks/useViajeInfo'

/**
 * Resumen previo al cobro: viaje, un renglón por pasajero/asiento, subtotal y
 * total a cobrar. Es la misma información del panel lateral, en formato de
 * recibo, para que el pago se sienta como continuación natural del flujo.
 */
export function PaymentSummary() {
  const { viaje, asientos, pasajerosPorAsiento, cantidadPasajes, total } = useTicketWizard()
  const { servicio } = useViajeInfo(viaje)
  const { datos } = useAsientos(viaje?.id)
  if (!viaje || !datos) return null

  return (
    <section aria-label="Resumen del cobro" className="mb-6 overflow-hidden rounded-xl border border-border bg-surface-sunken/50">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-500">Resumen del viaje</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-900">
            {viaje.origen} → {viaje.destino}
          </p>
        </div>
        <p className="text-xs tabular-nums text-text-500">
          <span className="capitalize">{formatearFechaCorta(viaje.fecha)}</span> · {viaje.hora} h
          {servicio && ` · ${servicio.nombre}`}
        </p>
      </header>

      <ul className="divide-y divide-border-subtle px-4">
        {asientos.map((n) => {
          const f = pasajerosPorAsiento[n]
          const nombre = f && (f.nombres || f.apellidos) ? `${f.nombres} ${f.apellidos}`.trim() : null
          return (
            <li key={n} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-card text-text-400" aria-hidden="true">
                  <Armchair className="h-4 w-4" />
                </span>
                <span className="min-w-0 truncate text-text-700">
                  <span className="font-medium text-text-900">Asiento {codigoDeAsiento(n, datos.servicio.distribucion)}</span>
                  {nombre && <span className="text-text-500"> · {nombre}</span>}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-text-900">{formatearMoneda(viaje.tarifa)}</span>
            </li>
          )
        })}
      </ul>

      <footer className="border-t border-border-subtle px-4 py-3">
        <div className="flex items-center justify-between text-[13px] text-text-500">
          <span>Subtotal · {cantidadPasajes} {cantidadPasajes === 1 ? 'pasajero' : 'pasajeros'}</span>
          <span className="tabular-nums text-text-700">{formatearMoneda(total)}</span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-500">Total a cobrar</span>
          <span className="text-2xl font-semibold leading-none tabular-nums text-text-900">{formatearMoneda(total)}</span>
        </div>
      </footer>
    </section>
  )
}
