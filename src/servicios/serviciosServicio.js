// Este servicio consulta el backend real (Spring) para obtener los
// tipos de bus que se muestran en las tarjetas de la sección
// "Servicios". Reemplaza el uso de los datos mock definidos en
// `datos/servicios.js` para ese propósito.
//
// Nota: `datos/servicios.js` se conserva porque `viajesServicio.js`
// todavía lo utiliza para simular resultados de búsqueda de viajes,
// una funcionalidad fuera del alcance de este cambio.

const URL_BASE_API = 'http://localhost:8080/api'

/**
 * Obtiene los tipos de bus reales desde la base de datos, a través del
 * endpoint del backend, y los adapta a la forma que ya esperan los
 * componentes `CarruselServicios`/`TarjetaServicio`.
 * @returns {Promise<{ id: number, nombre: string, descripcion: string, caracteristica: string, imagen: string }[]>}
 */
export async function obtenerServicios() {
  const respuesta = await fetch(`${URL_BASE_API}/servicios`)

  if (!respuesta.ok) {
    throw new Error('No se pudo obtener la lista de servicios.')
  }

  const tiposBus = await respuesta.json()

  return tiposBus.map((tipoBus) => ({
    id: tipoBus.idTipoBus,
    nombre: tipoBus.nombreTipo,
    descripcion: tipoBus.descripcion,
    caracteristica: tipoBus.descripcionReclinacion,
    imagen: tipoBus.urlImagen,
  }))
}
