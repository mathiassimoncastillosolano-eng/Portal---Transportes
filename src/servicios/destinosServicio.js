// Este servicio consulta el backend real (Spring) para obtener los
// destinos que se muestran en las tarjetas de la sección "Destinos".
// Reemplaza el uso de los datos mock definidos antes en `datos/destinos.js`.

const URL_BASE_API = 'http://localhost:8080/api'

/**
 * Obtiene los destinos activos desde la base de datos real, a través del
 * endpoint del backend.
 * @returns {Promise<{ id: number, ciudad: string, imagen: string }[]>}
 */
export async function obtenerDestinos() {
  const respuesta = await fetch(`${URL_BASE_API}/destinos`)

  if (!respuesta.ok) {
    throw new Error('No se pudo obtener la lista de destinos.')
  }

  return respuesta.json()
}
