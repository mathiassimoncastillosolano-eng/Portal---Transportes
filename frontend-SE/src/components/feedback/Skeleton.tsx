import type { CSSProperties } from 'react'
import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

/** Bloque de carga con shimmer sutil (barrido de brillo sobre la superficie hundida). Úsalo para previsualizar la forma del contenido mientras llega. */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-sunken',
        'before:absolute before:inset-0 before:bg-[linear-gradient(90deg,transparent,var(--color-border-strong),transparent)] before:bg-[length:80%_100%] before:bg-no-repeat before:opacity-70',
        'motion-safe:before:animate-[shimmer_1.8s_ease-in-out_infinite]',
        className,
      )}
      style={style}
      aria-hidden="true"
    />
  )
}

/** Skeleton de una card de KPI/resumen, con la misma geometría que las cards reales. */
export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-surface-card p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-7 w-20" />
    </div>
  )
}
