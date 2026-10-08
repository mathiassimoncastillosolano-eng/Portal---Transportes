import { solicitarApi } from './httpCliente.js'

const imagenesLocales = {
  'Chepén': '/destinos/Chepen.jpg',
  'Huaraz': '/destinos/Huaraz.webp',
  'Jaén': '/destinos/Jaen1.webp',
  'Máncora': '/destinos/Mancora.jpg',
  'Pacasmayo': '/destinos/Pacasmayo.jpg',
  'Paita': '/destinos/Paita.jpg',
  'Sullana': '/destinos/Sullana.jpg',
  'Talara': '/destinos/Talara.jpg',
  'Tumbes': '/destinos/Tumbes.jpg',
}

const ciudadesSinRutas = new Set(['Arequipa', 'Cusco'])

export async function obtenerDestinos() {
  const destinos = await solicitarApi('/api/destinos', { autenticar: false })
  return destinos.filter((destino) => !ciudadesSinRutas.has(destino.ciudad)).map((destino) => ({
    ...destino,
    imagen: destino.imagen || imagenesLocales[destino.ciudad] || null,
  }))
}

export function obtenerRutasCiudad() {
  return solicitarApi('/api/rutas-ciudad', { autenticar: false })
}
