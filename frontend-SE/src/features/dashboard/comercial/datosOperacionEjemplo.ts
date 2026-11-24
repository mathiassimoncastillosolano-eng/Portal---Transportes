import type { Canal, Totales } from './modelo'

const nombresRutas = [
  'Trujillo → Lima', 'Lima → Trujillo', 'Chiclayo → Lima', 'Piura → Trujillo',
  'Lima → Pacasmayo', 'Trujillo → Cajamarca', 'Chiclayo → Máncora',
  'Pacasmayo → Chiclayo', 'Piura → Máncora', 'Máncora → Talara',
]

export interface RutaOcupacion {
  nombre: string
  vendidos: number
  capacidad: number
}

export interface FilaRanking {
  nombre: string
  pasajes: number
  ingresos: number
}

export interface SalidaEnRiesgo {
  ruta: string
  salida: string
  vendidos: number
  capacidad: number
}

export interface DatosOperacion {
  servicios: FilaRanking[]
  ocupacionPorRuta: RutaOcupacion[]
  salidasEnRiesgo: SalidaEnRiesgo[]
  rutasPorIngreso: FilaRanking[]
  agenciasVendedoras: FilaRanking[]
  incidencias: { devoluciones: number; cambiosFecha: number; pagosFallidos: number }
}

/** Reparte unidades enteras y conserva exactamente el total. */
export function repartir(total: number, pesos: number[]): number[] {
  const cuotas = pesos.map((peso) => total * peso)
  const valores = cuotas.map(Math.floor)
  const faltantes = total - valores.reduce((suma, valor) => suma + valor, 0)
  const orden = cuotas.map((cuota, indice) => ({ indice, resto: cuota - valores[indice] }))
    .sort((a, b) => b.resto - a.resto)

  for (let i = 0; i < faltantes; i++) valores[orden[i].indice]++
  return valores
}

export function ranking(nombres: string[], pesos: number[], totales: Totales): FilaRanking[] {
  const pasajes = repartir(totales.pasajes, pesos)
  const ingresos = repartir(totales.ingresos, pesos)
  return nombres.map((nombre, indice) => ({ nombre, pasajes: pasajes[indice], ingresos: ingresos[indice] }))
}

export function rutasPorCanalEjemplo(canal: Canal, totales: Totales): FilaRanking[] {
  const pesos = canal === 'web'
    ? [0.305, 0.255, 0.165, 0.105, 0.055, 0.04, 0.03, 0.02, 0.015, 0.01]
    : [0.255, 0.24, 0.18, 0.13, 0.065, 0.05, 0.035, 0.02, 0.015, 0.01]
  return ranking(nombresRutas, pesos, totales)
}

/** Datos inventados para diseñar la pantalla. Se sustituyen por la respuesta de la API. */
export function datosOperacionEjemplo(periodo: 7 | 30 | 90, total: Totales, agencia: Totales, servicios: FilaRanking[]): DatosOperacion {
  const escala = periodo / 30
  const rutasOcupacion = nombresRutas.slice(0, 4)
  const web: Totales = {
    ingresos: total.ingresos - agencia.ingresos,
    pasajes: total.pasajes - agencia.pasajes,
    compras: total.compras - agencia.compras,
  }
  const rutasWeb = rutasPorCanalEjemplo('web', web)
  const rutasAgencia = rutasPorCanalEjemplo('agencia', agencia)
  const capacidades = [520, 480, 360, 320].map((valor) => Math.round(valor * escala))
  const porcentajes = [0.82, 0.74, 0.67, 0.58]

  return {
    servicios,
    ocupacionPorRuta: rutasOcupacion.map((nombre, indice) => ({
      nombre,
      capacidad: capacidades[indice],
      vendidos: Math.round(capacidades[indice] * porcentajes[indice]),
    })),
    salidasEnRiesgo: [
      { ruta: 'Trujillo → Piura', salida: '23 nov. · 08:30', vendidos: 9, capacidad: 42 },
      { ruta: 'Chiclayo → Lima', salida: '24 nov. · 21:00', vendidos: 13, capacidad: 46 },
      { ruta: 'Piura → Trujillo', salida: '25 nov. · 07:15', vendidos: 15, capacidad: 44 },
    ],
    rutasPorIngreso: nombresRutas.map((nombre, indice) => ({
      nombre,
      ingresos: rutasWeb[indice].ingresos + rutasAgencia[indice].ingresos,
      pasajes: rutasWeb[indice].pasajes + rutasAgencia[indice].pasajes,
    })),
    agenciasVendedoras: ranking(
      ['Agencia Trujillo', 'Agencia Lima', 'Agencia Chiclayo', 'Agencia Piura'],
      [0.4, 0.3, 0.18, 0.12],
      agencia,
    ),
    incidencias: {
      devoluciones: Math.round(4 * escala),
      cambiosFecha: Math.round(9 * escala),
      pagosFallidos: Math.round(12 * escala),
    },
  }
}
