import { useSyncExternalStore } from 'react'

/** Suscribe un componente a un media query CSS y devuelve si coincide. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', onChange)
      return () => mediaQueryList.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Breakpoints alineados con la config por defecto de Tailwind. */
export const breakpoints = {
  mobile: '(max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)',
} as const

export type DeviceKind = 'mobile' | 'tablet' | 'desktop'

/** Devuelve el "tipo de dispositivo" actual según el ancho de viewport. */
export function useDeviceKind(): DeviceKind {
  const isMobile = useMediaQuery(breakpoints.mobile)
  const isTablet = useMediaQuery(breakpoints.tablet)
  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}
