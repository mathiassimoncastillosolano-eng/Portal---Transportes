import { lazy, Suspense } from 'react'
import { LoadingState } from '@/components/feedback/LoadingState'

// El Dashboard arrastra la librería de gráficos: se carga bajo demanda.
const DashboardSection = lazy(() =>
  import('./DashboardSection').then((m) => ({ default: m.DashboardSection })),
)

export function DashboardLazy() {
  return (
    <Suspense fallback={<LoadingState label="Cargando dashboard…" />}>
      <DashboardSection />
    </Suspense>
  )
}
