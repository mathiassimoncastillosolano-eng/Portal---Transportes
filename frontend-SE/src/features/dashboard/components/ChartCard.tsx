import type { ReactNode } from 'react'
import { BarChart3 } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Skeleton } from '@/components/feedback/Skeleton'
import { cn } from '@/utils/cn'

interface ChartCardProps {
  title: string
  description?: string
  cargando: boolean
  error?: boolean
  onRetry?: () => void
  vacio: boolean
  /** Alto reservado (px) para evitar saltos de layout mientras carga. */
  alto?: number
  /** Resumen textual del gráfico para lectores de pantalla. */
  resumen?: string
  children: ReactNode
  className?: string
}

/** Marco común de gráficos/rankings: estados de carga (Skeleton), error, vacío y alternativa textual. */
export function ChartCard({ title, description, cargando, error, onRetry, vacio, alto = 280, resumen, children, className }: ChartCardProps) {
  return (
    <Card className={cn('animate-fade-slide-up-sm', className)}>
      <CardHeader title={title} description={description} />
      {cargando ? (
        <Skeleton className="w-full rounded-xl" style={{ height: alto }} />
      ) : error ? (
        <ErrorState title="No pudimos cargar este gráfico" onRetry={onRetry} />
      ) : vacio ? (
        <EmptyState
          icon={BarChart3}
          title="Sin ventas para estos filtros"
          description="Amplía el período o quita algún filtro para ver resultados."
        />
      ) : (
        <div className="animate-fade-in">
          {resumen && <p className="sr-only">{resumen}</p>}
          {children}
        </div>
      )}
    </Card>
  )
}
