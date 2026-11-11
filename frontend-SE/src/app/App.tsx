import { AppProviders } from './providers/AppProviders'
import { ProtectedRoute } from './guards/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout/AppLayout'

/**
 * Composición raíz de la aplicación: providers globales + guard de
 * autenticación + Shell. No hay router: la app es una única Main View
 * (ver `views/MainView`), así que no existe un árbol de rutas que
 * componer aquí.
 */
export function App() {
  return (
    <AppProviders>
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    </AppProviders>
  )
}
