import { Building2, Globe2 } from 'lucide-react'
import { Skeleton } from '@/components/feedback/Skeleton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { TODAS_LAS_SEDES, useAuthStore } from '@/stores/authStore'

/**
 * Sede asignada al usuario: solo informativa (no se puede cambiar). El
 * personal de agencia queda atado a la sede con la que ingresó —que es
 * también la sede de venta de sus pasajes—; el gerente supervisa todas.
 */
export function BranchInfo() {
  const user = useAuthStore((s) => s.user)
  const { catalogo, cargando } = useCatalogo()

  if (!user) return null

  const global = user.agenciaId === TODAS_LAS_SEDES
  const agencia = catalogo?.agencias.find((a) => a.id === user.agenciaId)

  if (!global && (cargando || !catalogo)) return <Skeleton className="h-10 w-48 rounded-[10px]" />

  const titulo = global ? 'Todas las sedes' : (agencia?.name ?? '—')
  const detalle = global ? 'Gerencia general' : (agencia?.location ?? 'Sede asignada')
  const Icono = global ? Globe2 : Building2

  return (
    <div
      role="status"
      aria-label={`Sede asignada: ${titulo}`}
      title={global ? 'Supervisas todas las sedes' : 'Tu sede asignada'}
      className="flex h-10 cursor-default select-none items-center gap-2.5 rounded-[10px] border border-border bg-surface-sunken pl-1.5 pr-3.5"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-text">
        <Icono className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="hidden min-w-0 leading-tight sm:block">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-text-500">{global ? 'Alcance' : 'Sede asignada'}</span>
        <span className="block max-w-[200px] truncate text-[13px] font-semibold text-text-900">{titulo}</span>
      </span>
      <span className="sr-only sm:hidden">{titulo}</span>
      <span className="hidden text-xs text-text-500 xl:block">· {detalle}</span>
    </div>
  )
}
