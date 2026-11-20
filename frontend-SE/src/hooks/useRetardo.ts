import { useEffect, useState } from 'react'

export function useRetardo<T>(valor: T, ms: number): T {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const temporizador = window.setTimeout(() => setRetardado(valor), ms)
    return () => window.clearTimeout(temporizador)
  }, [valor, ms])
  return retardado
}
