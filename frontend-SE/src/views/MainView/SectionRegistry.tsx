import { findNavContext } from '@/config/navigation'
import { ClientesSection } from './sections/ClientesSection'
import { PasajesSection } from './sections/PasajesSection'
import { DashboardLazy } from './sections/DashboardLazy'
import { RegistrarPasajeSection } from './sections/RegistrarPasajeSection'
import { SectionPlaceholder } from './sections/SectionPlaceholder'

export function renderSection(sectionId: string) {
  if (sectionId === 'registrar-pasaje') return <RegistrarPasajeSection />
  if (sectionId === 'pasajes') return <PasajesSection />
  if (sectionId === 'clientes') return <ClientesSection />
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
