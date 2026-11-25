import { SearchX } from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Button } from '@/components/ui/Button'
import type { ViajeConsulta } from '@/types/consultaViaje'
import { calcularDesfaseServidor, estadoReservaActual } from '../utils/viajes'
import { TravelCard } from './TravelCard'
import { TravelCardSkeleton } from './TravelCardSkeleton'

interface TravelListProps {
  viajes: ViajeConsulta[]
  cargando: boolean
  error: string | null
  seleccionadoId?: number
  hayFiltros: boolean
  onSelect: (v: ViajeConsulta) => void
  onReintentar: () => void
  onReset: () => void
}

export function TravelList({ viajes, cargando, error, seleccionadoId, hayFiltros, onSelect, onReintentar, onReset }: TravelListProps) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    const temporizador = window.setInterval(() => setAhora(Date.now()), 15_000)
    return () => window.clearInterval(temporizador)
  }, [])

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
          <div key={i} className="animate-fade-slide-up-sm" style={{ animationDelay: `${i * 70}ms` }}>
            <TravelCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <ErrorState title="No pudimos cargar los viajes" description={error} onRetry={onReintentar} />
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

  const desfase = calcularDesfaseServidor(viajes, ahora)

  return (
    <ul className="flex flex-col gap-3" onKeyDown={alTeclear}>
      {viajes.map((v, i) => (
        <li key={v.id} className="animate-fade-slide-up-sm" style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}>
          <TravelCard
            viaje={v}
            estado={estadoReservaActual(v, ahora + desfase)}
            seleccionado={seleccionadoId === v.id}
            onSelect={() => onSelect(v)}
          />
        </li>
      ))}
    </ul>
  )
}
