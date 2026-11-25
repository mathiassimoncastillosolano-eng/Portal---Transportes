import { SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useRetardo } from '@/hooks/useRetardo'
import { AvailabilityIndicator } from '@/features/ticketing/components/AvailabilityIndicator'
import { TravelCard } from '@/features/ticketing/components/TravelCard'
import { RouteLine } from '@/features/ticketing/components/TripTimeline'
import { calcularDesfaseServidor, estadoReservaActual, TEXTOS_ESTADO_RESERVA } from '@/features/ticketing/utils/viajes'
import type { EstadoReserva, ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'

interface ListaViajesCambioProps {
  viajes: ViajeConsulta[]
  cargando: boolean
  error: boolean
  seleccionadoId?: number
  onElegir: (viaje: ViajeConsulta) => void
  onReintentar: () => void
}

// Si la búsqueda responde antes de este tiempo (por ejemplo, desde la caché), no se muestra ningún cargador.
const UMBRAL_CARGADOR_MS = 350

/**
 * Viaje que no se puede elegir (ya salió, agotado, reserva cerrada).
 * Es igual a la tarjeta normal; solo cambia la columna derecha: en lugar del precio y "Elegir viaje"
 * muestra el estado en gris. Así la lista se ve pareja y no parece un error.
 */
function ViajeNoDisponible({ viaje, estado }: { viaje: ViajeConsulta; estado: Exclude<EstadoReserva, 'DISPONIBLE'> }) {
  const servicio = viaje.servicios.length > 0 ? viaje.servicios.join(' · ') : null
  return (
    <article
      aria-label={`Viaje ${viaje.origen} a ${viaje.destino}, salida ${viaje.horaSalida}: ${TEXTOS_ESTADO_RESERVA[estado]}`}
      aria-disabled="true"
      className="@container rounded-[var(--radius-card)] border border-border bg-surface-card p-4 @2xl:p-5"
    >
      <div className="grid gap-x-6 gap-y-4 @2xl:grid-cols-[minmax(0,1fr)_188px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{viaje.horaSalida}</p>
            <span className="max-w-[60%] truncate rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
              {viaje.tipoBus}
            </span>
          </div>
          <RouteLine viaje={viaje} />
          <AvailabilityIndicator libres={viaje.asientosDisponibles} capacidad={viaje.capacidad} bloqueado={estado !== 'LLENO'} />
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-text-500">
            <span className="truncate">{viaje.empresa}</span>
            {servicio && <span aria-hidden="true">·</span>}
            {servicio && <span className="truncate">{servicio}</span>}
          </p>
        </div>

        <div
          className={cn(
            'flex items-center justify-center border-t border-border-subtle pt-4',
            '@2xl:border-l @2xl:border-t-0 @2xl:pl-6 @2xl:pt-0',
          )}
        >
          {/* Agotado va en rojo; los demás estados (Ya salió, Reserva cerrada…) en gris. */}
          <p className={cn('font-display text-[22px] font-semibold', estado === 'LLENO' ? 'text-danger-500' : 'text-text-400')}>
            {TEXTOS_ESTADO_RESERVA[estado]}
          </p>
        </div>
      </div>
    </article>
  )
}

/** Cargador con forma de reloj: las agujas giran mientras la búsqueda tarda. */
function RelojCargando() {
  return (
    <div role="status" aria-label="Buscando viajes" className="flex flex-col items-center gap-3 py-12 animate-fade-in">
      <svg viewBox="0 0 48 48" className="h-14 w-14" aria-hidden="true">
        <defs>
          <linearGradient id="reloj-borde" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-ink-600)" />
            <stop offset="100%" stopColor="var(--color-accent-line)" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="var(--color-route-50)" stroke="url(#reloj-borde)" strokeWidth="3" />
        {[0, 90, 180, 270].map((grados) => (
          <line
            key={grados}
            x1="24" y1="7" x2="24" y2="9.5"
            stroke="var(--color-route-400)" strokeWidth="2" strokeLinecap="round"
            transform={`rotate(${grados} 24 24)`}
          />
        ))}
        {/* Aguja corta (horas): gira lento. Aguja larga (minutos): gira rápido. */}
        <g style={{ transformOrigin: '24px 24px', animation: 'spin 6s linear infinite' }}>
          <line x1="24" y1="24" x2="24" y2="15" stroke="var(--color-ink-700)" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g style={{ transformOrigin: '24px 24px', animation: 'spin 1.2s linear infinite' }}>
          <line x1="24" y1="24" x2="24" y2="10" stroke="var(--color-accent-line)" strokeWidth="2.5" strokeLinecap="round" />
        </g>
        <circle cx="24" cy="24" r="2.5" fill="var(--color-ink-700)" />
      </svg>
      <p className="text-sm text-text-500">Buscando viajes…</p>
    </div>
  )
}

export function ListaViajesCambio({ viajes, cargando, error, seleccionadoId, onElegir, onReintentar }: ListaViajesCambioProps) {
  // Se recalcula cada 15 s: un viaje puede cerrar su reserva mientras el agente mira la lista.
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const temporizador = window.setInterval(() => setAhora(Date.now()), 15_000)
    return () => window.clearInterval(temporizador)
  }, [])
  const cargandoHaceRato = useRetardo(cargando, UMBRAL_CARGADOR_MS)
  const mostrarCargador = cargando && cargandoHaceRato

  // El reloj solo aparece si la búsqueda tarda más que el umbral; al llegar los datos se oculta al instante.
  // Antes del umbral no se muestra nada (solo se reserva el espacio) para que no haya parpadeos.
  if (cargando) {
    return mostrarCargador ? <RelojCargando /> : <div className="min-h-[200px]" aria-busy="true" />
  }
  if (error) {
    return <ErrorState title="No pudimos cargar los viajes" description="Inténtalo de nuevo." onRetry={onReintentar} />
  }
  if (viajes.length === 0) {
    return <EmptyState icon={SearchX} title="No hay viajes para esa búsqueda" description="Pruebe con otra fecha u horario." />
  }

  const desfase = calcularDesfaseServidor(viajes, ahora)
  return (
    <ul className="flex flex-col gap-3">
      {viajes.map((viaje) => {
        const estado = estadoReservaActual(viaje, ahora + desfase)
        return (
          <li key={viaje.id} className="animate-fade-slide-up-sm">
            {estado === 'DISPONIBLE' ? (
              <TravelCard viaje={viaje} estado={estado} seleccionado={seleccionadoId === viaje.id} onSelect={() => onElegir(viaje)} />
            ) : (
              <ViajeNoDisponible viaje={viaje} estado={estado} />
            )}
          </li>
        )
      })}
    </ul>
  )
}
