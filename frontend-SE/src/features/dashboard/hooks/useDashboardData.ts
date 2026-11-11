import { useMemo } from 'react'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { dashboardService } from '@/services'
import type { Agencia } from '@/types/agency'
import type { ConsultaDashboard } from '@/types/dashboard'
import type { Servicio } from '@/types/servicio'
import {
  agruparPorAgencia,
  agruparPorRuta,
  agruparPorServicio,
  calcularKpis,
  contarPasajes,
  serieDiaria,
} from '../utils/agregaciones'

/** Pide los hechos de venta al servicio y los agrega con funciones puras. Recalcula al cambiar cualquier filtro. */
export function useDashboardData(consulta: ConsultaDashboard | null, agencias: Agencia[], servicios: Servicio[]) {
  const clave = consulta ? JSON.stringify(consulta) : null
  const { data, cargando, error, reintentar } = useAsyncResource(clave, () =>
    consulta ? dashboardService.obtenerDashboard(consulta) : Promise.reject(new Error('Consulta inválida')),
  )

  const derivados = useMemo(() => {
    if (!data) return null
    const { actual, anterior } = data
    return {
      kpis: calcularKpis(actual, anterior),
      serie: serieDiaria(actual.ventas, actual.rango),
      porAgencia: agruparPorAgencia(actual.ventas, agencias),
      porServicio: agruparPorServicio(actual.ventas, servicios),
      porRuta: agruparPorRuta(actual.ventas),
      rangoAnterior: anterior.rango,
      hayVentas: contarPasajes(actual.ventas) > 0,
    }
  }, [data, agencias, servicios])

  return { datos: derivados, cargando, error, reintentar }
}
