import { Route, Routes } from 'react-router-dom'
import { LayoutPrincipal } from '../layouts/LayoutPrincipal'
import { LayoutPerfil } from '../layouts/LayoutPerfil'
import { RutaProtegida } from './RutaProtegida'

import { PaginaInicio } from '../paginas/inicio/PaginaInicio'
import { PaginaResultados } from '../paginas/resultados/PaginaResultados'
import { PaginaReserva } from '../paginas/reserva/PaginaReserva'
import { PaginaDestinos } from '../paginas/destinos/PaginaDestinos'
import { PaginaDetalleDestino } from '../paginas/destinos/PaginaDetalleDestino'
import { PaginaServicios } from '../paginas/servicios/PaginaServicios'
import { PaginaAyuda } from '../paginas/ayuda/PaginaAyuda'
import { PaginaLibroReclamaciones } from '../paginas/libroReclamaciones/PaginaLibroReclamaciones'
import { PaginaIniciarSesion } from '../paginas/autenticacion/PaginaIniciarSesion'
import { PaginaPerfil } from '../paginas/perfil/PaginaPerfil'
import { PaginaMisPasajes } from '../paginas/perfil/PaginaMisPasajes'
import { PaginaHistorial } from '../paginas/perfil/PaginaHistorial'
import { PaginaDetalleCompra } from '../paginas/perfil/PaginaDetalleCompra'
import { PaginaDetalleCompraMock } from '../paginas/perfil/PaginaDetalleCompraMock'
import { PaginaPostergarPasaje } from '../paginas/perfil/PaginaPostergarPasaje'
import { PaginaNoEncontrada } from '../paginas/PaginaNoEncontrada'

export function RutasApp() {
  return (
    <Routes>
      <Route element={<LayoutPrincipal />}>
        <Route path="/" element={<PaginaInicio />} />
        <Route path="/resultados" element={<PaginaResultados />} />
        <Route
          path="/reservar"
          element={
            <RutaProtegida>
              <PaginaReserva />
            </RutaProtegida>
          }
        />
        <Route
          path="/postergar/:idPasaje"
          element={
            <RutaProtegida>
              <PaginaPostergarPasaje />
            </RutaProtegida>
          }
        />
        <Route path="/destinos" element={<PaginaDestinos />} />
        <Route path="/destinos/:id" element={<PaginaDetalleDestino />} />
        <Route path="/servicios" element={<PaginaServicios />} />
        <Route path="/ayuda" element={<PaginaAyuda />} />
        <Route path="/libro-reclamaciones" element={<PaginaLibroReclamaciones />} />
        <Route path="/iniciar-sesion" element={<PaginaIniciarSesion />} />

        <Route
          path="/perfil"
          element={
            <RutaProtegida>
              <LayoutPerfil />
            </RutaProtegida>
          }
        >
          <Route index element={<PaginaPerfil />} />
          <Route path="pasajes" element={<PaginaMisPasajes />} />
          {import.meta.env.DEV && <Route path="pasajes/demo" element={<PaginaDetalleCompraMock />} />}
          <Route path="pasajes/:idVenta" element={<PaginaDetalleCompra />} />
          <Route path="historial" element={<PaginaHistorial />} />
        </Route>

        <Route path="*" element={<PaginaNoEncontrada />} />
      </Route>
    </Routes>
  )
}
