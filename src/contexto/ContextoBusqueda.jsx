import { createContext, useCallback, useState } from 'react'
import { buscarViajes } from '../servicios/viajesServicio'

// Vive por encima de las rutas (ver main.jsx) para que la búsqueda
// realizada en Inicio sobreviva la navegación hacia /resultados y hacia
// /reservar → "Volver", sin tener que repetirla ni perder los resultados
// ya obtenidos (la búsqueda simulada usa datos aleatorios, así que
// repetirla mostraría un viaje distinto al que el usuario ya eligió).
export const ContextoBusqueda = createContext(null)

export function ProveedorBusqueda({ children }) {
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState(null)
  const [criterios, setCriterios] = useState(null)

  const ejecutarBusqueda = useCallback(async (parametros) => {
    setBuscando(true)
    setError(null)
    setCriterios(parametros)
    try {
      const viajes = await buscarViajes(parametros)
      setResultados(viajes)
    } catch (err) {
      setError(err.message ?? 'Ocurrió un problema al buscar pasajes.')
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [])

  const valor = { resultados, buscando, error, criterios, ejecutarBusqueda }

  return <ContextoBusqueda.Provider value={valor}>{children}</ContextoBusqueda.Provider>
}
