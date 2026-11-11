import { SearchX } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { Button } from '@/components/ui/Button'
import type { Catalogo } from '@/hooks/useCatalogo'
import type { ViajeListado } from '@/types/viaje'
import { TravelCard } from './TravelCard'

interface TravelListProps {
  viajes: ViajeListado[]
  cargando: boolean
  error: boolean
  catalogo: Catalogo | null
  seleccionadoId?: string
  /** Hay filtros aplicados (muestra "Restablecer filtros" en el estado vacío). */
  hayFiltros: boolean
  onSelect: (v: ViajeListado) => void
  onReintentar: () => void
  onReset: () => void
}

/** Lista de tarjetas con sus estados de carga, error y vacío. Flechas ↑/↓ mueven el foco entre las acciones. */
export function TravelList({ viajes, cargando, error, catalogo, seleccionadoId, hayFiltros, onSelect, onReintentar, onReset }: TravelListProps) {
  function alTeclear(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const acciones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[data-trip-cta]:not(:disabled)'))
    const i = acciones.findIndex((b) => b === document.activeElement)
    if (i === -1) return
    e.preventDefault()
    const siguiente = acciones[i + (e.key === 'ArrowDown' ? 1 : -1)]
    siguiente?.focus()
    siguiente?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  if (cargando) {
    return (
      <div role="status" aria-label="Cargando viajes" className="flex flex-col gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[176px] w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState title="No pudimos cargar los viajes" description="Revisa tu conexión e inténtalo de nuevo." onRetry={onReintentar} />
    )
  }

  if (viajes.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No hay viajes con esos filtros"
        description="Prueba con otra fecha, otro horario o quita algún filtro."
        action={
          hayFiltros ? (
            <Button variant="outline" size="sm" onClick={onReset}>
              Restablecer filtros
            </Button>
          ) : undefined
        }
      />
    )
  }

  const terminalDe = (id: string) => catalogo?.agencias.find((a) => a.id === id)?.name
  const terminalDestinoDe = (ciudad: string) => {
    const enCiudad = catalogo?.agencias.filter((a) => a.city === ciudad) ?? []
    return enCiudad.length === 1 ? enCiudad[0].name : undefined
  }

  return (
    <ul className="flex flex-col gap-3" onKeyDown={alTeclear}>
      {viajes.map((v, i) => {
        const servicio = catalogo?.servicios.find((s) => s.id === v.servicioId)
        return (
          <li key={v.id} className="animate-fade-slide-up-sm" style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
            <TravelCard
              viaje={v}
              servicioNombre={servicio?.nombre ?? v.servicioId}
              unidad={servicio?.unidad}
              duracionMin={catalogo?.rutas.find((r) => r.id === v.rutaId)?.duracionMin}
              terminalOrigen={terminalDe(v.agenciaId)}
              terminalDestino={terminalDestinoDe(v.destino)}
              seleccionado={seleccionadoId === v.id}
              onSelect={() => onSelect(v)}
            />
          </li>
        )
      })}
    </ul>
  )
}
