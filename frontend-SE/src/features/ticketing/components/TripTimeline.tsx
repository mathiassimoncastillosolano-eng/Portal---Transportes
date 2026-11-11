import { calcularLlegada, formatearDuracion } from '../utils/viajes'
import { cn } from '@/utils/cn'

interface TimelineBase {
  origen: string
  destino: string
  hora: string
  /** Duración en minutos (viene del catálogo de rutas). Si no está, no se muestra ni se estima la llegada. */
  duracionMin?: number
  terminalOrigen?: string
  terminalDestino?: string
}

/** Texto de llegada estimada: "16:20" o "16:20 (+1 día)". */
function textoLlegada(hora: string, duracionMin?: number): string | null {
  if (duracionMin === undefined) return null
  const l = calcularLlegada(hora, duracionMin)
  return l.dias > 0 ? `${l.hora} (+${l.dias} ${l.dias === 1 ? 'día' : 'días'})` : l.hora
}

/**
 * Recorrido horizontal para la tarjeta de viaje: origen ●━━ duración ━━● destino,
 * con el terminal (metadata) debajo de cada extremo.
 */
export function RouteLine({ origen, destino, hora, duracionMin, terminalOrigen, terminalDestino, className }: TimelineBase & { className?: string }) {
  const llegada = textoLlegada(hora, duracionMin)
  return (
    <div className={cn('grid grid-cols-[minmax(0,auto)_minmax(40px,1fr)_minmax(0,auto)] items-start gap-x-3', className)}>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-text-900">{origen}</p>
        {terminalOrigen && <p className="truncate text-xs text-text-500">{terminalOrigen}</p>}
      </div>

      <div className="flex min-w-0 flex-col items-center pt-0.5" aria-hidden="true">
        <span className="max-w-full truncate text-[11px] font-medium tabular-nums text-text-500">
          {duracionMin !== undefined ? formatearDuracion(duracionMin) : '—'}
        </span>
        <span className="relative mt-1 flex w-full items-center">
          <span className="h-2 w-2 shrink-0 rounded-full bg-accent-line" />
          <span className="animate-route-draw mx-0.5 h-px flex-1 bg-gradient-to-r from-accent-line/70 to-border-strong" />
          <span className="h-2 w-2 shrink-0 rounded-full border-2 border-text-400 bg-surface-card" />
        </span>
      </div>

      <div className="min-w-0 text-right">
        <p className="truncate text-[15px] font-semibold text-text-900">{destino}</p>
        <p className="truncate text-xs text-text-500">
          {terminalDestino ?? 'Destino'}
          {llegada && <span className="tabular-nums"> · llega {llegada}</span>}
        </p>
      </div>
    </div>
  )
}

/**
 * Itinerario vertical para el resumen (ticket): hora de salida destacada,
 * línea de recorrido con la duración en medio y llegada estimada abajo.
 */
export function TripTimeline({ origen, destino, hora, duracionMin, terminalOrigen, terminalDestino }: TimelineBase) {
  const llegada = textoLlegada(hora, duracionMin)
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4">
      {/* Salida */}
      <p className="font-display text-[32px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{hora}</p>
      <div className="min-w-0 pt-0.5">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-text-900">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent-line shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent-line)_22%,transparent)]" aria-hidden="true" />
          <span className="truncate">{origen}</span>
        </p>
        {terminalOrigen && <p className="mt-0.5 truncate pl-[18px] text-xs text-text-500">{terminalOrigen}</p>}
      </div>

      {/* Recorrido */}
      <div className="flex justify-center" aria-hidden="true">
        <span className="ml-0 mr-0 w-px self-stretch bg-gradient-to-b from-accent-line/70 to-border-strong" style={{ minHeight: 34 }} />
      </div>
      <p className="flex items-center gap-1.5 pl-[18px] text-xs tabular-nums text-text-500" style={{ minHeight: 34 }}>
        {duracionMin !== undefined ? `Duración ${formatearDuracion(duracionMin)}` : 'Recorrido directo'}
      </p>

      {/* Llegada */}
      <p className="text-lg font-medium leading-none tabular-nums text-text-700">{llegada ? llegada.split(' ')[0] : '—'}</p>
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate text-[15px] font-semibold text-text-900">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-text-400 bg-surface-card" aria-hidden="true" />
          <span className="truncate">{destino}</span>
        </p>
        <p className="mt-0.5 truncate pl-[18px] text-xs text-text-500">
          {terminalDestino ?? 'Destino'}
          {llegada && <span> · llegada estimada{llegada.includes('(') && ` ${llegada.slice(llegada.indexOf('(') + 1, -1)}`}</span>}
        </p>
      </div>
    </div>
  )
}
