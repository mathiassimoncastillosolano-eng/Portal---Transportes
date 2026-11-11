import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PageContainerProps {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Envoltorio estándar para el contenido de una sección de la Main View:
 * título, descripción opcional, zona de acciones y cuerpo. Cada sección
 * (Registrar pasaje, Dashboard) debería montar su contenido dentro de este
 * contenedor para mantener un espaciado consistente en todo el ERP.
 */
export function PageContainer({
  title,
  description,
  actions,
  children,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('mx-auto flex w-full max-w-[1400px] flex-col gap-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-text-900"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>
          {description && <p className="mt-1.5 text-sm leading-relaxed text-text-500">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
