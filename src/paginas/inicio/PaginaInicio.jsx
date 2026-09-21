import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { CarruselDestinos } from '../../componentes/destinos/CarruselDestinos'
import { CarruselServicios } from '../../componentes/servicios/CarruselServicios'
import { useBusqueda } from '../../hooks/useBusqueda'
import { obtenerDestinos } from '../../servicios/destinosServicio'
import { obtenerServicios } from '../../servicios/serviciosServicio'
import './paginaInicio.css'

export function PaginaInicio() {
  const { buscando, ejecutarBusqueda } = useBusqueda()
  const navegar = useNavigate()
  const referenciaCarruselDestinos = useRef(null)
  const [estadoCarruselDestinos, setEstadoCarruselDestinos] = useState({
    puedeIrAtras: false,
    puedeIrAdelante: true,
  })
  const [destinos, setDestinos] = useState([])
  const [servicios, setServicios] = useState([])

  useEffect(() => {
    let cancelado = false

    obtenerDestinos()
      .then((datos) => {
        if (!cancelado) setDestinos(datos)
      })
      .catch(() => {
        // Si la consulta a la BD falla, la sección de Destinos simplemente
        // no se muestra: no se recurre a datos mock ni ficticios.
        if (!cancelado) setDestinos([])
      })

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    obtenerServicios()
      .then((datos) => {
        if (!cancelado) setServicios(datos)
      })
      .catch(() => {
        // Si la consulta a la BD falla, la sección de Servicios simplemente
        // no se muestra: no se recurre a datos mock ni ficticios.
        if (!cancelado) setServicios([])
      })

    return () => {
      cancelado = true
    }
  }, [])

  function manejarBuscar(parametros) {
    // La búsqueda se dispara aquí mismo para que el usuario ya vea
    // resultados cargando apenas llega a /resultados, pero el contexto
    // compartido (useBusqueda) es quien realmente conserva el estado
    // entre rutas (Inicio nunca vuelve a mostrar Destinos/Servicios
    // mezclados con resultados: eso vive únicamente en /resultados).
    ejecutarBusqueda(parametros)
    const consulta = new URLSearchParams(parametros).toString()
    navegar(`/resultados?${consulta}`)
  }

  return (
    <>
      <section className="hero-inicio">
        <div className="hero-inicio__fondo" aria-hidden="true">
          <img
            className="hero-inicio__imagen"
            src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=1900&auto=format&fit=crop"
            alt=""
          />
          <div className="hero-inicio__superposicion" />
        </div>

        <div className="contenedor hero-inicio__contenido">
          <span className="insignia hero-inicio__insignia">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            Más de 40 rutas a nivel nacional
          </span>
          <h1 className="hero-inicio__titulo">Tu próximo destino comienza aquí</h1>
          <p className="hero-inicio__subtitulo">
            Reserva tu pasaje en minutos y viaja con la tranquilidad de una
            flota moderna, puntual y pensada para tu comodidad.
          </p>

          <div className="hero-inicio__estadisticas">
            <div className="hero-inicio__estadistica">
              <span className="hero-inicio__estadistica-numero">40+</span>
              <span className="hero-inicio__estadistica-etiqueta">Rutas activas</span>
            </div>
            <div className="hero-inicio__estadistica-separador" />
            <div className="hero-inicio__estadistica">
              <span className="hero-inicio__estadistica-numero">120k</span>
              <span className="hero-inicio__estadistica-etiqueta">Viajeros al año</span>
            </div>
            <div className="hero-inicio__estadistica-separador" />
            <div className="hero-inicio__estadistica">
              <span className="hero-inicio__estadistica-numero">4.8★</span>
              <span className="hero-inicio__estadistica-etiqueta">Calificación</span>
            </div>
          </div>
        </div>

        <div className="contenedor hero-inicio__buscador">
          <BuscadorViajes alBuscar={manejarBuscar} buscando={buscando} />
        </div>
      </section>

      {destinos.length > 0 && (
        <section className="seccion contenedor seccion-destinos">
          <div className="seccion-destinos__cabecera">
            <div className="encabezado-seccion">
              <span className="encabezado-seccion__etiqueta">Destinos</span>
              <h2 className="encabezado-seccion__titulo">Descubre nuestros destinos</h2>
              <p className="encabezado-seccion__texto">
                Las rutas más elegidas por nuestros pasajeros, con salidas todos los días.
              </p>
            </div>

            <div className="seccion-destinos__flechas">
              <button
                type="button"
                className="seccion-destinos__flecha"
                onClick={() => referenciaCarruselDestinos.current?.desplazar(-1)}
                disabled={!estadoCarruselDestinos.puedeIrAtras}
                aria-label="Ver destinos anteriores"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="seccion-destinos__flecha"
                onClick={() => referenciaCarruselDestinos.current?.desplazar(1)}
                disabled={!estadoCarruselDestinos.puedeIrAdelante}
                aria-label="Ver más destinos"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <CarruselDestinos
            destinos={destinos}
            ref={referenciaCarruselDestinos}
            onEstadoCambio={setEstadoCarruselDestinos}
          />

          <NavLink to="/destinos" className="enlace-ver-todo">
            Ver todos los destinos
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </NavLink>
        </section>
      )}

      {servicios.length > 0 && (
        <section className="seccion seccion-servicios">
          <div className="contenedor seccion-servicios__cabecera">
            <div className="encabezado-seccion">
              <span className="encabezado-seccion__etiqueta">Servicios</span>
              <h2 className="encabezado-seccion__titulo">Viaja como prefieras</h2>
              <p className="encabezado-seccion__texto">
                Distintos niveles de servicio pensados para cada tipo de viaje,
                desde lo esencial hasta la experiencia más exclusiva.
              </p>
            </div>
          </div>

          <CarruselServicios servicios={servicios} />

          <div className="contenedor">
            <NavLink to="/servicios" className="enlace-ver-todo">
              Conocer todos los servicios
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </NavLink>
          </div>
        </section>
      )}
    </>
  )
}
