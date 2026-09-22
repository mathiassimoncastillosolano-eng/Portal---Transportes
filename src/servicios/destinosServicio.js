import { solicitarApi } from './httpCliente.js'

export function obtenerDestinos() {
  return solicitarApi('/api/destinos', { autenticar: false })
}
