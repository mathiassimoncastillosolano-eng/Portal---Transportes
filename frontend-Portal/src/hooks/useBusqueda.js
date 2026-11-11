import { useContext } from 'react'
import { ContextoBusqueda } from '../contexto/ContextoBusqueda'

export function useBusqueda() {
  const contexto = useContext(ContextoBusqueda)
  if (!contexto) {
    throw new Error('useBusqueda debe utilizarse dentro de ProveedorBusqueda')
  }
  return contexto
}
