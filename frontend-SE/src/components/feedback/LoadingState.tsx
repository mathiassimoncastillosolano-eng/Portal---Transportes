import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  label?: string
}

/** Estado de carga estándar para cualquier módulo que consuma datos asíncronos. */
export function LoadingState({ label = 'Cargando…' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-500">
      <Loader2 className="h-5 w-5 animate-spin text-accent-500" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
