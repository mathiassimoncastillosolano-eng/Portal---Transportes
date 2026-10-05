import { useContext } from 'react'
import ContextoTema from '../contexto/ContextoTema'

export function useTema() {
  const contexto = useContext(ContextoTema)
  if (!contexto) {
    throw new Error('useTema debe utilizarse dentro de ProveedorTema')
  }
  return contexto
}
