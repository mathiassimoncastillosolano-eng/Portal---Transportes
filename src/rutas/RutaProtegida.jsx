import { Navigate } from 'react-router-dom'
import { PanelAsincrono } from '../componentes/carga'
import { useAutenticacion } from '../hooks/useAutenticacion'

export function RutaProtegida({ children }) {
  const { estaAutenticado, cargandoSesion } = useAutenticacion()

  // Antes devolvía null (página en blanco con el footer pegado al menú). Ahora
  // reserva el espacio y, solo si la verificación tarda, muestra el cargador.
  // Es una comprobación interna, no una operación del usuario: si termina en
  // menos de 350 ms no se muestra nada ni se añade espera.
  return (
    <PanelAsincrono
        contenedorCarga="seccion contenedor"
        pagina
        entrada={false}
        retardoMs={350}
        cargando={cargandoSesion}
        mensaje="Verificando tu sesión"
        mensajeListo="Sesión verificada"
      >
        {() => (estaAutenticado ? children : <Navigate to="/iniciar-sesion" replace />)}
    </PanelAsincrono>
  )
}
