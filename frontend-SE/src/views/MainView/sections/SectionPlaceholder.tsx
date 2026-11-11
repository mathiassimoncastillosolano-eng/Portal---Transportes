import type { LucideIcon } from 'lucide-react'
import { Construction } from 'lucide-react'
import { PageContainer } from '@/components/navigation/PageContainer'
import { Badge } from '@/components/ui/Badge'

interface SectionPlaceholderProps {
  title: string
  description: string
  icon?: LucideIcon
}

/**
 * Placeholder profesional reutilizado por toda sección de la Main View
 * aún no implementada. Demuestra que el layout, el breadcrumb y el
 * cambio de sección funcionan de punta a punta sin construir lógica
 * de negocio.
 */
export function SectionPlaceholder({
  title,
  description,
  icon: Icon = Construction,
}: SectionPlaceholderProps) {
  return (
    <PageContainer title={title} description={description}>
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface-card px-6 py-24 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-500">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <Badge tone="neutral" className="mb-2">Próximamente</Badge>
          <p className="text-base font-medium text-text-900">Módulo de {title.toLowerCase()}</p>
          <p className="mt-1.5 max-w-md text-sm text-text-500">
            Este módulo será implementado posteriormente. Esta pantalla confirma que la
            navegación, el breadcrumb y la Main View ya están listos para recibirlo.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
