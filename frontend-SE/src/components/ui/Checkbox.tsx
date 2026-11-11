import { useId, type InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: string
  description?: string
}

/** Checkbox del design system: casilla nativa (accesible, teclado) con marca dibujada encima. */
export function Checkbox({ label, description, id, className, ...props }: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <label htmlFor={checkboxId} className={cn('group flex cursor-pointer items-start gap-2.5', className)}>
      <span className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <input id={checkboxId} type="checkbox" className="peer sr-only" {...props} />
        <span
          className={cn(
            'absolute inset-0 rounded-[5px] border border-border-strong bg-surface-card',
            'transition-[background-color,border-color] duration-150 ease-[var(--ease-premium)]',
            'peer-checked:border-accent-500 peer-checked:bg-accent-500',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent-500',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          )}
        />
        <Check
          className="pointer-events-none relative h-3 w-3 scale-50 text-on-cta opacity-0 transition-all duration-150 ease-[var(--ease-premium)] peer-checked:scale-100 peer-checked:opacity-100"
          strokeWidth={3}
          aria-hidden="true"
        />
      </span>
      <span className="text-sm leading-tight text-text-700">
        {label}
        {description && <span className="mt-0.5 block text-xs text-text-500">{description}</span>}
      </span>
    </label>
  )
}
