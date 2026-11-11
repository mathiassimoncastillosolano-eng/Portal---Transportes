import { ArrowRight, Check } from 'lucide-react'
import type { MotivoNoVendible, ViajeListado } from '@/types/viaje'
import { formatearMoneda } from '@/utils/formato'
import { cn } from '@/utils/cn'
import { AvailabilityIndicator } from './AvailabilityIndicator'
import { RouteLine } from './TripTimeline'

const etiquetaMotivo: Record<MotivoNoVendible, string> = {
  cancelado: 'Cancelado',
  agotado: 'Agotado',
  salido: 'Ya salió',
}

interface TravelCardProps {
  viaje: ViajeListado
  servicioNombre: string
  unidad?: string
  duracionMin?: number
  terminalOrigen?: string
  terminalDestino?: string
  seleccionado: boolean
  onSelect: () => void
}

/**
 * Unidad de decisión de la lista: hora → ruta → disponibilidad → precio →
 * acción. Estados: default, hover, selected, disabled/sold out (agotado,
 * cancelado, ya salió) y disponibilidad baja (la resuelve el indicador).
 * Toda la tarjeta es clicable con el mouse; el teclado usa el botón.
 */
export function TravelCard({
  viaje,
  servicioNombre,
  unidad,
  duracionMin,
  terminalOrigen,
  terminalDestino,
  seleccionado,
  onSelect,
}: TravelCardProps) {
  const deshabilitado = !viaje.vendible
  const motivo = viaje.motivoNoVendible ? etiquetaMotivo[viaje.motivoNoVendible] : 'No disponible'

  return (
    <article
      data-selected={seleccionado || undefined}
      data-disabled={deshabilitado || undefined}
      aria-label={`Viaje ${viaje.origen} a ${viaje.destino}, salida ${viaje.hora}, ${servicioNombre}`}
      onClick={deshabilitado ? undefined : onSelect}
      className={cn(
        'group/card @container relative overflow-hidden rounded-[var(--radius-card)] border p-4 @2xl:p-5',
        'transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-premium)]',
        deshabilitado
          ? 'border-border-subtle bg-surface-card/60'
          : 'cursor-pointer hover:border-border-strong hover:bg-surface-hover hover:shadow-panel',
        !deshabilitado && !seleccionado && 'border-border bg-surface-card',
        seleccionado &&
          'border-accent-line bg-surface-selected shadow-[0_0_0_1px_var(--color-accent-line)] hover:border-accent-line hover:bg-surface-selected',
      )}
    >
      {/* Barra lateral: marca la selección sin añadir más elementos a la tarjeta. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-[3px] bg-accent-line transition-opacity duration-200 ease-[var(--ease-premium)]',
          seleccionado ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div className="grid gap-x-6 gap-y-4 @2xl:grid-cols-[minmax(0,1fr)_188px]">
        {/* Columna principal: hora, ruta, disponibilidad */}
        <div className={cn('flex min-w-0 flex-col gap-4', deshabilitado && 'opacity-60')}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{viaje.hora}</p>
            <span className="max-w-[60%] truncate rounded-md border border-border bg-surface-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-text-700">
              {servicioNombre}
            </span>
          </div>

          <RouteLine
            origen={viaje.origen}
            destino={viaje.destino}
            hora={viaje.hora}
            duracionMin={duracionMin}
            terminalOrigen={terminalOrigen}
            terminalDestino={terminalDestino}
          />

          <AvailabilityIndicator
            libres={viaje.asientosDisponibles}
            capacidad={viaje.capacidad}
            bloqueado={deshabilitado && viaje.motivoNoVendible !== 'agotado'}
          />

          {/* Información complementaria: lo último que se lee. */}
          <p className="flex min-w-0 items-center gap-1.5 text-xs text-text-500">
            {unidad && <span className="truncate">{unidad}</span>}
            {unidad && <span aria-hidden="true">·</span>}
            <span className="shrink-0 tabular-nums">{viaje.codigo}</span>
          </p>
        </div>

        {/* Columna de decisión: precio + acción */}
        <div
          className={cn(
            'flex items-end justify-between gap-3 border-t border-border-subtle pt-4',
            '@2xl:flex-col @2xl:items-center @2xl:justify-center @2xl:gap-5 @2xl:border-l @2xl:border-t-0 @2xl:pl-6 @2xl:pt-0',
          )}
        >
          <div className="@2xl:text-center">
            <p className={cn('font-display text-[24px] font-semibold leading-none tabular-nums', deshabilitado ? 'text-text-500' : 'text-text-900')}>
              {formatearMoneda(viaje.tarifa)}
            </p>
            <p className="mt-1 text-xs text-text-500">por pasajero</p>
          </div>

          <button
            type="button"
            data-trip-cta
            disabled={deshabilitado}
            aria-pressed={seleccionado}
            aria-label={
              deshabilitado
                ? `${motivo}: viaje ${viaje.origen} a ${viaje.destino} a las ${viaje.hora}`
                : `${seleccionado ? 'Viaje seleccionado' : 'Elegir viaje'} ${viaje.origen} a ${viaje.destino} a las ${viaje.hora}`
            }
            className={cn(
              'group/cta inline-flex h-10 min-w-[158px] shrink-0 items-center justify-center rounded-lg border px-3.5 text-[13px] font-semibold',
              'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-premium)] active:scale-[0.97]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
              deshabilitado &&
                'cursor-not-allowed border-border-subtle bg-transparent text-text-400',
              !deshabilitado &&
                !seleccionado &&
                'border-accent-line/40 bg-transparent text-accent-text group-hover/card:border-transparent group-hover/card:bg-cta group-hover/card:text-on-cta',
              seleccionado && 'border-accent-line bg-accent-line/12 text-accent-text',
            )}
          >
            {deshabilitado ? (
              <span>No disponible</span>
            ) : seleccionado ? (
              <span className="animate-check-pop inline-flex items-center gap-1.5">
                <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                Seleccionado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                Elegir viaje
                <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover/cta:translate-x-0.5" aria-hidden="true" />
              </span>
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
