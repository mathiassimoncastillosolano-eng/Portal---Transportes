import { useEffect, useState } from 'react'
import { obtenerServicios } from '../../servicios/serviciosServicio'
import { TarjetaServicio } from '../../componentes/servicios/TarjetaServicio'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaServicios.css'

export function PaginaServicios() {
  const [servicios, setServicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false

    async function cargarServicios() {
      setCargando(true)
      setError(null)
      try {
        const datos = await obtenerServicios()
        if (!cancelado) setServicios(datos)
      } catch {
        if (!cancelado) setError('No se pudieron cargar los servicios. Intenta nuevamente más tarde.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarServicios()
    return () => {
      cancelado = true
    }
  }, [intentos])

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

      <PanelAsincrono
        variante="servicios"
        cargando={cargando}
        error={error}
        vacio={servicios.length === 0}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoVacio={{ titulo: 'Aún no hay servicios', texto: 'Todavía no hay servicios disponibles.' }}
      >
        <div className="pagina-servicios__cuadricula">
          {servicios.map((servicio) => (
            <TarjetaServicio key={servicio.id} servicio={servicio} />
          ))}
        </div>
      </PanelAsincrono>
    </section>
  )
}
