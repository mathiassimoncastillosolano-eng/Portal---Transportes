/**
 * Generador pseudoaleatorio con semilla (mulberry32). Mismos datos en cada
 * recarga: nunca se usa Math.random() para producir datos de negocio.
 */
export type Prng = () => number

export function crearPrng(semilla: number): Prng {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Entero en [min, max] inclusive. */
export function entero(rng: Prng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function elegir<T>(rng: Prng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]
}

/** Elige según pesos relativos. */
export function elegirPonderado<T>(rng: Prng, items: readonly { valor: T; peso: number }[]): T {
  const total = items.reduce((s, i) => s + i.peso, 0)
  let punto = rng() * total
  for (const item of items) {
    punto -= item.peso
    if (punto <= 0) return item.valor
  }
  return items[items.length - 1].valor
}

/** Toma `n` elementos distintos de 1..max (Fisher–Yates parcial). */
export function muestraDeAsientos(rng: Prng, max: number, n: number): number[] {
  const pool = Array.from({ length: max }, (_, i) => i + 1)
  const cantidad = Math.min(n, max)
  for (let i = 0; i < cantidad; i++) {
    const j = i + Math.floor(rng() * (max - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, cantidad)
}

export function pad(n: number, largo: number): string {
  return String(n).padStart(largo, '0')
}
