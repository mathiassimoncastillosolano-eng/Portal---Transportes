import { findNavContext } from '@/config/navigation'
import { useUIStore } from '@/stores/uiStore'

/**
 * Título de la pantalla actual en la barra superior (ej. "Registrar pasaje").
 * Ya no muestra la ruta "RutaLibre › Grupo ›": solo el nombre de la pantalla,
 * generado desde `navigationConfig` para que cualquier módulo nuevo lo
 * obtenga sin configuración extra.
 */
export function Breadcrumbs() {
  const activeSectionId = useUIStore((s) => s.activeSectionId)
  const contexto = findNavContext(activeSectionId)

  return (
    <p className="truncate text-sm font-semibold text-text-900" aria-current="page">
      {contexto?.item.title ?? 'Sección'}
    </p>
  )
}
