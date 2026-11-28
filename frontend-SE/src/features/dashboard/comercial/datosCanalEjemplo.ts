import type { Canal, Totales } from './modelo'
import { repartir } from './datosOperacionEjemplo'

/** Datos inventados para diseñar los detalles por canal. Se sustituyen por la respuesta de la API. */

export interface Segmento {
  nombre: string
  pasajes: number
  ingresos: number
}

export interface Vendedor {
  idEmpleado: number
  nombre: string
  sede: string
  pasajes: number
  ingresos: number
}

export interface IncidenciasCanal {
  postergaciones: number
  reembolsos: number
  pagosFallidos: number
}

export interface CambiosConDiferencia {
  cambios: number
  conCobro: number
  montoCobrado: number
}

export const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const franjasHorarias = ['00–06 h', '06–12 h', '12–18 h', '18–24 h']

const anticipaciones = ['Mismo día', '1–2 días', '3–7 días', '8 días o más']
const pesosAnticipacion: Record<Canal, number[]> = {
  web: [0.12, 0.28, 0.34, 0.26],
  agencia: [0.58, 0.24, 0.12, 0.06],
}

const metodos: Record<Canal, { nombres: string[]; pesos: number[] }> = {
  web: { nombres: ['Tarjeta', 'Yape'], pesos: [0.64, 0.36] },
  agencia: { nombres: ['Efectivo', 'Tarjeta', 'Yape'], pesos: [0.46, 0.31, 0.23] },
}

function segmentar(nombres: string[], pesos: number[], totales: Totales): Segmento[] {
  const pasajes = repartir(totales.pasajes, pesos)
  const ingresos = repartir(totales.ingresos, pesos)
  return nombres.map((nombre, indice) => ({ nombre, pasajes: pasajes[indice], ingresos: ingresos[indice] }))
}

export function anticipacionEjemplo(canal: Canal, totales: Totales): Segmento[] {
  return segmentar(anticipaciones, pesosAnticipacion[canal], totales)
}

export function metodosPagoEjemplo(canal: Canal, totales: Totales): Segmento[] {
  return segmentar(metodos[canal].nombres, metodos[canal].pesos, totales)
}

/** Pasajes web por día de la semana (filas) y franja horaria (columnas). */
export function comprasPorHorarioEjemplo(totales: Totales): number[][] {
  const pesoDia = [0.12, 0.11, 0.12, 0.14, 0.19, 0.18, 0.14]
  const pesoFranja = [0.06, 0.24, 0.3, 0.4]
  const pesos = pesoDia.flatMap((dia) => pesoFranja.map((franja) => dia * franja))
  const valores = repartir(totales.pasajes, pesos)
  return pesoDia.map((_, fila) => valores.slice(fila * pesoFranja.length, (fila + 1) * pesoFranja.length))
}

export function incidenciasCanalEjemplo(canal: Canal, totales: Totales): IncidenciasCanal {
  const web = canal === 'web'
  return {
    postergaciones: Math.round(totales.pasajes * (web ? 0.031 : 0.044)),
    reembolsos: Math.round(totales.pasajes * (web ? 0.012 : 0.008)),
    pagosFallidos: web ? Math.round(totales.compras * 0.052) : 0,
  }
}

const vendedores = [
  { idEmpleado: 104, nombre: 'Lucía Ramos', sede: 'Trujillo' },
  { idEmpleado: 117, nombre: 'Jorge Paredes', sede: 'Lima' },
  { idEmpleado: 109, nombre: 'Rosa Medina', sede: 'Chiclayo' },
  { idEmpleado: 121, nombre: 'Carlos Vílchez', sede: 'Trujillo' },
  { idEmpleado: 126, nombre: 'Ana Quispe', sede: 'Piura' },
  { idEmpleado: 131, nombre: 'Miguel Torres', sede: 'Lima' },
]

/** Reparte las ventas de agencia entre sus vendedores; con una sede elegida, solo entre los de esa sede. */
export function vendedoresEjemplo(totales: Totales, sede?: string): Vendedor[] {
  const pesosBase = [0.24, 0.21, 0.17, 0.15, 0.13, 0.1]
  const elegidos = vendedores.map((vendedor, indice) => ({ vendedor, peso: pesosBase[indice] }))
    .filter(({ vendedor }) => !sede || vendedor.sede === sede)
  const lista = elegidos.length > 0 ? elegidos : [{ vendedor: { idEmpleado: 140, nombre: 'Equipo de agencia', sede: sede ?? '' }, peso: 1 }]
  const suma = lista.reduce((total, { peso }) => total + peso, 0)
  const pesos = lista.map(({ peso }) => peso / suma)
  const pasajes = repartir(totales.pasajes, pesos)
  const ingresos = repartir(totales.ingresos, pesos)
  return lista.map(({ vendedor }, indice) => ({ ...vendedor, pasajes: pasajes[indice], ingresos: ingresos[indice] }))
}

export function cambiosConDiferenciaEjemplo(totales: Totales): CambiosConDiferencia {
  const cambios = Math.round(totales.pasajes * 0.044)
  const conCobro = Math.round(cambios * 0.45)
  return { cambios, conCobro, montoCobrado: conCobro * 18 }
}

export interface AgenciaEjemplo {
  ciudad: string
  id: number
  nombre: string
  direccion: string
}

