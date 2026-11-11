import { createContext, useCallback, useRef, useState } from 'react'
import { buscarViajes } from '../servicios/viajesServicio'

export const ContextoBusqueda = createContext(null)

export function ProveedorBusqueda({ children }) {
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState(null)
  const [criterios, setCriterios] = useState(null)
  const ultimaSolicitud = useRef(0)

  const ejecutarBusqueda = useCallback(async (parametros) => {
    const solicitud = ++ultimaSolicitud.current
    setBuscando(true)
    setError(null)
    setResultados([])
    setCriterios({ ...parametros, horario: parametros.horario ?? 'cualquiera' })
    try {
      const viajes = await buscarViajes(parametros)
      // Una respuesta anterior no debe reemplazar la búsqueda actual.
      if (solicitud === ultimaSolicitud.current) setResultados(viajes)
    } catch (err) {
      if (solicitud === ultimaSolicitud.current) setError(err.message ?? 'Ocurrió un problema al buscar pasajes.')
    } finally {
      if (solicitud === ultimaSolicitud.current) setBuscando(false)
    }
  }, [])

  return (
    <ContextoBusqueda.Provider value={{ resultados, buscando, error, criterios, ejecutarBusqueda }}>
      {children}
    </ContextoBusqueda.Provider>
  )
}
