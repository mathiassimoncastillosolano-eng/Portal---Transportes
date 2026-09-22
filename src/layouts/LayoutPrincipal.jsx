import { useEffect, useState } from 'react'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { BarraNavegacion } from '../componentes/navegacion/BarraNavegacion'
import { PieDePagina } from '../componentes/navegacion/PieDePagina'
import { ModalInicioSesion } from '../componentes/autenticacion/ModalInicioSesion'
import { FormularioRegistro } from '../componentes/autenticacion/FormularioRegistro'

export function LayoutPrincipal() {
  const [modalActivo, setModalActivo] = useState(null) // 'iniciar-sesion' | 'crear-cuenta' | null
  const { pathname } = useLocation()

  const abrirInicioSesion = () => setModalActivo('iniciar-sesion')
  const abrirCrearCuenta = () => setModalActivo('crear-cuenta')
  const cerrarModales = () => setModalActivo(null)

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
        <Outlet context={{ abrirInicioSesion, abrirCrearCuenta }} />
      </main>

      <PieDePagina />

      <ModalInicioSesion
        abierto={modalActivo === 'iniciar-sesion'}
        alCerrar={cerrarModales}
        alIrACrearCuenta={abrirCrearCuenta}
      />
      <FormularioRegistro
        abierto={modalActivo === 'crear-cuenta'}
        alCerrar={cerrarModales}
        alIrAIniciarSesion={abrirInicioSesion}
      />
    </div>
  )
}

export function useModalesAutenticacion() {
  return useOutletContext()
}
