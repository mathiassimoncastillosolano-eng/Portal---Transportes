import logo from '@/assets/logo/logo.png'
import logoClaro from '@/assets/logo/logo-claro.png'
import { cn } from '@/utils/cn'

interface BrandLogoProps {
  compact?: boolean
  subtitle?: string
  tone?: 'light' | 'dark'
  size?: number
  className?: string
}

const BRILLO = 'drop-shadow-[0_6px_14px_rgba(45,212,168,0.2)]'

export function BrandLogo({ compact, subtitle, tone = 'light', size = 44, className }: BrandLogoProps) {
  const estilo = { height: size, width: 'auto' }

  return (
    <div className={cn('flex items-center gap-3 overflow-hidden', className)}>
      <span className="flex shrink-0 leading-none" aria-hidden="true">
        {tone === 'light' ? (
          <img src={logoClaro} alt="" className={cn('block max-w-none', BRILLO)} style={estilo} />
        ) : (
          <>
            <img src={logo} alt="" className="block max-w-none dark:hidden" style={estilo} />
            <img src={logoClaro} alt="" className={cn('hidden max-w-none dark:block', BRILLO)} style={estilo} />
          </>
        )}
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
