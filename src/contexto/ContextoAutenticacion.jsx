import { createContext, useCallback, useEffect, useState } from 'react'
import {
  actualizarPerfil as actualizarPerfilServicio,
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
    let cancelado = false

    obtenerUsuarioDeSesion().then((usuarioDeSesion) => {
      if (!cancelado) {
        setUsuario(usuarioDeSesion)
        setCargandoSesion(false)
      }
    })

    return () => {
      cancelado = true
    }
  }, [])

  const iniciarSesion = useCallback(async (correo, contrasena) => {
    const usuarioAutenticado = await iniciarSesionServicio(correo, contrasena)
    setUsuario(usuarioAutenticado)
    return usuarioAutenticado
  }, [])

  const registrarUsuario = useCallback(async (datos) => {
    return registrarUsuarioServicio(datos)
  }, [])

  const cerrarSesion = useCallback(async () => {
    await cerrarSesionServicio()
    setUsuario(null)
  }, [])

  const actualizarPerfil = useCallback(async (datos) => {
    const usuarioActualizado = await actualizarPerfilServicio(datos)
    setUsuario(usuarioActualizado)
    return usuarioActualizado
  }, [])

  const valor = {
    usuario,
    estaAutenticado: Boolean(usuario),
    cargandoSesion,
    iniciarSesion,
    registrarUsuario,
    cerrarSesion,
    actualizarPerfil,
  }

  return (
    <ContextoAutenticacion.Provider value={valor}>
      {children}
    </ContextoAutenticacion.Provider>
  )
}
