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
