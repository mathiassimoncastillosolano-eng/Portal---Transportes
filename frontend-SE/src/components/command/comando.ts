import type { ReactNode } from 'react'

/** Una acción de la paleta de comandos (patrón Command: cada comando sabe ejecutarse solo). */
export interface Comando {
  id: string
  titulo: string
  descripcion: string
  icono: ReactNode
  /** Sinónimos para el buscador (sin tildes). */
  claves: string
  /** Título del grupo en la lista. Por defecto, "Acciones". */
  grupo?: string
  permiso?: string
  /** Solo aparece cuando el usuario escribe algo (para no llenar la lista inicial). */
  soloAlBuscar?: boolean
  /** Aún no existe el módulo: se muestra deshabilitado con "Pronto". */
  pronto?: boolean
  ejecutar?: () => void
}
