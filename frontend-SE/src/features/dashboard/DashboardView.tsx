import { Building2, Gauge, Receipt, Route as RouteIcon, Ticket, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { PageContainer } from '@/components/navigation/PageContainer'
import { ENTORNO_DASHBOARD } from '@/config/dashboard'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { dashboardService } from '@/services'
import type { OpcionesDashboard } from '@/types/dashboard'
import { formatearFecha, formatearMoneda, formatearNumero, formatearPorcentaje } from '@/utils/formato'
import { DashboardFilters } from './components/DashboardFilters'
import { EvolutionChart } from './components/EvolutionChart'
import { HeroKpi } from './components/HeroKpi'
import { KpiCard } from './components/KpiCard'
import { RankingPanel } from './components/RankingPanel'
import { ServiceDistribution } from './components/ServiceDistribution'
import { useDashboardData } from './hooks/useDashboardData'
import { useDashboardFilters } from './hooks/useDashboardFilters'
import type { KpiId } from './utils/agregaciones'
import { resolverRango } from './utils/periodos'

const KPI_INFO: Record<KpiId, { label: string; icon: LucideIcon; formatear: (v: number) => string }> = {
  ingresos: { label: 'Ingresos', icon: Wallet, formatear: formatearMoneda },
  pasajes: { label: 'Pasajes vendidos', icon: Ticket, formatear: formatearNumero },
  ocupacion: { label: 'Ocupación promedio', icon: Gauge, formatear: (v) => formatearPorcentaje(v) },
  ticket: { label: 'Ticket promedio', icon: Receipt, formatear: formatearMoneda },
  viajes: { label: 'Viajes con ventas', icon: RouteIcon, formatear: formatearNumero },
  agencias: { label: 'Agencias activas', icon: Building2, formatear: formatearNumero },
}
const ORDEN_KPI: KpiId[] = ['pasajes', 'ocupacion', 'ticket', 'viajes']

/**
 * Dashboard empresarial. Primero carga las opciones de los filtros (y la fecha de hoy) y después muestra el panel:
 * así los períodos "últimos 7, 30 o 90 días" siempre se calculan desde la fecha correcta.
 */
export function DashboardView() {
  const { data: opciones, error, reintentar } = useAsyncResource('opciones', () => dashboardService.obtenerOpciones())

  if (error) {
    return (
      <PageContainer title="Panel de supervisión">
        <ErrorState title="No pudimos cargar el Dashboard" description="Revisa tu conexión e inténtalo de nuevo." onRetry={reintentar} />
      </PageContainer>
    )
  }
  if (!opciones) {
    return (
      <PageContainer title="Panel de supervisión">
        <LoadingState label="Cargando el Dashboard…" />
      </PageContainer>
    )
  }
  return <PanelDashboard opciones={opciones} />
}

/** KPIs, gráficos y rankings recalculados con los filtros. */
function PanelDashboard({ opciones }: { opciones: OpcionesDashboard }) {
  const { filtros, errorRango, consulta, hayCambios, actualizar, limpiar } = useDashboardFilters(opciones.hoy)
  const { datos, cargando, error, reintentar } = useDashboardData(consulta, opciones.agencias, opciones.servicios)
  const rango = resolverRango(filtros, opciones.hoy)

  const kpi = (id: KpiId) => datos?.kpis.find((k) => k.id === id)
  const cargandoKpis = cargando || (!datos && !error)
  const ingresos = kpi('ingresos')
  const pasajes = kpi('pasajes')
  const agencias = kpi('agencias')

  return (
    <PageContainer
      title="Panel de supervisión"
      description={`Ventas del ${formatearFecha(rango.desde)} al ${formatearFecha(rango.hasta)} · las variaciones comparan con el período anterior de igual duración.`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {ENTORNO_DASHBOARD === 'SANDBOX' && <Badge tone="warning" className="px-2.5 py-1">Ventas de prueba</Badge>}
          {agencias && agencias.valor !== null && (
            <Badge tone="accent" className="gap-1.5 px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              {formatearNumero(agencias.valor)} {agencias.valor === 1 ? 'agencia con ventas' : 'agencias con ventas'}
            </Badge>
          )}
        </div>
      }
    >
      <DashboardFilters filtros={filtros} opciones={opciones} errorRango={errorRango} hayCambios={hayCambios} onChange={actualizar} onClear={limpiar} />

      {/* Indicadores: el de ingresos manda (2×2); los otros cuatro se leen de un vistazo a su lado. */}
      <section aria-label="Indicadores" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroKpi
          label="Ingresos"
          loading={cargandoKpis}
          valor={ingresos && ingresos.valor !== null ? formatearMoneda(ingresos.valor) : null}
          variacion={ingresos?.variacion ?? null}
          tipoVariacion={ingresos?.tipoVariacion ?? 'porcentaje'}
          serie={datos?.serie ?? []}
          contexto={pasajes && pasajes.valor !== null ? `${formatearNumero(pasajes.valor)} pasajes emitidos en el período` : undefined}
        />
        {ORDEN_KPI.map((id, i) => {
          const info = KPI_INFO[id]
          const k = kpi(id)
          return (
            <KpiCard
              key={id}
              label={info.label}
              icon={info.icon}
              loading={cargandoKpis}
              valor={k && k.valor !== null ? info.formatear(k.valor) : null}
              variacion={k?.variacion ?? null}
              tipoVariacion={k?.tipoVariacion ?? 'porcentaje'}
              delayMs={(i + 1) * 60}
            />
          )
        })}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <EvolutionChart serie={datos?.serie ?? []} cargando={cargando} error={error} onRetry={reintentar} hayVentas={datos?.hayVentas ?? false} />
        <ServiceDistribution filas={datos?.porServicio ?? []} cargando={cargando} error={error} onRetry={reintentar} hayVentas={datos?.hayVentas ?? false} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <RankingPanel
          title="Ranking de agencias"
          description="Ingresos por agencia de salida del viaje"
          encabezado="Agencia"
          filas={datos?.porAgencia ?? []}
          cargando={cargando}
          error={error}
          onRetry={reintentar}
          hayVentas={datos?.hayVentas ?? false}
          etiquetaCorta={(e) => e.replace(/^(Agencia|Terminal( Terrestre)?) /, '')}
          anchoEtiqueta={92}
        />
        <RankingPanel
          title="Ranking de rutas"
          description="Ingresos por ruta (origen → destino)"
          encabezado="Ruta"
          filas={datos?.porRuta ?? []}
          cargando={cargando}
          error={error}
          onRetry={reintentar}
          hayVentas={datos?.hayVentas ?? false}
          anchoEtiqueta={130}
        />
      </div>
    </PageContainer>
  )
}
