// Tiempos del sistema de carga de RutaLibre (CargadorRutaLibre / PanelAsincrono).
//
// Es lógica pura, sin React ni DOM, para poder probarla con `npm test`.
// La animación del bus dura `recorrido`; si la API responde antes, se espera
// lo que falte (así nunca hay un destello loader → contenido). Si responde
// después, el bus espera en el destino y el cierre arranca de inmediato.

export const TIEMPOS_NORMALES = Object.freeze({
  recorrido: 1500, // el bus avanza de origen a destino
  llegada: 420, // el destino confirma (✓)
  salida: 260, // el cargador se desvanece
  minimoFalla: 700, // ante un error no se obliga al usuario a ver el viaje completo
})

// Con prefers-reduced-motion no hay recorrido que esperar, pero se conserva
// una permanencia mínima para que la pantalla no parpadee.
export const TIEMPOS_REDUCIDOS = Object.freeze({
  recorrido: 600,
  llegada: 160,
  salida: 120,
  minimoFalla: 300,
})

export function elegirTiempos(reducirMovimiento) {
  return reducirMovimiento ? TIEMPOS_REDUCIDOS : TIEMPOS_NORMALES
}

/** Milisegundos que faltan para poder cerrar el viaje (nunca negativo). */
export function esperaParaLlegar({ transcurrido, falla = false, tiempos = TIEMPOS_NORMALES }) {
  const minimo = falla ? tiempos.minimoFalla : tiempos.recorrido
  return Math.max(0, minimo - Math.max(0, transcurrido))
}

/**
 * Fases por las que pasa el cargador una vez cumplido el mínimo.
 * Éxito: llegada (✓) → salida. Error: directo a salida (el bus se detiene,
 * no hay confirmación que mostrar).
 */
export function secuenciaDeCierre({ falla = false, tiempos = TIEMPOS_NORMALES }) {
  const salida = { fase: 'saliendo', duracion: tiempos.salida }
  return falla ? [salida] : [{ fase: 'llegada', duracion: tiempos.llegada }, salida]
}

/** Duración total mínima visible (ms) de un viaje exitoso, hasta que aparece el contenido. */
export function duracionMinimaTotal(tiempos = TIEMPOS_NORMALES) {
  return secuenciaDeCierre({ tiempos }).reduce((total, paso) => total + paso.duracion, tiempos.recorrido)
}
