import { useContext } from 'react'
import { ContextoInicializacion } from '../contexto/ContextoInicializacion'

/** Estado global del arranque: `{ estado, listo, reintentar }`. */
export function useInicializacion() {
  const contexto = useContext(ContextoInicializacion)
  if (!contexto) {
    throw new Error('useInicializacion debe usarse dentro de <ProveedorInicializacion>')
  }
  return contexto
}
