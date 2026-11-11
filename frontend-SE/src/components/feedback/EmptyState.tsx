import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

/** Estado vacío estándar: una invitación a actuar, no solo un aviso. */
export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong py-16 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-sunken text-text-400">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-medium text-text-900">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-text-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}
