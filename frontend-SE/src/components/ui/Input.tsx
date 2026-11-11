import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  hint?: string
  error?: string
  /** Fuerza el estilo de error (borde/foco rojo) sin mostrar mensaje propio; útil cuando el mensaje se muestra una sola vez para varios campos (ej. login). Por defecto sigue a `error`. */
  invalid?: boolean
  iconLeft?: ReactNode
  /** Elemento interactivo a la derecha del campo, ej. el botón de mostrar/ocultar contraseña. */
  trailing?: ReactNode
  /** Texto fijo antes del valor, ej. "S/" para montos. */
  prefix?: string
  containerClassName?: string
}

/**
 * Input base del design system. Cubre label, hint, error y estado
 * disabled/focus de forma consistente — los formularios de negocio
 * (registro de pasajes, filtros del Dashboard) deberían montarse sobre este
 * componente en vez de reimplementar `<input>` sueltos.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    error,
    invalid,
    iconLeft,
    trailing,
    prefix,
    id,
    required,
    className,
    containerClassName,
    ...props
  },
  ref,
) {
  const showInvalid = invalid ?? !!error
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-700">
          {label}
          {required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {iconLeft && (
          <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-text-400">
            {iconLeft}
          </span>
        )}
        {prefix && (
          <span className="pointer-events-none absolute left-3 text-sm font-medium text-text-400">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={showInvalid}
          aria-describedby={cn(hintId, errorId) || undefined}
          className={cn(
            'h-9 w-full rounded-lg border border-border-strong bg-surface-card px-3 text-sm text-text-900',
            'transition-[border-color,box-shadow] duration-200 ease-[var(--ease-premium)]',
            'placeholder:text-text-400',
            'focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-100',
            'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-text-400',
            iconLeft && 'pl-9',
            prefix && 'pl-8',
            trailing && 'pr-9',
            showInvalid && 'border-danger-500 focus:border-danger-500 focus:ring-danger-50',
            className,
          )}
          {...props}
        />
        {trailing && <span className="absolute right-2 flex items-center">{trailing}</span>}
      </div>
      {error ? (
        <p id={errorId} className="text-xs font-medium text-danger-500">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-text-400">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
