import { cn } from '@/utils/cn'

interface BrandLogoProps {
  /** Solo el isotipo (sidebar contraído). */
  compact?: boolean
  /** Línea secundaria bajo el nombre (ej. "Sistema Empresarial"). */
  subtitle?: string
  /** `light` = nombre claro (sobre fondos oscuros); `dark` = nombre de marca (sobre fondos claros). */
  tone?: 'light' | 'dark'
  /** Lado del isotipo en px (el portal usa 44). */
  size?: number
  className?: string
}

/**
 * Logotipo de RutaLibre: isotipo "RL" + nombre, idéntico al del Portal de
 * Clientes (`barra-navegacion__isotipo` / `__nombre`): cuadrado de 14 px de
 * radio con degradado de marca profunda, brillo menta superior-izquierdo,
 * punto verde en la esquina y tipografía Space Grotesk. Los estilos viven en
 * `index.css` (`.brand-isotipo`) para que haya una única definición.
 */
export function BrandLogo({ compact, subtitle, tone = 'light', size = 44, className }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-3 overflow-hidden', className)}>
      <span className="brand-isotipo" style={{ ['--brand-size' as string]: `${size}px` }} aria-hidden="true">
        RL
      </span>
      {!compact && (
        <span className="min-w-0 leading-tight">
          <span
            className={cn(
              'block whitespace-nowrap font-display text-[1.32rem] font-bold tracking-[-0.02em]',
              tone === 'light' ? 'text-white' : 'text-ink-900 dark:text-text-900',
            )}
          >
            RutaLibre
          </span>
          {subtitle && <span className={cn('block text-[11px]', tone === 'light' ? 'text-ink-300' : 'text-text-500')}>{subtitle}</span>}
        </span>
      )}
    </div>
  )
}
