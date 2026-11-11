import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { descripcionesDestinos } from '../../datos/descripcionesDestinos'
import { useBusqueda } from '../../hooks/useBusqueda'
import { obtenerDestinos, obtenerRutasCiudad } from '../../servicios/destinosServicio'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaDetalleDestino.css'

export function PaginaDetalleDestino() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { buscando, ejecutarBusqueda } = useBusqueda()
  const [destino, setDestino] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [rutas, setRutas] = useState([])
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [errorRutas, setErrorRutas] = useState(false)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    setError(false)

    obtenerDestinos()
      .then((destinos) => {
        if (!cancelado) setDestino(destinos.find((item) => String(item.id) === id) ?? null)
      })
      .catch(() => {
        if (!cancelado) setError(true)
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => { cancelado = true }
  }, [id, intentos])

  useEffect(() => {
    let cancelado = false
    setCargandoRutas(true)
    setErrorRutas(false)

    obtenerRutasCiudad()
      .then((datos) => {
        if (!cancelado) setRutas(datos)
      })
      .catch(() => {
        if (!cancelado) setErrorRutas(true)
      })
      .finally(() => {
        if (!cancelado) setCargandoRutas(false)
      })

    return () => { cancelado = true }
  }, [intentos])

  function manejarBuscar(parametros) {
    ejecutarBusqueda(parametros)
    navegar(`/resultados?${new URLSearchParams(parametros)}`)
  }

  const reintentar = () => setIntentos((n) => n + 1)

  return (
    <section className="seccion contenedor pagina-detalle-destino">
      <PanelAsincrono
        pagina
        variante="destinos"
        mensaje="Preparando tu destino"
        cargando={cargando}
        error={error}
        vacio={!destino}
        alReintentar={reintentar}
        estadoError={{
          titulo: 'No pudimos cargar el destino',
          texto: 'Comprueba la conexión con el servidor e inténtalo nuevamente.',
        }}
        estadoVacio={{
          titulo: 'Destino no encontrado',
          texto: 'Esta ciudad no está disponible en este momento.',
          accion: { texto: 'Volver a destinos', to: '/destinos' },
        }}
      >
        {() => (
          <>
            <Link className="pagina-detalle-destino__volver" to="/destinos">← Todos los destinos</Link>

            <div className="pagina-detalle-destino__portada">
              <img src={destino.imagen} alt={`Vista de ${destino.ciudad}`} />
              <div className="pagina-detalle-destino__titulo">
                <span>DESCUBRE TU PRÓXIMO DESTINO</span>
                <h1>{destino.ciudad}</h1>
              </div>
            </div>

            <div className="pagina-detalle-destino__descripcion">
              <span>CONOCE {destino.ciudad.toLocaleUpperCase('es-PE')}</span>
              <p>{descripcionesDestinos[destino.ciudad] ?? `Descubre ${destino.ciudad} y encuentra tu próximo viaje.`}</p>
            </div>

            <div className="pagina-detalle-destino__busqueda">
              <h2>Viaja a {destino.ciudad}</h2>
              <PanelAsincrono
                compacto
                variante="generico"
                mensaje="Consultando rutas disponibles"
                cargando={cargandoRutas}
                error={errorRutas}
                vacio={!rutas.some((ruta) => ruta.destino === destino.ciudad)}
                alReintentar={reintentar}
                estadoError={{ texto: 'No se pudieron consultar las rutas. Inténtalo nuevamente.' }}
                estadoVacio={{
                  titulo: 'Sin rutas por ahora',
                  texto: `Aún no hay rutas registradas hacia ${destino.ciudad}.`,
                }}
              >
                <p>Elige tu ciudad de origen y la fecha para buscar pasajes.</p>
                <BuscadorViajes
                  key={destino.id}
                  alBuscar={manejarBuscar}
                  buscando={buscando}
                  valoresIniciales={{ destino: destino.ciudad }}
                  rutasDisponibles={rutas}
                  destinoSugerido={destino.ciudad}
                />
              </PanelAsincrono>
            </div>
          </>
        )}
      </PanelAsincrono>
    </section>
  )
}
