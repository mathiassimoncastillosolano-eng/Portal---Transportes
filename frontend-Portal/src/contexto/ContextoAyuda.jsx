import { createContext, useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CentroAyuda } from '../componentes/ayuda/CentroAyuda'
import { useAutenticacion } from '../hooks/useAutenticacion'

export const ContextoAyuda = createContext(null)

export function ProveedorAyuda({ children, alAbrirInicioSesion, alAbrirCrearCuenta }) {
  const [estado, setEstado] = useState({ abierto: false, destino: null, version: 0 })
  const lanzador = useRef(null)
  const navegar = useNavigate()
  const { estaAutenticado } = useAutenticacion()

  const abrirAyuda = useCallback((destino = null) => {
    lanzador.current = document.activeElement
    setEstado((previo) => ({ abierto: true, destino, version: previo.version + 1 }))
  }, [])

  const cerrarAyuda = useCallback((restaurarFoco = true) => {
    setEstado((previo) => ({ ...previo, abierto: false }))
    if (restaurarFoco) {
      const elemento = lanzador.current
      requestAnimationFrame(() => {
        if (elemento && document.contains(elemento)) elemento.focus()
      })
    }
  }, [])

  const ejecutarAccion = useCallback(
    (accion) => {
      cerrarAyuda(false)
      if (accion.modal === 'crear-cuenta') return alAbrirCrearCuenta()
      if (accion.modal === 'iniciar-sesion') return alAbrirInicioSesion()
      if (accion.requiereSesion && !estaAutenticado) return alAbrirInicioSesion()
      return navegar(accion.ruta)
    },
    [cerrarAyuda, alAbrirCrearCuenta, alAbrirInicioSesion, estaAutenticado, navegar],
  )

  const valor = useMemo(() => ({ abrirAyuda, cerrarAyuda }), [abrirAyuda, cerrarAyuda])

  return (
    <ContextoAyuda.Provider value={valor}>
      {children}
      <CentroAyuda
        abierto={estado.abierto}
        destino={estado.destino}
        version={estado.version}
        estaAutenticado={estaAutenticado}
        alCerrar={cerrarAyuda}
        alEjecutarAccion={ejecutarAccion}
      />
    </ContextoAyuda.Provider>
  )
}
