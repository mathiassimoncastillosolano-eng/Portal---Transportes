import { useState } from 'react'
import type { FiltrosDashboard } from '@/types/dashboard'
import { aConsulta, FILTROS_INICIALES, filtrosSonIniciales, validarRango } from '../utils/periodos'

/** Estado de los filtros del Dashboard: combinables, con validación de rango y opción "limpiar". */
export function useDashboardFilters() {
  const [filtros, setFiltros] = useState<FiltrosDashboard>(FILTROS_INICIALES)
  const errorRango = validarRango(filtros)

  return {
    filtros,
    errorRango,
    /** `null` mientras el rango personalizado sea inválido (no se consulta). */
    consulta: errorRango ? null : aConsulta(filtros),
    hayCambios: !filtrosSonIniciales(filtros),
    actualizar: (parcial: Partial<FiltrosDashboard>) => setFiltros((prev) => ({ ...prev, ...parcial })),
    limpiar: () => setFiltros(FILTROS_INICIALES),
  }
}
