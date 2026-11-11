import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Eleva la sombra y sube 1px el borde al pasar el mouse; para cards que representan una entidad seleccionable. */
  hoverable?: boolean
}

/** Contenedor base de paneles: borde, superficie y sombra del sistema. */
export function Card({ className, hoverable, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface-card p-5 shadow-panel',
        'transition-shadow duration-200 ease-[var(--ease-premium)]',
        hoverable && 'hover:shadow-panel-hover',
        className,
      )}
      {...props}
    />
  )
}

interface CardHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

/** Encabezado estándar de una Card: título, descripción opcional y acciones. */
export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-text-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-text-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
