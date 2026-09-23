import { solicitarApi } from './httpCliente.js'

export async function obtenerServicios() {
  const tiposBus = await solicitarApi('/api/servicios', { autenticar: false })
  return tiposBus.map((tipoBus) => ({
    id: tipoBus.idTipoBus,
    nombre: tipoBus.nombreTipo,
    descripcion: tipoBus.descripcion,
    caracteristica: tipoBus.descripcionReclinacion,
    imagen: tipoBus.urlImagen,
  }))
}
