import { agenciasMock, metodosPagoMock, rutasMock, serviciosMock } from '@/data/mock'
import type { CatalogService } from '../contracts'
import { simularLatencia } from './latencia'

export const catalogServiceMock: CatalogService = {
  async listarAgencias() {
    await simularLatencia(120, 250)
    return agenciasMock.filter((a) => a.status === 'activa')
  },
  async listarServicios() {
    await simularLatencia(120, 250)
    return serviciosMock
  },
  async listarMetodosPago() {
    await simularLatencia(120, 250)
    return metodosPagoMock
  },
  async listarCiudades() {
    await simularLatencia(120, 250)
    const ciudades = new Set(rutasMock.flatMap((r) => [r.origen, r.destino]))
    return [...ciudades].sort((a, b) => a.localeCompare(b, 'es'))
  },  async listarRutas() {
    await simularLatencia(120, 250)
    return rutasMock
  },
}
