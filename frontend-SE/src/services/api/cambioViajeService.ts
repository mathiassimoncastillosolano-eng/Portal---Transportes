import type {
  ConfirmacionCambio,
  CotizacionCambio,
  ElegibilidadCambio,
  IntentoPagoCambio,
  ResultadoPagoCambio,
  SolicitudConfirmarCambio,
  SolicitudPagoCambio,
  ViajesParaCambio,
} from '@/types/cambioViaje'
import { ApiError, esApiError, solicitarApi } from './httpClient'

/**
 * Fachada del cambio de viajes: el modal solo llama a estas funciones y no necesita saber
 * las rutas del backend. Es el mismo patrón que postergacionServicio.js del Portal.
 */

function ruta(idPasaje: number): string {
  return `/api/pasajes/${idPasaje}/cambio-viaje`
}

export const cambioViajeService = {
  consultarElegibilidad(idPasaje: number) {
    return solicitarApi<ElegibilidadCambio>(`${ruta(idPasaje)}/elegibilidad`)
  },

  async buscarViajes(idPasaje: number, criterios: { origen: string; destino: string; fecha: string }) {
    const parametros = new URLSearchParams(criterios)
    const respuesta = await solicitarApi<ViajesParaCambio>(`${ruta(idPasaje)}/viajes?${parametros}`)
    if (!respuesta || !Array.isArray(respuesta.viajes)) {
      throw new ApiError('El servidor devolvió una lista de viajes no válida.', 0)
    }
    return respuesta
  },

  cotizar(idPasaje: number, idViajeNuevo: number, idAsiento: number) {
    const parametros = new URLSearchParams({ idViajeNuevo: String(idViajeNuevo), idAsiento: String(idAsiento) })
    return solicitarApi<CotizacionCambio>(`${ruta(idPasaje)}/cotizacion?${parametros}`)
  },

  confirmarSinCobro(idPasaje: number, solicitud: SolicitudConfirmarCambio) {
    return solicitarApi<ConfirmacionCambio>(`${ruta(idPasaje)}/confirmar`, { method: 'POST', body: solicitud })
  },

  registrarPago(idPasaje: number, solicitud: SolicitudPagoCambio) {
    return solicitarApi<ResultadoPagoCambio>(`${ruta(idPasaje)}/pagos`, { method: 'POST', body: solicitud })
  },

  listarIntentos(idPasaje: number) {
    return solicitarApi<IntentoPagoCambio[]>(`${ruta(idPasaje)}/pagos`)
  },

  // Suelta todos los asientos reservados en la sesión. keepalive: el navegador termina el envío
  // aunque la pestaña se esté cerrando, así el asiento no queda bloqueado para otros.
  liberarReserva(idViaje: number, tokenSesion: string) {
    return solicitarApi(`/api/viajes/${idViaje}/sesiones/liberar`, {
      method: 'POST',
      autenticar: false,
      keepalive: true,
      body: { tokenSesion },
    }).catch(() => undefined)
  },
}

// El backend manda el motivo del rechazo como código en "detalles" (por ejemplo SESION_VENCIDA).
export function codigoDeError(error: unknown): string | null {
  if (!esApiError(error) || !Array.isArray(error.detalles)) return null
  const codigo = error.detalles[0]
  return typeof codigo === 'string' ? codigo : null
}

export function mensajeDeError(error: unknown, defecto: string): string {
  return esApiError(error) ? error.message : defecto
}
