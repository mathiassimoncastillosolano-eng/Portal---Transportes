import { Bus, Check, X } from 'lucide-react'
import type { Servicio } from '@/types/servicio'
import { construirAsientos, mapaCodigosAsiento } from '@/utils/asientos'
import { cn } from '@/utils/cn'

interface SeatMapProps {
  servicio: Servicio
  ocupados: number[]
  /** Números de asiento seleccionados en esta operación (orden de selección). */
  seleccionados: number[]
  /** `false` cuando ya se alcanzó el máximo de asientos: los disponibles no seleccionados se deshabilitan. */
  puedeSeleccionarMas: boolean
  onToggle: (asiento: number) => void
}

const base =
  'relative flex h-11 w-11 flex-col items-center justify-center rounded-t-xl rounded-b-md border text-[11px] font-semibold leading-none tabular-nums ' +
  'transition-[border-color,background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-premium)] active:scale-90 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line'

/** Volante dibujado con el mismo trazo (2px, extremos redondeados) que los iconos del sistema. */
function Volante({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 10.5 9.6 11.2M20.5 10.5l-6.1.7M12 14.5V21" />
    </svg>
  )
}

/**
 * Mapa visual del bus según la distribución del servicio (1 piso, 2 pisos o
 * VIP 3 asientos/fila): carrocería con frente y conductor, pasillo central y
 * asientos con forma de butaca. Estados: disponible, ocupado, seleccionado
 * (con orden) y bloqueado por máximo alcanzado. Selección múltiple.
 */
export function SeatMap({ servicio, ocupados, seleccionados, puedeSeleccionarMas, onToggle }: SeatMapProps) {
  const pisos = construirAsientos(servicio.distribucion)
  const codigos = mapaCodigosAsiento(servicio.distribucion)
  const ocupadosSet = new Set(ocupados)
  const seleccionadosSet = new Set(seleccionados)

  function renderAsiento(numero: number) {
    const ocupado = ocupadosSet.has(numero)
    const activo = seleccionadosSet.has(numero)
    const bloqueado = !ocupado && !activo && !puedeSeleccionarMas
    const codigo = codigos.get(numero) ?? String(numero)
    const orden = activo ? seleccionados.indexOf(numero) + 1 : null

    let estadoLabel = 'disponible'
    if (ocupado) estadoLabel = 'ocupado'
    else if (activo) estadoLabel = `seleccionado, pasaje ${orden}`
    else if (bloqueado) estadoLabel = 'no disponible: ya elegiste el máximo de asientos'

    return (
      <button
        key={numero}
        type="button"
        disabled={ocupado || bloqueado}
        aria-pressed={ocupado ? undefined : activo}
        aria-label={`Asiento ${codigo}, ${estadoLabel}`}
        onClick={() => onToggle(numero)}
        className={cn(
          base,
          ocupado && 'cursor-not-allowed border-status-out/30 bg-status-out/10 text-danger-500',
          bloqueado && 'cursor-not-allowed border-border-subtle bg-transparent text-text-400 opacity-50',
          !ocupado &&
            !activo &&
            !bloqueado &&
            'border-border-strong bg-surface-card text-text-700 hover:-translate-y-0.5 hover:border-accent-line hover:bg-accent-line/10 hover:text-text-900',
          activo && 'animate-check-pop -translate-y-0.5 border-transparent bg-cta text-on-cta shadow-[0_4px_14px_-4px_var(--color-accent-line)]',
        )}
      >
        {ocupado ? (
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <>
            <span>{codigo}</span>
            {activo && (
              <span className="mt-0.5 flex items-center gap-0.5 text-[9px] font-bold opacity-80">
                <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                {orden}
              </span>
            )}
          </>
        )}
      </button>
    )
  }

  return (
    <div>
      <ul className="mb-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-text-500" aria-label="Leyenda del mapa">
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-t-md rounded-b-sm border border-border-strong bg-surface-card" aria-hidden="true" />
          Disponible
        </li>
        <li className="flex items-center gap-2">
          <span className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-sm border border-status-out/30 bg-status-out/10 text-danger-500" aria-hidden="true">
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
          Ocupado
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-t-md rounded-b-sm bg-cta" aria-hidden="true" />
          Seleccionado
        </li>
      </ul>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {pisos.map((piso) => (
          <section
            key={piso.piso}
            role="group"
            aria-label={`Mapa de asientos, piso ${piso.piso}`}
            className="w-fit rounded-[32px] border-2 border-border-strong bg-surface-sunken px-5 pb-6 pt-4"
          >
            <div className="mb-4 flex items-center justify-between gap-6 border-b border-border pb-3 text-xs text-text-500">
              <span className="flex items-center gap-1.5 font-medium text-text-700">
                <Bus className="h-4 w-4" aria-hidden="true" />
                {pisos.length > 1 ? `Piso ${piso.piso}` : 'Bus'}
              </span>
              {piso.piso === 1 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <Volante className="h-4 w-4" />
                  Conductor
                </span>
              ) : (
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em]">Frente</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {piso.filas.map((fila) => (
                <div key={fila.fila} className="flex items-center justify-center gap-2">
                  <div className="flex gap-2">{fila.izquierda.map(renderAsiento)}</div>
                  <span className="w-6 text-center text-[10px] tabular-nums text-text-400" aria-hidden="true">
                    {fila.fila}
                  </span>
                  <div className="flex gap-2">{fila.derecha.map(renderAsiento)}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
