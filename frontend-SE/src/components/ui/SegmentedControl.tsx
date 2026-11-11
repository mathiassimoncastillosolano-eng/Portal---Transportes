import { cn } from '@/utils/cn'

export interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  label?: string
  name: string
  options: SegmentedControlOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Grupo de selección única con apariencia de segmented control.
 * Es un `<input type="radio">` accesible por debajo (navegable por
 * teclado, anunciado por lectores de pantalla) con una capa visual de
 * "chips". Se usa para preferencias de pocas opciones (ej. franja
 * horaria) donde un `<select>` sería una interacción innecesaria.
 */
export function SegmentedControl({ label, name, options, value, onChange, className }: SegmentedControlProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-sm font-medium text-text-700">{label}</span>}
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex flex-wrap gap-1.5 rounded-lg border border-border-strong bg-surface-sunken p-1"
      >
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                checked
                  ? 'bg-surface-card text-text-900 shadow-panel'
                  : 'text-text-500 hover:text-text-900',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}
