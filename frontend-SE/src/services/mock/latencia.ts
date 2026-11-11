/** Latencia simulada (200–500 ms) para que existan estados de carga reales. Solo afecta el tiempo, nunca los datos. */
export function simularLatencia(min = 200, max = 500): Promise<void> {
  const ms = min + Math.random() * (max - min)
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
