import type { ReactNode } from 'react'
import { ThemeSync } from '@/theme/ThemeSync'
import { ToastViewport } from '@/components/ui/Toast'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Punto único de composición de providers globales (theme, toasts, y más
 * adelante query client, i18n, auth provider real, etc.). Zustand no requiere Provider, pero
 * mantenerlo aquí evita anidar providers directamente en `main.tsx` cuando
 * se agreguen más adelante.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <>
      <ThemeSync />
      {children}
      <ToastViewport />
    </>
  )
}
