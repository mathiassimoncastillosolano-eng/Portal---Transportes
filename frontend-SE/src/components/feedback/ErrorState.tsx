import type { ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  /** Acciones adicionales (ej. "Elegir otro asiento"). */
  actions?: ReactNode
}

/** Estado de error estándar. La voz es directa: qué pasó y qué hacer. */
export function ErrorState({
  title = 'Algo salió mal',
  description = 'No pudimos cargar esta información. Inténtalo de nuevo.',
  onRetry,
  actions,
}: ErrorStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-xl border border-danger-50 bg-danger-50/40 py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-danger-50 text-danger-500">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-text-900">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-text-500">{description}</p>
      </div>
      {(onRetry || actions) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} iconLeft={<RotateCw className="h-3.5 w-3.5" aria-hidden="true" />}>
              Reintentar
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}
