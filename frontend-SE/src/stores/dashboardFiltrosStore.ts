import { create } from 'zustand'
import type { FiltrosDashboard } from '@/types/dashboard'

/**
 * Filtros del Dashboard compartidos por toda la app.
 *
 * Se guardan solo los *cambios* respecto a los filtros iniciales (últimos 30 días, sin filtros), porque los
 * iniciales dependen de la fecha de hoy y esa fecha la conoce el Dashboard. Así, el Dashboard y la paleta de
 * comandos (Ctrl K) leen y cambian los mismos filtros. No se persiste: al recargar la página se empieza de cero.
 */
interface DashboardFiltrosState {
  cambios: Partial<FiltrosDashboard>
  /** Combina los cambios nuevos con los que ya había (por ejemplo, agencia + período). */
  actualizar: (parcial: Partial<FiltrosDashboard>) => void
  /** Vuelve a los filtros iniciales. */
  limpiar: () => void
}

export const useDashboardFiltrosStore = create<DashboardFiltrosState>()((set) => ({
  cambios: {},
  actualizar: (parcial) => set((estado) => ({ cambios: { ...estado.cambios, ...parcial } })),
  limpiar: () => set({ cambios: {} }),
}))
