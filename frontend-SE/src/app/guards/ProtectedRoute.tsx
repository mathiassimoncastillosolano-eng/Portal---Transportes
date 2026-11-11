import { BrandLogo } from '@/components/brand/BrandLogo'
import { useEffect, type ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { LoginView } from '@/views/Auth/LoginView'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Puerta de autenticación y único lugar que decide entre Login y Shell:
 *
 *   'loading'         -> pantalla de verificación (marca + spinner)
 *   'unauthenticated' -> `LoginView` (sin Sidebar, Header ni contenido del SE)
 *   'authenticated'   -> `children` (el `AppLayout` protegido)
 *
 * `init()` se dispara una sola vez al montar la app y resuelve el estado
 * inicial comprobando si ya existe una sesión simulada (ver `authStore`).
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status)
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    init()
    // Se ejecuta una sola vez, al montar la app.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[linear-gradient(155deg,var(--color-ink-950),var(--color-ink-900))]">
        <BrandLogo className="animate-fade-slide-up" />
        <div
          className="animate-fade-slide-up-sm flex items-center gap-2.5 text-sm text-ink-300"
          style={{ animationDelay: '120ms' }}
        >
          <span
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-700 border-t-accent-400"
            aria-hidden="true"
          />
          Verificando sesión…
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <LoginView />
  }

  return <>{children}</>
}
