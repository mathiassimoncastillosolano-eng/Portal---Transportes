import { BrandLogo } from '@/components/brand/BrandLogo'
import { LoginBrandPanel } from './components/LoginBrandPanel'
import { LoginForm } from './components/LoginForm'

/**
 * Primera pantalla de la aplicación cuando no hay sesión (`authStore.status
 * === 'unauthenticated'`). No monta Sidebar, Header ni ninguna sección del
 * Shell — `ProtectedRoute` la renderiza en su lugar.
 *
 * Layout: panel visual (branding) + formulario, lado a lado desde `lg`. En
 * pantallas angostas el panel visual se reemplaza por un lockup compacto
 * arriba del formulario, para priorizar el formulario sin scroll vertical.
 */
export function LoginView() {
  return (
    <div className="flex h-screen min-h-[640px] w-full overflow-hidden bg-surface lg:h-screen">
      <div className="hidden w-[46%] shrink-0 lg:block xl:w-[50%]">
        <LoginBrandPanel />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {/* Lockup compacto: solo visible por debajo de `lg`, sustituye al panel visual completo. */}
        <div className="border-b border-border bg-[linear-gradient(155deg,var(--color-ink-950),var(--color-ink-900))] px-6 py-4 lg:hidden">
          <BrandLogo size={36} subtitle="Sistema Empresarial" />
        </div>

        <div className="flex flex-1 items-start justify-center px-6 py-10 sm:px-10 lg:items-center">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
