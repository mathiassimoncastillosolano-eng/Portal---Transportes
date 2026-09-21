import { Navigate } from 'react-router-dom'
import { useAutenticacion } from '../hooks/useAutenticacion'

export function RutaProtegida({ children }) {
  const { estaAutenticado, cargandoSesion } = useAutenticacion()

  if (cargandoSesion) return null

  if (!estaAutenticado) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  return children
}
