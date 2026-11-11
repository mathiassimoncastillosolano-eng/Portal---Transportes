import { useEffect, useState } from 'react'
import { obtenerDestinos } from '../../servicios/destinosServicio'
import { TarjetaDestino } from '../../componentes/destinos/TarjetaDestino'
import { PanelAsincrono } from '../../componentes/carga'
import './paginaDestinos.css'

export function PaginaDestinos() {
  const [destinos, setDestinos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [intentos, setIntentos] = useState(0)

  useEffect(() => {
    let cancelado = false

    async function cargarDestinos() {
      setCargando(true)
      setError(null)
      try {
        const datos = await obtenerDestinos()
        if (!cancelado) setDestinos(datos)
      } catch {
        if (!cancelado) setError('No se pudieron cargar los destinos. Intenta nuevamente más tarde.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargarDestinos()
    return () => {
      cancelado = true
    }
  }, [intentos])

  return (
    <section className="seccion contenedor pagina-destinos">
      <div className="encabezado-seccion">
        <span className="encabezado-seccion__etiqueta">Destinos</span>
        <h1 className="encabezado-seccion__titulo">Descubre nuestros destinos</h1>
        <p className="encabezado-seccion__texto">
          Salidas diarias hacia los rincones más visitados del país.
        </p>
      </div>

      <PanelAsincrono
        variante="destinos"
        cargando={cargando}
        error={error}
        vacio={destinos.length === 0}
        alReintentar={() => setIntentos((n) => n + 1)}
        estadoVacio={{ titulo: 'Aún no hay destinos', texto: 'Todavía no hay destinos disponibles.' }}
      >
        <div className="pagina-destinos__cuadricula">
          {destinos.map((destino) => (
            <TarjetaDestino key={destino.id} destino={destino} grande />
          ))}
        </div>
      </PanelAsincrono>
    </section>
  )
}
