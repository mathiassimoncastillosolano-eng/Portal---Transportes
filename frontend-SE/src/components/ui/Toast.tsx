import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastTone } from '@/stores/toastStore'
import { cn } from '@/utils/cn'

const iconos = { success: CheckCircle2, danger: AlertTriangle, info: Info } as const
const colores: Record<ToastTone, string> = {
  success: 'text-success-500',
  danger: 'text-danger-500',
  info: 'text-info-500',
}
const rieles: Record<ToastTone, string> = {
  success: 'before:bg-success-500',
  danger: 'before:bg-danger-500',
  info: 'before:bg-info-500',
}

/** Zona de toasts. Se monta una sola vez (ver `AppProviders`); se dispara con `useToastStore().push`. */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print pointer-events-none fixed right-4 top-[76px] z-[150] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon = iconos[toast.tone]
        return (
          <div
            key={toast.id}
            className={cn(
              'animate-toast-in pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-border bg-surface-card p-4 pl-4 shadow-flyout',
              'before:absolute before:inset-y-0 before:left-0 before:w-1',
              rieles[toast.tone],
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', colores[toast.tone])} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-900">{toast.title}</p>
              {toast.description && <p className="mt-0.5 text-sm text-text-500">{toast.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Cerrar notificación"
              className="rounded-md p-1 text-text-400 transition-colors hover:bg-surface-sunken hover:text-text-700"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
