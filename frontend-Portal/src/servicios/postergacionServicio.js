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
// La regla de 6 h (R2) se aplica a los dos viajes:
//  - al original: solo se puede cambiar si faltan 6 h o más para su salida;
//  - al nuevo: solo se ofrece si faltan 6 h o más para su salida.
// Ejemplo: a las 08:00 se puede pasar a cualquier salida desde las 14:00.
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
    nombre: 'Faltan 6 h o más para la salida del nuevo viaje',
    cumple: (viaje, pasaje, ahoraMs) => viaje.salidaMs - ahoraMs >= ANTICIPACION_MINIMA_MS,
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

// Un viaje se puede ofrecer solo si cumple TODAS las reglas.
export function esViajePostergable(viaje, pasaje, ahoraMs) {
  return REGLAS_POSTERGACION.every((regla) => regla.cumple(viaje, pasaje, ahoraMs))
}

// Separa los viajes en dos grupos: los que se muestran y cuántos se ocultan.
export function separarViajesPostergables(pasaje, viajes, ahoraMs) {
  const disponibles = viajes.filter((viaje) => esViajePostergable(viaje, pasaje, ahoraMs))
  const ocultos = viajes.length - disponibles.length
  return { viajes: disponibles, sinCupo: ocultos }
}

// Fachada: consulta la API real (/api/viajes/buscar) y aplica las reglas.
// Si la API falla, el error sube a la pantalla para mostrar "No pudimos consultar".
export async function buscarViajesPostergables(pasaje, criterios, ahoraMs = Date.now()) {
  const viajes = await buscarViajes({
    origen: criterios.origen,
    destino: criterios.destino,
    fecha: criterios.fecha,
  })
  return separarViajesPostergables(pasaje, viajes, ahoraMs)
}
