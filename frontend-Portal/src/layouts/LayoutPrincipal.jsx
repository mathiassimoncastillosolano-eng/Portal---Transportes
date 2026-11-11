import { useEffect, useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { BarraNavegacion } from '../componentes/navegacion/BarraNavegacion'
import { PieDePagina } from '../componentes/navegacion/PieDePagina'
import { ModalInicioSesion } from '../componentes/autenticacion/ModalInicioSesion'
import { FormularioRegistro } from '../componentes/autenticacion/FormularioRegistro'
import { ModalRecuperarContrasena } from '../componentes/autenticacion/ModalRecuperarContrasena'

export function LayoutPrincipal() {
  const [modalActivo, setModalActivo] = useState(null) // 'iniciar-sesion' | 'crear-cuenta' | 'recuperar-contrasena' | null
  const [correoRecuperacion, setCorreoRecuperacion] = useState('')
  const { pathname } = useLocation()

  const abrirInicioSesion = () => setModalActivo('iniciar-sesion')
  const abrirCrearCuenta = () => setModalActivo('crear-cuenta')
  const cerrarModales = () => setModalActivo(null)
  // Solo hay un modal activo a la vez: abrir la recuperación cierra el de inicio de sesión (sin fondos apilados).
  const abrirRecuperarContrasena = (correo) => {
    setCorreoRecuperacion(typeof correo === 'string' ? correo.trim() : '')
    setModalActivo('recuperar-contrasena')
  }
  const volverAIniciarSesionTrasRecuperar = (correo) => {
    setCorreoRecuperacion(typeof correo === 'string' ? correo : '')
    setModalActivo('iniciar-sesion')
  }

  // Al navegar a una ruta distinta (por ejemplo, desde el logo o el menú),
  // la página siempre debe iniciar desde arriba en lugar de conservar el
  // scroll de la vista anterior.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="diseno-principal">
      <BarraNavegacion alAbrirInicioSesion={abrirInicioSesion} />

      <main>
        <Outlet context={{ abrirInicioSesion, abrirCrearCuenta, abrirRecuperarContrasena }} />
      </main>

      <PieDePagina />

      <ModalInicioSesion
        abierto={modalActivo === 'iniciar-sesion'}
        alCerrar={cerrarModales}
        alIrACrearCuenta={abrirCrearCuenta}
        alOlvidoContrasena={abrirRecuperarContrasena}
        correoInicial={correoRecuperacion}
      />
      <FormularioRegistro
        abierto={modalActivo === 'crear-cuenta'}
        alCerrar={cerrarModales}
        alIrAIniciarSesion={abrirInicioSesion}
      />
      <ModalRecuperarContrasena
        abierto={modalActivo === 'recuperar-contrasena'}
        alCerrar={cerrarModales}
        alVolverAIniciarSesion={volverAIniciarSesionTrasRecuperar}
        correoInicial={correoRecuperacion}
      />
    </div>
  )
}

export function useModalesAutenticacion() {
  return useOutletContext()
}
