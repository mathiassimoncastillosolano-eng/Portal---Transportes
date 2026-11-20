import { useMemo } from 'react'
import { useDashboardFiltrosStore } from '@/stores/dashboardFiltrosStore'
import type { FiltrosDashboard } from '@/types/dashboard'
import { aConsulta, filtrosIniciales, filtrosSonIniciales, validarRango } from '../utils/periodos'

/**
 * Estado de los filtros del Dashboard: combinables, con validación de rango y opción "limpiar".
 * `hoy` es la fecha desde la que se cuentan los últimos 7, 30 o 90 días.
 * Los filtros viven en un store global para que la paleta de comandos (Ctrl K) también pueda cambiarlos.
 */
export function useDashboardFilters(hoy: string) {
  const cambios = useDashboardFiltrosStore((s) => s.cambios)
  const actualizar = useDashboardFiltrosStore((s) => s.actualizar)
  const limpiar = useDashboardFiltrosStore((s) => s.limpiar)

  // Filtros efectivos = iniciales (calculados con la fecha de hoy) + lo que el usuario cambió.
  const filtros = useMemo<FiltrosDashboard>(() => ({ ...filtrosIniciales(hoy), ...cambios }), [hoy, cambios])
  const errorRango = validarRango(filtros, hoy)

  return {
    filtros,
    errorRango,
    /** `null` mientras el rango personalizado sea inválido (no se consulta). */
    consulta: errorRango ? null : aConsulta(filtros, hoy),
    hayCambios: !filtrosSonIniciales(filtros),
    actualizar,
    limpiar,
  }
}
