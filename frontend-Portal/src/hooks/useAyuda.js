import { useContext } from 'react'
import { ContextoAyuda } from '../contexto/ContextoAyuda'

export function useAyuda() {
  const contexto = useContext(ContextoAyuda)
  if (!contexto) {
    throw new Error('useAyuda debe utilizarse dentro de ProveedorAyuda')
  }
  return contexto
}
