import type { AuthService, CatalogService, ClientesService, ConsultaViajesService, DashboardService, PasajesService } from './contracts'
import { consultaViajesService as consultaViajesServiceApi } from './api/consultaViajesService'
import { clientesService as clientesServiceApi } from './api/clientesService'
import { pasajesService as pasajesServiceApi } from './api/pasajesService'
import { authService as authServiceApi } from './api/authService'
import { catalogServiceMock } from './mock/catalogService'
import { dashboardService as dashboardServiceApi } from './api/dashboardService'

export * from './contracts'
export { ServiceError, esServiceError } from './errors'

export const catalogService: CatalogService = catalogServiceMock
export const dashboardService: DashboardService = dashboardServiceApi
export const consultaViajesService: ConsultaViajesService = consultaViajesServiceApi
export const clientesService: ClientesService = clientesServiceApi
export const pasajesService: PasajesService = pasajesServiceApi
export const authService: AuthService = authServiceApi
