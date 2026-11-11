import type { CatalogService, DashboardService, TicketingService } from './contracts'
import { catalogServiceMock } from './mock/catalogService'
import { dashboardServiceMock } from './mock/dashboardService'
import { ticketingServiceMock } from './mock/ticketingService'

export * from './contracts'
export { ServiceError, esServiceError } from './errors'

/**
 * ÚNICO punto donde se elige la implementación de los servicios.
 *
 * Para conectar una API real: crear `services/api/*` que implementen los
 * contratos de `contracts.ts` y reemplazar aquí las tres importaciones
 * `mock` por las `api`. Ningún componente ni hook necesita cambios.
 */
export const catalogService: CatalogService = catalogServiceMock
export const ticketingService: TicketingService = ticketingServiceMock
export const dashboardService: DashboardService = dashboardServiceMock
