import { ArrowRight, Bath, Bus, Check, Snowflake, Sparkles, Tv, Usb, Wifi, type LucideIcon } from 'lucide-react'
import type { EstadoReserva, ViajeConsulta } from '@/types/consultaViaje'
import { cn } from '@/utils/cn'
import { formatearMoneda } from '@/utils/formato'
import { TEXTOS_ESTADO_RESERVA, formatearDuracion, textoLlegada } from '../utils/viajes'
import { AvailabilityIndicator } from './AvailabilityIndicator'

interface TravelCardProps {
  viaje: ViajeConsulta
  estado: EstadoReserva
  seleccionado: boolean
  onSelect: () => void
}

const ICONOS_SERVICIO: [RegExp, LucideIcon][] = [
  [/wi-?fi/i, Wifi],
  [/ba[ñn]o|wc/i, Bath],
  [/usb|cargador|enchufe/i, Usb],
  [/tv|pantalla|video/i, Tv],
  [/aire|clima/i, Snowflake],
]

const iconoServicio = (servicio: string) => ICONOS_SERVICIO.find(([patron]) => patron.test(servicio))?.[1] ?? Sparkles

export function TravelCard({ viaje, estado, seleccionado, onSelect }: TravelCardProps) {
  const deshabilitado = estado !== 'DISPONIBLE'
  const motivo = estado === 'DISPONIBLE' ? 'No disponible' : TEXTOS_ESTADO_RESERVA[estado]
  const llegada = textoLlegada(viaje)
  const [horaLlegada, ...resto] = llegada ? llegada.split(' ') : []
  const sufijoLlegada = resto.join(' ')
  const duracion = viaje.duracionMin !== null ? formatearDuracion(viaje.duracionMin) : viaje.duracion

  return (
    <article
      data-selected={seleccionado || undefined}
      data-disabled={deshabilitado || undefined}
      aria-label={`Viaje ${viaje.origen} a ${viaje.destino}, salida ${viaje.horaSalida}, ${viaje.tipoBus}`}
      onClick={deshabilitado ? undefined : onSelect}
      className={cn(
        'group/card @container relative overflow-hidden rounded-2xl border',
        'transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[var(--ease-premium)]',
        deshabilitado
          ? 'border-border-subtle bg-surface-card/60'
          : 'cursor-pointer hover:-translate-y-0.5 hover:border-border-strong hover:shadow-panel',
        !deshabilitado && !seleccionado && 'border-border bg-surface-card',
        seleccionado && 'border-accent-line/70 bg-surface-selected shadow-panel',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent-line to-transparent transition-opacity duration-300 ease-[var(--ease-premium)]',
          seleccionado ? 'opacity-100' : 'opacity-0 group-hover/card:opacity-60',
        )}
      />

      <div className="grid @2xl:grid-cols-[minmax(0,1fr)_200px]">
        <div className={cn('flex min-w-0 flex-col gap-4 p-4 @2xl:p-5', deshabilitado && 'opacity-60')}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex max-w-[60%] items-center gap-1.5 truncate rounded-full border border-accent-line/30 bg-accent-line/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-accent-text">
              <Bus className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{viaje.tipoBus}</span>
            </span>
            <span className="truncate text-xs font-medium text-text-500">{viaje.empresa}</span>
          </div>

          <div className="grid grid-cols-[auto_minmax(56px,1fr)_auto] items-start gap-x-4">
            <div className="min-w-0">
              <p className="font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-text-900">{viaje.horaSalida}</p>
              <p className="mt-2 truncate text-sm font-semibold text-text-900">{viaje.origen}</p>
              {viaje.terminalOrigen && <p className="truncate text-xs text-text-500">{viaje.terminalOrigen}</p>}
            </div>

            <div className="flex min-w-0 flex-col items-center gap-1.5 pt-1" aria-hidden="true">
              <span className="max-w-full truncate text-[11px] font-medium tabular-nums text-text-500">{duracion || '—'}</span>
              <span className="flex w-full items-center">
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent-line" />
                <span className="animate-route-draw h-px flex-1 bg-gradient-to-r from-accent-line/70 to-border-strong" />
                <span className="mx-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface-card text-accent-text transition-colors duration-200 group-hover/card:border-accent-line">
                  <Bus className="h-3.5 w-3.5" />
                </span>
                <span className="h-px flex-1 bg-gradient-to-r from-border-strong to-border-strong" />
                <span className="h-2 w-2 shrink-0 rounded-full border-2 border-text-400 bg-surface-card" />
              </span>
            </div>

            <div className="min-w-0 text-right">
              <p className="font-display text-[30px] font-semibold leading-none tracking-tight tabular-nums text-text-500">
                {horaLlegada ?? '—'}
                {sufijoLlegada && <span className="ml-1 align-top text-[11px] font-medium tracking-normal text-text-400">{sufijoLlegada.replace(/[()]/g, '')}</span>}
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-text-900">{viaje.destino}</p>
              <p className="truncate text-xs text-text-500">{viaje.terminalDestino ?? 'Destino'}</p>
            </div>
          </div>

          <AvailabilityIndicator
            libres={viaje.asientosDisponibles}
            capacidad={viaje.capacidad}
            bloqueado={deshabilitado && estado !== 'LLENO'}
          />

          {viaje.servicios.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Servicios del bus">
              {viaje.servicios.map((servicio) => {
                const Icono = iconoServicio(servicio)
                return (
                  <li
                    key={servicio}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface-sunken/60 px-2.5 py-1 text-[11px] font-medium text-text-700"
                  >
                    <Icono className="h-3 w-3 text-text-400" aria-hidden="true" />
                    {servicio}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div
          className={cn(
            'flex items-end justify-between gap-3 border-t border-border-subtle bg-surface-sunken/40 p-4',
            '@2xl:flex-col @2xl:items-stretch @2xl:justify-center @2xl:gap-4 @2xl:border-l @2xl:border-t-0 @2xl:p-5',
            seleccionado && 'bg-accent-line/[0.06]',
          )}
        >
          <div className="@2xl:text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-500">Desde</p>
            <p className={cn('mt-1 font-display text-[28px] font-semibold leading-none tabular-nums', deshabilitado ? 'text-text-500' : 'text-text-900')}>
              {viaje.precio !== null ? formatearMoneda(viaje.precio) : '—'}
            </p>
            <p className="mt-1 text-[11px] text-text-400">por asiento</p>
          </div>

          <button
            type="button"
            data-trip-cta
            disabled={deshabilitado}
            aria-pressed={seleccionado}
            aria-label={
              deshabilitado
                ? `${motivo}: viaje ${viaje.origen} a ${viaje.destino} a las ${viaje.horaSalida}`
                : `${seleccionado ? 'Viaje seleccionado' : 'Elegir viaje'} ${viaje.origen} a ${viaje.destino} a las ${viaje.horaSalida}`
            }
            className={cn(
              'group/cta inline-flex h-10 min-w-[148px] shrink-0 items-center justify-center rounded-lg border px-3.5 text-[13px] font-semibold @2xl:w-full',
              'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-[var(--ease-premium)] active:scale-[0.97]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-line',
              deshabilitado && 'cursor-not-allowed border-border-subtle bg-transparent text-text-400',
              !deshabilitado &&
                !seleccionado &&
                'border-accent-line/40 bg-transparent text-accent-text group-hover/card:border-transparent group-hover/card:bg-cta group-hover/card:text-on-cta',
              seleccionado && 'border-accent-line bg-accent-line/12 text-accent-text',
            )}
          >
            {deshabilitado ? (
              <span>{motivo}</span>
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
