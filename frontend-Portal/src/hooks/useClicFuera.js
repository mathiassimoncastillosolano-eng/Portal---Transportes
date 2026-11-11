import { useEffect } from 'react'

export function useClicFuera(referencia, alClicFuera) {
  useEffect(() => {
    function manejarClic(evento) {
      if (referencia.current && !referencia.current.contains(evento.target)) {
        alClicFuera()
      }
    }
    document.addEventListener('mousedown', manejarClic)
    return () => document.removeEventListener('mousedown', manejarClic)
  }, [referencia, alClicFuera])
}