/** Agencias activas registradas en la base (copiadas el 28-nov-2026). Se reemplazan por la API. */
export const agenciasEjemplo: AgenciaEjemplo[] = [
  { ciudad: 'Arequipa', id: 2, nombre: 'Ruta Libre - Arequipa', direccion: 'Dirección de prueba' },
  { ciudad: 'Arequipa', id: 14, nombre: 'RutaLibre Arequipa', direccion: 'Av. Andres Avelino Caceres 600' },
  { ciudad: 'Cajamarca', id: 12, nombre: 'RutaLibre Cajamarca', direccion: 'Av. Atahualpa 850' },
  { ciudad: 'Cajamarca', id: 24, nombre: 'RutaLibre Cajamarca – Amalia Puga', direccion: 'Jr. Amalia Puga 455' },
  { ciudad: 'Chepén', id: 18, nombre: 'Ruta Libre - Chepén', direccion: 'Terminal Terrestre de Chepén' },
  { ciudad: 'Chepén', id: 25, nombre: 'RutaLibre Chepén – Jr. Lima', direccion: 'Jr. Lima 310' },
  { ciudad: 'Chiclayo', id: 7, nombre: 'Ruta Libre - Chiclayo', direccion: 'Av. Bolognesi 800' },
  { ciudad: 'Chiclayo', id: 10, nombre: 'RutaLibre Chiclayo', direccion: 'Av. Bolognesi 720' },
  { ciudad: 'Chimbote', id: 13, nombre: 'RutaLibre Chimbote', direccion: 'Av. Jose Pardo 1500' },
  { ciudad: 'Chimbote', id: 26, nombre: 'RutaLibre Chimbote – Meiggs', direccion: 'Av. Enrique Meiggs 1250' },
  { ciudad: 'Cusco', id: 5, nombre: 'Ruta Libre - Cusco', direccion: 'Av. El Sol 600' },
  { ciudad: 'Cusco', id: 27, nombre: 'RutaLibre Cusco – Av. de la Cultura', direccion: 'Av. de la Cultura 1020' },
  { ciudad: 'Huaraz', id: 15, nombre: 'Ruta Libre - Huaraz', direccion: 'Terminal Terrestre de Huaraz' },
  { ciudad: 'Huaraz', id: 28, nombre: 'RutaLibre Huaraz – Luzuriaga', direccion: 'Av. Luzuriaga 650' },
  { ciudad: 'Jaén', id: 19, nombre: 'Ruta Libre - Jaén', direccion: 'Terminal Terrestre de Jaén' },
  { ciudad: 'Jaén', id: 29, nombre: 'RutaLibre Jaén – Mesones Muro', direccion: 'Av. Mesones Muro 420' },
  { ciudad: 'Lima', id: 1, nombre: 'Ruta Libre - Lima', direccion: 'Dirección de prueba' },
  { ciudad: 'Lima', id: 9, nombre: 'RutaLibre Lima', direccion: 'Av. Javier Prado Este 1050' },
  { ciudad: 'Máncora', id: 22, nombre: 'Ruta Libre - Máncora', direccion: 'Terminal Terrestre de Máncora' },
  { ciudad: 'Máncora', id: 30, nombre: 'RutaLibre Máncora – Av. Piura', direccion: 'Av. Piura 230' },
  { ciudad: 'Pacasmayo', id: 16, nombre: 'Ruta Libre - Pacasmayo', direccion: 'Terminal Terrestre de Pacasmayo' },
  { ciudad: 'Pacasmayo', id: 31, nombre: 'RutaLibre Pacasmayo – Leoncio Prado', direccion: 'Calle Leoncio Prado 120' },
  { ciudad: 'Paita', id: 17, nombre: 'Ruta Libre - Paita', direccion: 'Terminal Terrestre de Paita' },
  { ciudad: 'Paita', id: 32, nombre: 'RutaLibre Paita – Av. Grau', direccion: 'Av. Grau 310, El Tablazo' },
  { ciudad: 'Piura', id: 11, nombre: 'RutaLibre Piura', direccion: 'Av. Sanchez Cerro 1200' },
  { ciudad: 'Piura', id: 33, nombre: 'RutaLibre Piura – Av. Grau', direccion: 'Av. Grau 1150' },
  { ciudad: 'Sullana', id: 20, nombre: 'Ruta Libre - Sullana', direccion: 'Terminal Terrestre de Sullana' },
  { ciudad: 'Sullana', id: 34, nombre: 'RutaLibre Sullana – José de Lama', direccion: 'Av. José de Lama 850' },
  { ciudad: 'Talara', id: 21, nombre: 'Ruta Libre - Talara', direccion: 'Terminal Terrestre de Talara' },
  { ciudad: 'Talara', id: 35, nombre: 'RutaLibre Talara – Aviación', direccion: 'Av. Aviación 375' },
  { ciudad: 'Trujillo', id: 6, nombre: 'Ruta Libre - Trujillo', direccion: 'Av. América Sur 700' },
  { ciudad: 'Trujillo', id: 8, nombre: 'RutaLibre Trujillo', direccion: 'Av. America Sur 1250' },
  { ciudad: 'Tumbes', id: 23, nombre: 'Ruta Libre - Tumbes', direccion: 'Terminal Terrestre de Tumbes' },
  { ciudad: 'Tumbes', id: 36, nombre: 'RutaLibre Tumbes – Tumbes Norte', direccion: 'Av. Tumbes Norte 760' },
]

/** Parte de las ventas de la ciudad que corresponde a cada agencia (simulado: la más antigua vende más). */
export function participacionAgencia(ciudad: string, id: number): number {
  const lista = agenciasEjemplo.filter((agencia) => agencia.ciudad === ciudad)
  if (lista.length <= 1) return 1
  const pesos = lista.map((_, indice) => (indice === 0 ? 0.58 : 0.42 / (lista.length - 1)))
  const indice = lista.findIndex((agencia) => agencia.id === id)
  return indice < 0 ? 0 : pesos[indice]
}
