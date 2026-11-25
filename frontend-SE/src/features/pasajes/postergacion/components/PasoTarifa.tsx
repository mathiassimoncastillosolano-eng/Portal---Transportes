import { Check, Equal, Megaphone, MoveDown, MoveUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import type { CotizacionCambio, EscenarioTarifa, IntentoPagoCambio } from '@/types/cambioViaje'
import type { ViajeHistorial } from '@/types/cliente'
import { cn } from '@/utils/cn'
import type { DatosPago } from '../useCambioViaje'
import { ContadorReserva } from './ContadorReserva'
import { EncabezadoPaso } from './EncabezadoPaso'
import { FormularioPago } from './FormularioPago'

interface PasoTarifaProps {
  pasaje: ViajeHistorial
  cotizacion: CotizacionCambio
  expiraEn: number | null
  acepta: boolean
  pago: DatosPago
  intentos: IntentoPagoCambio[]
  onAceptar: (valor: boolean) => void
  onPago: (parcial: Partial<DatosPago>) => void
}

const ESCENARIOS: Record<EscenarioTarifa, { titulo: string; icono: LucideIcon; insignia: string }> = {
  IGUAL: { titulo: 'Sin cobro', icono: Equal, insignia: 'bg-surface-card text-text-700 ring-1 ring-border' },
  SUPERIOR: { titulo: 'Cobrar diferencia', icono: MoveUp, insignia: 'bg-gradient-to-br from-status-low to-warning-500 text-white' },
  INFERIOR: { titulo: 'No se devuelve', icono: MoveDown, insignia: 'bg-gradient-to-br from-ink-700 to-accent-500 text-white' },
}

function Monto({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={cn('rounded-2xl p-4 text-center', destacado ? 'bg-surface-selected ring-1 ring-accent-line/40' : 'bg-surface-sunken')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-500">{titulo}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-900">{valor}</p>
    </div>
  )
}

export function PasoTarifa({ pasaje, cotizacion, expiraEn, acepta, pago, intentos, onAceptar, onPago }: PasoTarifaProps) {
  const moneda = pasaje.moneda
  const escenario = ESCENARIOS[cotizacion.escenario]
  const Icono = escenario.icono
  const diferencia = cotizacion.requierePago ? cotizacion.montoAPagar : cotizacion.montoNoDevuelto

  return (
    <div className="flex flex-col gap-4">
      <EncabezadoPaso paso={4} titulo="Tarifa y confirmación" extra={<ContadorReserva expiraEn={expiraEn} />} />

      <div className="rounded-2xl bg-surface-card p-4 shadow-panel ring-1 ring-border">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Monto titulo="Ya pagó" valor={formatearPrecio(cotizacion.importePagado, moneda)} />
          <div className="flex flex-col items-center gap-1">
            <span className={cn('flex h-11 w-11 items-center justify-center rounded-full shadow-panel', escenario.insignia)}>
              <Icono className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-[11px] font-semibold text-text-700">{escenario.titulo}</span>
            {cotizacion.escenario !== 'IGUAL' && (
              <span className="font-display text-sm font-semibold tabular-nums text-text-900">{formatearPrecio(diferencia, moneda)}</span>
            )}
          </div>
          <Monto titulo="Nueva tarifa" valor={formatearPrecio(cotizacion.tarifaNueva, moneda)} destacado />
        </div>

        {/* Lo que el agente debe decirle al pasajero (texto que arma el backend). */}
        <p className="mt-4 flex items-start gap-2.5 rounded-xl border-l-4 border-accent-line bg-accent-50/60 px-4 py-3 text-sm text-text-700">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
          {cotizacion.mensajeParaAgente}
        </p>
      </div>

      {cotizacion.requiereAceptacion && (
        <button
          type="button"
          role="checkbox"
          aria-checked={acepta}
          onClick={() => onAceptar(!acepta)}
          className={cn(
            'flex items-center gap-3 rounded-2xl border p-4 text-left text-sm transition-colors',
            acepta ? 'border-accent-line bg-surface-selected' : 'border-border bg-surface-card hover:bg-surface-hover',
          )}
        >
          <span
            className={cn(
              'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-white transition-colors',
              acepta ? 'border-accent-500 bg-accent-500' : 'border-border-strong bg-surface-card',
            )}
          >
            {acepta && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          </span>
          <span className="text-text-900">
            Informé al pasajero que los <strong className="tabular-nums">{formatearPrecio(cotizacion.montoNoDevuelto, moneda)}</strong> de diferencia no se
            devuelven, y lo acepta.
          </span>
        </button>
      )}

      {cotizacion.requierePago && (
        <section aria-label="Cobro de la diferencia" className="flex flex-col gap-4 rounded-2xl bg-surface-card p-4 shadow-panel ring-1 ring-border">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text-900">Cobrar la diferencia</p>
            <span className="rounded-full bg-[image:var(--gradient-brand-deep)] px-3 py-1 font-display text-sm font-semibold tabular-nums text-white">
              {formatearPrecio(cotizacion.montoAPagar, moneda)}
            </span>
          </div>
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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-500">Intentos de pago</p>
      <ul className="flex flex-col divide-y divide-border-subtle rounded-xl ring-1 ring-border-subtle">
        {intentos.map((intento) => {
          const aprobado = intento.resultado === 'APROBADO'
          return (
            <li key={intento.numero} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 truncate text-text-700">
                <span className="tabular-nums text-text-400">#{intento.numero}</span> {intento.metodo}
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
