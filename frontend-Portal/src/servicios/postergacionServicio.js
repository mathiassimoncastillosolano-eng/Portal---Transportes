// H2 · Consulta de viajes (Portal)
// Busca los viajes a los que el cliente puede mover (postergar) su pasaje.
//
// Patrones de diseño usados:
// 1) Fachada: la pantalla solo llama a buscarViajesPostergables() y no
//    necesita saber cómo se consulta la API ni cómo se filtra.
// 2) Estrategia (reglas): cada condición de la HU-02 es una regla separada.
//    Para agregar una condición nueva solo se agrega una regla a la lista.

import { buscarViajes } from './viajesServicio.js'
import { HORAS_MINIMAS_ANTICIPACION, salidaMsDe } from '../utilidades/postergacion.js'
import { fechaLocal } from '../utilidades/fechas.js'

const MS_HORA = 60 * 60 * 1000

// Momento (en milisegundos) en que sale el viaje original del pasaje.
export function salidaOriginalMs(pasaje) {
  return salidaMsDe(pasaje.fechaSalida, pasaje.horaSalida)
}

// Reglas de la HU-02. Cada regla recibe el viaje, el pasaje y la hora actual,
// y devuelve true si el viaje cumple la condición.
export const REGLAS_POSTERGACION = [
  {
    nombre: 'No es el mismo viaje del pasaje',
    cumple: (viaje, pasaje) => viaje.id !== pasaje.idViaje,
  },
  {
    nombre: 'Sale después del viaje original',
    cumple: (viaje, pasaje) => viaje.salidaMs > salidaOriginalMs(pasaje),
  },
  {
    nombre: 'Faltan 6 h o más para la salida original',
    cumple: (viaje, pasaje, ahoraMs) => salidaOriginalMs(pasaje) - ahoraMs >= HORAS_MINIMAS_ANTICIPACION * MS_HORA,
  },
  {
    nombre: 'Sale en el futuro',
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

// Un viaje se puede ofrecer solo si cumple TODAS las reglas.
export function esViajePostergable(viaje, pasaje, ahoraMs) {
  return REGLAS_POSTERGACION.every((regla) => regla.cumple(viaje, pasaje, ahoraMs))
}

// La postergación cambia la fecha u horario, no la ruta.
// Por eso el buscador solo muestra la ruta del pasaje original.
export function rutasDePostergacion(pasaje) {
  if (!pasaje) return []
  return [{ origen: pasaje.origen, destino: pasaje.destino }]
}

// Primer día que se puede buscar: el día del viaje original.
// Si ese día ya pasó en el calendario (no debería), se usa hoy.
export function fechaMinimaDePostergacion(pasaje, hoy = fechaLocal()) {
  return pasaje.fechaSalida > hoy ? pasaje.fechaSalida : hoy
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
