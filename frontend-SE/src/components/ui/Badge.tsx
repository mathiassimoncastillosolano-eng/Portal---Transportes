import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps {
  children: ReactNode
  tone?: 'accent' | 'route' | 'success' | 'danger' | 'warning' | 'neutral'
  className?: string
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  accent: 'bg-accent-100 text-accent-600',
  route: 'bg-route-100 text-route-600 dark:text-ink-300',
  success: 'bg-success-50 text-success-500',
  danger: 'bg-danger-50 text-danger-500',
  warning: 'bg-warning-50 text-warning-text',
  neutral: 'bg-surface-sunken text-text-500',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors duration-200',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
