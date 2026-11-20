import type { ConsultaPasajes, OpcionesFiltroPasajes, PaginaPasajes } from '@/types/listadoPasajes'
import type { PasajesService } from '../contracts'
import { ApiError, solicitarApi } from './httpClient'

export const pasajesService: PasajesService = {
  async listar(consulta: ConsultaPasajes) {
    const parametros = new URLSearchParams({
      orden: consulta.orden,
      direccion: consulta.direccion,
      pagina: String(consulta.pagina),
      tamano: String(consulta.tamano),
    })
    if (consulta.q.trim()) parametros.set('q', consulta.q.trim())
    if (consulta.cliente) parametros.set('idPasajero', String(consulta.cliente.id))
    if (consulta.origen) parametros.set('origen', consulta.origen)
    if (consulta.destino) parametros.set('destino', consulta.destino)
    if (consulta.desde) parametros.set('desde', consulta.desde)
    if (consulta.hasta) parametros.set('hasta', consulta.hasta)
    if (consulta.estado) parametros.set('estado', consulta.estado)
    if (consulta.fase) parametros.set('fase', consulta.fase)
    const pagina = await solicitarApi<PaginaPasajes>(`/api/pasajes?${parametros}`)
    if (!pagina || !Array.isArray(pagina.contenido)) throw new ApiError('El servidor devolvió una lista de pasajes no válida.', 0)
    return pagina
  },

  async opciones() {
    return solicitarApi<OpcionesFiltroPasajes>('/api/pasajes/opciones')
  },
}
