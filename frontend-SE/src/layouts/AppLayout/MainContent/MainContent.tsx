import { MainView } from '@/views/MainView/MainView'

/**
 * Área de contenido principal. Completamente independiente del Sidebar
 * y el Header: solo monta la Main View única de la aplicación. No hay
 * `Outlet` de router — el Sidebar cambia de sección dentro de la misma
 * pantalla en vez de navegar a otra página.
 */
export function MainContent() {
  return (
    <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <MainView />
    </main>
  )
}
