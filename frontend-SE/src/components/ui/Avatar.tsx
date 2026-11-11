import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  size?: 'sm' | 'md'
  className?: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '')
  return initials.join('')
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
}

/** Avatar con iniciales — evita depender de imágenes externas en la plantilla base. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-accent-100 font-semibold text-accent-600',
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  )
}
