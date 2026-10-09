// Textos contextuales del cargador. Breves, sin puntos suspensivos: la
// animación de los puntos la dibuja el componente.
//
// `etiqueta`  → línea superior de la escena.
// `mensaje`   → mientras el bus viaja.
// `espera`    → si la operación tarda más que el recorrido (el bus ya llegó).
// `listo`     → confirmación al llegar.

export const VARIANTES_CARGA = Object.freeze({
  destinos: {
    etiqueta: 'Explorando rutas',
    mensaje: 'Preparando destinos',
    espera: 'Seguimos preparando destinos',
    listo: 'Destinos listos',
  },
  busqueda: {
    etiqueta: 'Buscando tu viaje',
    mensaje: 'Consultando horarios y disponibilidad',
    espera: 'Esto está tardando un poco más',
    listo: 'Viajes consultados',
  },
  asientos: {
    etiqueta: 'Disponibilidad',
    mensaje: 'Consultando asientos',
    espera: 'Sincronizando la disponibilidad',
    listo: 'Asientos listos',
  },
  servicios: {
    etiqueta: 'Nuestros servicios',
    mensaje: 'Cargando servicios',
    espera: 'Seguimos cargando servicios',
    listo: 'Servicios listos',
  },
  procesamiento: {
    etiqueta: 'Procesando',
    mensaje: 'Procesando tu solicitud',
    espera: 'Un momento más',
    listo: '¡Ruta lista!',
  },
  generico: {
    etiqueta: 'RutaLibre',
    mensaje: 'Preparando información',
    espera: 'Un momento más',
    listo: '¡Ruta lista!',
  },
})

/** Quita puntos suspensivos finales para no duplicarlos con los animados. */
export function limpiarMensaje(texto) {
  return typeof texto === 'string' ? texto.replace(/(\.{2,}|…)+\s*$/u, '').trim() : texto
}
