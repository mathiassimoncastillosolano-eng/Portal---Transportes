import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface RadioCardOption<T extends string> {
  value: T
  label: string
  description?: string
  icon?: ReactNode
}

interface RadioCardGroupProps<T extends string> {
  legend: string
  name: string
  options: RadioCardOption<T>[]
  value: T | ''
  onChange: (value: T) => void
  error?: string
  className?: string
}

/** Grupo de radios con apariencia de tarjetas (método de pago). Radios nativos: teclado y lectores de pantalla. */
export function RadioCardGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  error,
  className,
}: RadioCardGroupProps<T>) {
  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="mb-1 text-sm font-medium text-text-700">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              id={`${name}-${option.value}`}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border-strong bg-surface-card p-3',
                'transition-[border-color,background-color,box-shadow] duration-150 ease-[var(--ease-premium)]',
                'hover:border-text-400/50 hover:bg-surface-hover',
                'peer-checked:border-accent-line peer-checked:bg-surface-selected peer-checked:shadow-[0_0_0_1px_var(--color-accent-line)]',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-line',
                error && 'border-danger-500',
              )}
            >
              {option.icon && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-text-500">
                  {option.icon}
                </span>
              )}
              <span>
                <span className="block text-sm font-medium text-text-900">{option.label}</span>
                {option.description && <span className="block text-xs text-text-500">{option.description}</span>}
              </span>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs font-medium text-danger-500">{error}</p>}
    </fieldset>
  )
}
