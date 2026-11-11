import { NavLink } from 'react-router-dom'
import './paginaNoEncontrada.css'

export function PaginaNoEncontrada() {
  return (
    <section className="contenedor pagina-no-encontrada">
      <p className="pagina-no-encontrada__codigo">404</p>
      <h1 className="pagina-no-encontrada__titulo">Página no encontrada</h1>
      <p className="pagina-no-encontrada__texto">
        La página que buscas no existe o fue movida. Vuelve al inicio para
        continuar explorando rutas y destinos.
      </p>
      <NavLink to="/" className="pagina-no-encontrada__enlace boton-principal">
        Volver al inicio
      </NavLink>
    </section>
  )
}
