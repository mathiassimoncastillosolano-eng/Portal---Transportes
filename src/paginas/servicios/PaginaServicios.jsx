import { tiposServicio } from '../../datos/servicios'
import { TarjetaServicio } from '../../componentes/servicios/TarjetaServicio'
import './paginaServicios.css'

export function PaginaServicios() {
  return (
    <section className="seccion contenedor">
      <div className="encabezado-seccion">
        <span className="encabezado-seccion__etiqueta">Servicios</span>
        <h1 className="encabezado-seccion__titulo">Viaja como prefieras</h1>
        <p className="encabezado-seccion__texto">
          Desde el Económico hasta el Ultra: elige el nivel de comodidad que
          mejor se ajuste a tu viaje.
        </p>
      </div>

      <div className="pagina-servicios__cuadricula">
        {tiposServicio.map((servicio) => (
          <TarjetaServicio key={servicio.id} servicio={servicio} />
        ))}
      </div>
    </section>
  )
}
