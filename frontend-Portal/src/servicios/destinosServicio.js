import { solicitarApi } from './httpCliente.js'

const ciudadesSinRutas = new Set(['Arequipa', 'Cusco'])

export async function obtenerDestinos() {
  const destinos = await solicitarApi('/api/destinos', { autenticar: false })
  return destinos.filter((destino) => !ciudadesSinRutas.has(destino.ciudad))
}

export function obtenerRutasCiudad() {
  return solicitarApi('/api/rutas-ciudad', { autenticar: false })
}
