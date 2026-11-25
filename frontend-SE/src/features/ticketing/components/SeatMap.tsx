import { Bus, Check, LoaderCircle, Lock, X } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import type { AsientoConsulta, PisoConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import type { AsientoElegido } from '../types'

interface SeatMapProps {
  pisos: PisoConsulta[]
  elegidos: AsientoElegido[]
  procesando: number | null
  puedeSeleccionarMas: boolean
  onToggle: (asiento: AsientoConsulta) => void
}

type EstadoVisual = 'disponible' | 'bloqueado' | 'ocupado' | 'seleccionado'

const DESCRIPCION: Record<EstadoVisual, string> = {
  disponible: 'disponible',
  bloqueado: 'bloqueado por otra sesión',
  ocupado: 'ocupado',
  seleccionado: 'seleccionado',
}

const base =
  'relative flex h-11 w-11 flex-col items-center justify-center rounded-t-xl rounded-b-md border text-[11px] font-semibold leading-none tabular-nums ' +
  'transition-[border-color,background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-premium)] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line'

const estilos: Record<EstadoVisual, string> = {
  disponible:
    'border-border-strong bg-surface-card text-text-700 hover:-translate-y-0.5 hover:border-accent-line hover:bg-accent-line/10 hover:text-text-900 active:scale-90',
  bloqueado: 'cursor-not-allowed border-dashed border-status-low/70 bg-status-low/12 text-warning-text',
  ocupado: 'cursor-not-allowed border-status-out/30 bg-status-out/10 text-danger-500',
  seleccionado:
    'animate-check-pop -translate-y-0.5 border-transparent bg-cta text-on-cta shadow-[0_4px_14px_-4px_var(--color-accent-line)] active:scale-90',
}

function Volante({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M3.5 10.5 9.6 11.2M20.5 10.5l-6.1.7M12 14.5V21" />
    </svg>
  )
}

interface FilaPiso {
  fila: number
  izquierda: AsientoConsulta[]
  derecha: AsientoConsulta[]
}

function construirFilas(piso: PisoConsulta): FilaPiso[] {
  if (piso.asientos.length === 0) return []
  const porFila = new Map<number, FilaPiso>()
  for (const a of piso.asientos) {
    const fila = porFila.get(a.fila) ?? { fila: a.fila, izquierda: [], derecha: [] }
    fila[a.lado].push(a)
    porFila.set(a.fila, fila)
  }
  const orden = (a: AsientoConsulta, b: AsientoConsulta) => a.letra.localeCompare(b.letra)
  const filaMin = Math.min(...piso.asientos.map((a) => a.fila))
  const filaMax = Math.max(...piso.asientos.map((a) => a.fila))
  return Array.from({ length: filaMax - filaMin + 1 }, (_, i) => {
    const n = filaMin + i
    const f = porFila.get(n) ?? { fila: n, izquierda: [], derecha: [] }
    return { ...f, izquierda: [...f.izquierda].sort(orden), derecha: [...f.derecha].sort(orden) }
  })
}

export function SeatMap({ pisos, elegidos, procesando, puedeSeleccionarMas, onToggle }: SeatMapProps) {
  const ordenPorId = useMemo(() => new Map(elegidos.map((a, i) => [a.idAsiento, i + 1])), [elegidos])

  function renderAsiento(asiento: AsientoConsulta) {
    const orden = ordenPorId.get(asiento.idAsiento)
    const visual: EstadoVisual = orden ? 'seleccionado' : asiento.estado
    const sinCupo = visual === 'disponible' && !puedeSeleccionarMas
    const esteProcesa = procesando === asiento.idAsiento
    const otroProcesa = procesando !== null && !esteProcesa
    const inactivo = visual === 'bloqueado' || visual === 'ocupado' || sinCupo || otroProcesa
    const precio = asiento.precio != null ? `, S/ ${asiento.precio.toFixed(2)}` : ''
    const etiqueta = sinCupo
      ? 'no disponible: ya elegiste el máximo de asientos'
      : `${DESCRIPCION[visual]}${visual === 'disponible' ? precio : ''}`

    return (
      <button
        key={asiento.idAsiento}
        type="button"
        disabled={inactivo}
        aria-pressed={visual === 'ocupado' || visual === 'bloqueado' ? undefined : visual === 'seleccionado'}
        aria-label={esteProcesa ? `Asiento ${asiento.numero}, procesando` : `Asiento ${asiento.numero}, ${etiqueta}`}
        aria-busy={esteProcesa || undefined}
        title={`Asiento ${asiento.numero} · ${DESCRIPCION[visual]}`}
        data-estado={visual}
        onClick={() => onToggle(asiento)}
        className={cn(
          base,
          estilos[visual],
          sinCupo && 'cursor-not-allowed border-border-subtle bg-transparent text-text-400 opacity-50 hover:translate-y-0 hover:border-border-subtle hover:bg-transparent',
          otroProcesa && 'cursor-wait opacity-55',
          esteProcesa &&
            'cursor-wait -translate-y-0.5 border-accent-line bg-accent-line/10 text-accent-text shadow-[0_4px_14px_-6px_var(--color-accent-line)]',
        )}
      >
        {esteProcesa ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2.5} aria-hidden="true" />
            <span className="mt-0.5 text-[9px] font-bold opacity-80">{asiento.numero}</span>
          </>
        ) : visual === 'ocupado' ? (
          <X className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        ) : (
          <>
            <span>{asiento.numero}</span>
            {visual === 'bloqueado' && <Lock className="mt-0.5 h-2.5 w-2.5" strokeWidth={2.75} aria-hidden="true" />}
            {visual === 'seleccionado' && (
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
          <span className="h-4 w-4 rounded-t-md rounded-b-sm bg-cta" aria-hidden="true" />
          Seleccionado
        </li>
        <li className="flex items-center gap-2">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-sm border border-dashed border-status-low/70 bg-status-low/12 text-warning-text"
            aria-hidden="true"
          >
            <Lock className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          Bloqueado por otra sesión
        </li>
        <li className="flex items-center gap-2">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-t-md rounded-b-sm border border-status-out/30 bg-status-out/10 text-danger-500"
            aria-hidden="true"
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </span>
          Ocupado
        </li>
      </ul>

      <div className="flex flex-wrap items-start justify-center gap-6">
        {pisos.map((piso) => (
          <PisoBus key={piso.piso} piso={piso} total={pisos.length} renderAsiento={renderAsiento} />
        ))}
      </div>
    </div>
  )
}

function PisoBus({
  piso,
  total,
  renderAsiento,
}: {
  piso: PisoConsulta
  total: number
  renderAsiento: (a: AsientoConsulta) => ReactNode
}) {
  const filas = useMemo(() => construirFilas(piso), [piso])
  return (
    <section
      role="group"
      aria-label={`Mapa de asientos, ${total > 1 ? `piso ${piso.piso}` : 'bus'}`}
      className="w-fit rounded-[32px] border-2 border-border-strong bg-surface-sunken px-5 pb-6 pt-4"
    >
      <div className="mb-4 flex items-center justify-between gap-6 border-b border-border pb-3 text-xs text-text-500">
        <span className="flex items-center gap-1.5 font-medium text-text-700">
          <Bus className="h-4 w-4" aria-hidden="true" />
          {total > 1 ? piso.descripcion || `Piso ${piso.piso}` : 'Bus'}
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
        {filas.map((fila) => (
          <div key={fila.fila} className="flex items-center justify-center gap-2">
            <div className="flex min-w-[24px] justify-end gap-2">{fila.izquierda.map(renderAsiento)}</div>
            <span className="w-6 text-center text-[10px] tabular-nums text-text-400" aria-hidden="true">
              {fila.fila}
            </span>
            <div className="flex min-w-[24px] gap-2">{fila.derecha.map(renderAsiento)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
