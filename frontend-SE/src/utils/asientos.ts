import type { DistribucionAsientos } from '@/types/servicio'

export interface FilaAsientos {
  fila: number
  /** Números de asiento a la izquierda del pasillo, de ventana hacia pasillo. */
  izquierda: number[]
  /** Números de asiento a la derecha del pasillo, de pasillo hacia ventana. */
  derecha: number[]
}

export interface PisoAsientos {
  piso: number
  filas: FilaAsientos[]
}

/** Total de asientos de una distribución. */
export function capacidadDe(distribucion: DistribucionAsientos): number {
  return distribucion.pisos.reduce(
    (total, p) => total + p.filas * (p.patron[0] + p.patron[1]),
    0,
  )
}

/**
 * Numera los asientos de forma correlativa (fila por fila, piso 1 primero)
 * y devuelve la estructura lista para dibujar el mapa del bus.
 */
export function construirAsientos(distribucion: DistribucionAsientos): PisoAsientos[] {
  let numero = 1
  return distribucion.pisos.map((p) => {
    const filas: FilaAsientos[] = []
    for (let f = 1; f <= p.filas; f++) {
      const izquierda = Array.from({ length: p.patron[0] }, () => numero++)
      const derecha = Array.from({ length: p.patron[1] }, () => numero++)
      filas.push({ fila: f, izquierda, derecha })
    }
    return { piso: p.piso, filas }
  })
}

const LETRAS_COLUMNA = 'ABCDEFGH'

/**
 * Código de asiento "amigable" (fila + letra de columna, ej. "3D"), en el
 * mismo orden de numeración que `construirAsientos` (izquierda→derecha,
 * piso 1 primero, fila global continua entre pisos). El identificador
 * interno sigue siendo el número entero (`numero`): el código es solo para
 * mostrar en pantalla — nunca se usa como clave de negocio.
 */
export function mapaCodigosAsiento(distribucion: DistribucionAsientos): Map<number, string> {
  const mapa = new Map<number, string>()
  let numero = 1
  let filaGlobal = 0
  for (const p of distribucion.pisos) {
    for (let f = 1; f <= p.filas; f++) {
      filaGlobal++
      const columnas = p.patron[0] + p.patron[1]
      for (let c = 0; c < columnas; c++) {
        mapa.set(numero, `${filaGlobal}${LETRAS_COLUMNA[c] ?? c}`)
        numero++
      }
    }
  }
  return mapa
}

/** Código de un asiento dado su número; cae al propio número si no se encuentra (no debería ocurrir). */
export function codigoDeAsiento(numero: number, distribucion: DistribucionAsientos): string {
  return mapaCodigosAsiento(distribucion).get(numero) ?? String(numero)
}

