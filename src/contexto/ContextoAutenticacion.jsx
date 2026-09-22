import { createContext, useCallback, useEffect, useState } from 'react'
import {
  cerrarSesion as cerrarSesionServicio,
  iniciarSesion as iniciarSesionServicio,
  obtenerUsuarioDeSesion,
  registrarUsuario as registrarUsuarioServicio,
} from '../servicios/autenticacionServicio'

export const ContextoAutenticacion = createContext(null)

export function ProveedorAutenticacion({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)

  useEffect(() => {
    setUsuario(obtenerUsuarioDeSesion())
    setCargandoSesion(false)
  }, [])

  const iniciarSesion = useCallback(async (correo, contrasena) => {
    const usuarioAutenticado = await iniciarSesionServicio(correo, contrasena)
    setUsuario(usuarioAutenticado)
    return usuarioAutenticado
  }, [])

  const registrarUsuario = useCallback(async (datos) => {
    const nuevoUsuario = await registrarUsuarioServicio(datos)
    setUsuario(nuevoUsuario)
    return nuevoUsuario
  }, [])

  const cerrarSesion = useCallback(() => {
    cerrarSesionServicio()
    setUsuario(null)
  }, [])

  const valor = {
    usuario,
    estaAutenticado: Boolean(usuario),
    cargandoSesion,
    iniciarSesion,
    registrarUsuario,
    cerrarSesion,
  }

  return (
    <ContextoAutenticacion.Provider value={valor}>
      {children}
    </ContextoAutenticacion.Provider>
  )
}
