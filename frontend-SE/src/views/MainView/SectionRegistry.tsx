import { findNavContext } from '@/config/navigation'
import { DashboardLazy } from './sections/DashboardLazy'
import { RegistrarPasajeSection } from './sections/RegistrarPasajeSection'
import { SectionPlaceholder } from './sections/SectionPlaceholder'

/**
 * Registro central de secciones de la Main View.
 *
 * Cada `sectionId` de `config/navigation.ts` debe resolver a una entrada
 * aquí. Solo existen las secciones del MVP; cualquier otro id cae en el
 * fallback "Sección no encontrada".
 */
export function renderSection(sectionId: string) {
  if (sectionId === 'registrar-pasaje') return <RegistrarPasajeSection />
  if (sectionId === 'dashboard') return <DashboardLazy />

  const contexto = findNavContext(sectionId)
  if (contexto) {
    return (
      <SectionPlaceholder
        title={contexto.item.title}
        description={`${contexto.sectionLabel ?? 'Módulo'} · esta sección aún no está disponible en el MVP.`}
        icon={contexto.item.icon}
      />
    )
  }

  return (
    <SectionPlaceholder
      title="Sección no encontrada"
      description="Esta sección no está registrada en la Main View."
    />
  )
}
