import { ENTORNO_DASHBOARD } from '@/config/dashboard'
import type { DatosDashboard, OpcionesDashboard } from '@/types/dashboard'
import type { DashboardService } from '../contracts'
import { ApiError, solicitarApi } from './httpClient'

/**
 * Dashboard con datos reales del backend (GET /api/dashboard, solo rol GERENTE).
 * Cumple el mismo contrato que el mock, así que la pantalla no sabe de dónde vienen los datos.
 */
export const dashboardService: DashboardService = {
  async obtenerDashboard(consulta) {
    const parametros = new URLSearchParams({
      desde: consulta.rango.desde,
      hasta: consulta.rango.hasta,
      entorno: ENTORNO_DASHBOARD,
    })
    if (consulta.agenciaId) parametros.set('agencia', consulta.agenciaId)
    if (consulta.servicioId) parametros.set('servicio', consulta.servicioId)
    if (consulta.destino) parametros.set('destino', consulta.destino)

    const datos = await solicitarApi<DatosDashboard>(`/api/dashboard?${parametros}`)
    if (!Array.isArray(datos?.actual?.ventas) || !Array.isArray(datos?.anterior?.ventas)) {
      throw new ApiError('El servidor devolvió datos del Dashboard no válidos.', 0)
    }
    return datos
  },

  async obtenerOpciones() {
    const opciones = await solicitarApi<OpcionesDashboard>('/api/dashboard/opciones')
    if (!opciones?.hoy || !Array.isArray(opciones.agencias)) {
      throw new ApiError('El servidor devolvió opciones del Dashboard no válidas.', 0)
    }
    return opciones
  },
}
