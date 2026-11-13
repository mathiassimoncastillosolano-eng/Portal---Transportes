// H2 · Consulta de viajes (Portal)
// Busca los viajes a los que el cliente puede mover su pasaje: a otra salida,
// con la ruta que elija entre las disponibles en el portal.
//
// Patrones de diseño usados:
// 1) Fachada: la pantalla solo llama a buscarViajesPostergables() y no
//    necesita saber cómo se consulta la API ni cómo se filtra.
// 2) Estrategia (reglas): cada condición de la HU-02 es una regla separada.
//    Para agregar una condición nueva solo se agrega una regla a la lista.

import { buscarViajes } from './viajesServicio.js'
import { solicitarApi } from './httpCliente.js'
import { HORAS_MINIMAS_ANTICIPACION, salidaMsDe } from '../utilidades/postergacion.js'

const MS_HORA = 60 * 60 * 1000

// Momento (en milisegundos) en que sale el viaje original del pasaje.
export function salidaOriginalMs(pasaje) {
  return salidaMsDe(pasaje.fechaSalida, pasaje.horaSalida)
}

// Una ruta distinta sí es un viaje nuevo, aunque salga a la misma hora.
export function esMismaSalida(viaje, pasaje) {
  return viaje.origen === pasaje.origen && viaje.destino === pasaje.destino
    && viaje.fechaSalida === pasaje.fechaSalida && viaje.horaSalida === pasaje.horaSalida
}

// Anticipación mínima de la regla R2, en milisegundos (6 h).
const ANTICIPACION_MINIMA_MS = HORAS_MINIMAS_ANTICIPACION * MS_HORA

// Reglas de la HU-02. Cada regla recibe el viaje, el pasaje y la hora actual,
// y devuelve true si el viaje cumple la condición.
// La regla de 6 h (R2) es SOLO para el viaje original: el pasaje se puede
// cambiar si faltan 6 h o más para su salida.
// El viaje nuevo solo debe no haber salido, tener asientos y poder reservarse
// (la reserva normal cierra 20 minutos antes de la salida).
// Ejemplo: a las 08:00 se puede adelantar a un viaje que sale a las 10:00.
export const REGLAS_POSTERGACION = [
  {
    nombre: 'Cambia la ruta, fecha u hora del viaje',
    cumple: (viaje, pasaje) => !esMismaSalida(viaje, pasaje),
  },
  {
    nombre: 'Faltan 6 h o más para la salida original',
    cumple: (viaje, pasaje, ahoraMs) => salidaOriginalMs(pasaje) - ahoraMs >= ANTICIPACION_MINIMA_MS,
  },
  {
    nombre: 'El nuevo viaje todavía no sale',
    cumple: (viaje, pasaje, ahoraMs) => viaje.salidaMs > ahoraMs,
  },
  {
    nombre: 'Tiene asientos disponibles',
    cumple: (viaje) => viaje.asientosDisponibles > 0,
  },
  {
    nombre: 'El servidor todavía permite reservarlo',
    cumple: (viaje) => viaje.reservable !== false,
  },
]

// Un viaje se puede ELEGIR solo si cumple TODAS las reglas.
export function esViajePostergable(viaje, pasaje, ahoraMs) {
  return REGLAS_POSTERGACION.every((regla) => regla.cumple(viaje, pasaje, ahoraMs))
}

// Regla de 6 h (R2) del viaje ORIGINAL: si no se cumple, no se puede cambiar el
// pasaje. Es el mismo mensaje y código (409) que devuelve el servidor.
export function revisarAnticipacionOriginal(pasaje, ahoraMs) {
  if (salidaOriginalMs(pasaje) - ahoraMs >= ANTICIPACION_MINIMA_MS) return
  const error = new Error('Solo puedes cambiar tu pasaje hasta 6 horas antes de la salida.')
  error.status = 409
  throw error
}

// Prepara la lista del paso 1, igual que la búsqueda normal: se muestran TODOS
// los viajes de esa ruta y fecha (también los que ya salieron, están llenos o
// cerraron su reserva), menos el viaje original. La tarjeta de cada viaje
// muestra su estado y solo deja elegir los que cumplen las reglas.
export function prepararViajesPostergables(pasaje, viajes, ahoraMs) {
  revisarAnticipacionOriginal(pasaje, ahoraMs)
  const mostrados = viajes.filter((viaje) => !esMismaSalida(viaje, pasaje))
  return { viajes: mostrados, ocultos: viajes.length - mostrados.length }
}

// Pasaje REAL: el servidor revisa que el pasaje sea del cliente, que esté
// vigente y la regla de 6 h, y devuelve todos los viajes menos el original.
// Si rechaza, el error trae el motivo (por ejemplo, "faltan menos de 6 horas").
export async function consultarViajesEnServidor(pasaje, criterios) {
  const parametros = new URLSearchParams({
    origen: criterios.origen,
    destino: criterios.destino,
    fecha: criterios.fecha,
  })
  const respuesta = await solicitarApi(`/api/usuarios/postergaciones/${pasaje.idPasaje}/viajes?${parametros}`)
  if (!respuesta || !Array.isArray(respuesta.viajes)) {
    throw new Error('El servidor devolvió una respuesta de viajes no válida.')
  }
  return respuesta
}

// Fachada: la pantalla siempre llama a esta función.
// - Pasaje real (viene de "Mis pasajes"): consulta el endpoint de postergación.
// - Pasaje de prueba (mock): usa la búsqueda pública de viajes, como antes.
// En los dos casos se prepara la lista igual, para que la pantalla se
// comporte igual. Si la API falla o rechaza el cambio, el error sube a la pantalla.
export async function buscarViajesPostergables(pasaje, criterios, ahoraMs = Date.now()) {
  if (pasaje.deCompraReal) {
    const respuesta = await consultarViajesEnServidor(pasaje, criterios)
    const resultado = prepararViajesPostergables(pasaje, respuesta.viajes, ahoraMs)
    return { viajes: resultado.viajes, ocultos: resultado.ocultos + (respuesta.ocultos ?? 0) }
  }
  const viajes = await buscarViajes({
    origen: criterios.origen,
    destino: criterios.destino,
    fecha: criterios.fecha,
  })
  return prepararViajesPostergables(pasaje, viajes, ahoraMs)
}
