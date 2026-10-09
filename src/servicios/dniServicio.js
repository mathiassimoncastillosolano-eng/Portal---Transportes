import { solicitarApi } from './httpCliente.js'

/**
 * Busca un DNI en el backend (GET /api/pasajeros/dni/{dni}, requiere sesión iniciada).
 * El backend consulta primero la base de datos y, si no existe, ApiPeru; el token de ApiPeru
 * vive solo en el servidor. Consultar nunca crea ni modifica pasajeros.
 *
 * @returns {Promise<{ dni: string, existente: boolean, origen: 'BD'|'APIPERU'|'MANUAL', nombres: string|null, apellidos: string|null, fechaNacimiento: string|null, nroTelefono: string|null }>}
 */
export function consultarDni(dni) {
  return solicitarApi(`/api/pasajeros/dni/${encodeURIComponent(dni)}`)
}
