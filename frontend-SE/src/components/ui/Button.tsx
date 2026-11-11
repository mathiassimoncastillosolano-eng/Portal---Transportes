import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white shadow-sm hover:bg-primary-600 hover:shadow-panel active:bg-primary-700',
  /** CTA del flujo de venta: verde de marca (tokens `cta`, con texto de contraste propio). */
  accent:
    'bg-cta text-on-cta font-semibold shadow-sm hover:bg-cta-hover hover:shadow-panel active:bg-cta-active',
  secondary:
    'bg-route-500 text-white shadow-sm hover:bg-route-600 hover:shadow-panel active:bg-route-600',
  outline:
    'border border-border-strong bg-surface-card text-text-700 hover:border-border-strong hover:bg-surface-sunken active:bg-surface',
  ghost: 'text-text-700 hover:bg-surface-sunken active:bg-surface',
  danger: 'bg-destructive text-white shadow-sm hover:bg-destructive-hover hover:shadow-panel active:bg-destructive-active',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
}

/**
 * Botón base del design system. Toda acción del ERP (primaria, secundaria,
 * destructiva o de bajo énfasis) debería montarse sobre este componente en
 * lugar de reimplementar clases de botón localmente en cada pantalla.
 *
 * Estados: hover (elevación sutil), active (presión táctil vía `scale`),
 * focus-visible (anillo de acento), disabled y loading (spinner sustituye
 * el ícono izquierdo, el label se conserva para no saltar de tamaño).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  iconLeft,
  iconRight,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-medium',
        'transition-[background-color,box-shadow,transform,border-color] duration-200 ease-[var(--ease-premium)]',
        'active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:active:scale-100',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  )
}
