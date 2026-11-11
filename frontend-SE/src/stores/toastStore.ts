import { create } from 'zustand'

export type ToastTone = 'success' | 'danger' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastState {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

let siguienteId = 1

/** Feedback efímero de acciones (guardado, error, etc.). Se cierra solo a los 5 s. */
export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = siguienteId++
    set({ toasts: [...get().toasts, { ...toast, id }] })
    window.setTimeout(() => get().dismiss(id), 5000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))
