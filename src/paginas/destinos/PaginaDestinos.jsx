import { destinos } from '../../datos/destinos'
import { TarjetaDestino } from '../../componentes/destinos/TarjetaDestino'
import './paginaDestinos.css'

export function PaginaDestinos() {
  return (
    <section className="seccion contenedor pagina-destinos">
      <div className="encabezado-seccion">
        <span className="encabezado-seccion__etiqueta">Destinos</span>
        <h1 className="encabezado-seccion__titulo">Descubre nuestros destinos</h1>
        <p className="encabezado-seccion__texto">
          Salidas diarias hacia los rincones más visitados del país, con
          tarifas desde S/ {Math.min(...destinos.map((destino) => destino.desde))}.
        </p>
      </div>

      <div className="pagina-destinos__cuadricula">
        {destinos.map((destino) => (
          <TarjetaDestino key={destino.id} destino={destino} grande />
        ))}
      </div>
    </section>
  )
}
