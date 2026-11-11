import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SECCION_INICIAL } from '@/config/navigation'

/**
 * Estado global de interfaz.
 *
 * Deliberadamente separado del estado de negocio (que vivirá dentro de
 * cada feature). Este store solo conoce "cómo se ve el shell", nunca datos
 * de pasajes, viajes, etc.
 */

export type SidebarState = 'expanded' | 'collapsed'

interface UIState {
  // --- Sidebar (desktop/tablet) ---
  sidebarState: SidebarState
  toggleSidebar: () => void
  setSidebarState: (state: SidebarState) => void

  // --- Sidebar (mobile drawer) ---
  mobileSidebarOpen: boolean
  openMobileSidebar: () => void
  closeMobileSidebar: () => void

  // --- Sede activa (= sede de venta del pasaje en el registro) ---
  currentBranchId: string
  setCurrentBranchId: (id: string) => void

  // --- Sección activa de la Main View ---
  // La app no navega entre páginas: el Sidebar cambia qué sección se
  // muestra dentro de la única pantalla principal (ver views/MainView).
  activeSectionId: string
  setActiveSection: (id: string) => void

  // --- Command palette (Ctrl/⌘ + K). Estado efímero: nunca se persiste. ---
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarState: 'expanded',
      toggleSidebar: () =>
        set({ sidebarState: get().sidebarState === 'expanded' ? 'collapsed' : 'expanded' }),
      setSidebarState: (state) => set({ sidebarState: state }),

      mobileSidebarOpen: false,
      openMobileSidebar: () => set({ mobileSidebarOpen: true }),
      closeMobileSidebar: () => set({ mobileSidebarOpen: false }),

      currentBranchId: 'lim-norte',
      setCurrentBranchId: (id) => set({ currentBranchId: id }),

      activeSectionId: SECCION_INICIAL,
      setActiveSection: (id) => set({ activeSectionId: id }),

      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    }),
    {
      name: 'rutalibre-ui-preferences',
      // Solo persistimos preferencias de interfaz, nunca estado efímero como el drawer móvil o la sección activa.
      partialize: (state) => ({
        sidebarState: state.sidebarState,
        currentBranchId: state.currentBranchId,
      }),
    },
  ),
)
