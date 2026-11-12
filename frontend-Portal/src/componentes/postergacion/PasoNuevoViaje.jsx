import { useEffect, useRef, useState } from 'react'
import { BuscadorViajes } from '../viajes/BuscadorViajes'
import { TarjetaResultadoViaje } from '../viajes/TarjetaResultadoViaje'
import { PanelAsincrono } from '../carga'
import { buscarViajesPostergables, fechaMinimaDePostergacion, rutasDePostergacion } from '../../servicios/postergacionServicio'
import { estadoReservaActual } from '../../utilidades/estadoReserva'
import { formatearFechaLarga } from '../../utilidades/formato'

export function PasoNuevoViaje({ pasaje, busqueda, alGuardarBusqueda, alElegir }) {
  const [buscando, setBuscando] = useState(!busqueda)
  const [error, setError] = useState('')
  const consulta = useRef(0)
  // Solo se ofrece la ruta del pasaje original (se calcula una vez).
  const [rutas] = useState(() => rutasDePostergacion(pasaje))
  // Es postergación: no se puede buscar antes del día del viaje original.
  const [fechaMinima] = useState(() => fechaMinimaDePostergacion(pasaje))

  async function ejecutar(criterios) {
    const numero = consulta.current + 1
    consulta.current = numero
    setBuscando(true)
    setError('')
    try {
      const respuesta = await buscarViajesPostergables(pasaje, criterios)
      if (consulta.current !== numero) return
      alGuardarBusqueda({ criterios, viajes: respuesta.viajes, sinCupo: respuesta.sinCupo })
    } catch {
      if (consulta.current !== numero) return
      setError('No pudimos consultar los viajes. Inténtalo nuevamente.')
    } finally {
      if (consulta.current === numero) setBuscando(false)
    }
  }

  useEffect(() => {
    if (busqueda) return undefined
    ejecutar({ origen: pasaje.origen, destino: pasaje.destino, fecha: fechaMinima })
    return () => { consulta.current += 1 }
  }, [])

  const criterios = busqueda?.criterios ?? { origen: pasaje.origen, destino: pasaje.destino, fecha: fechaMinima }
  const viajes = busqueda?.viajes ?? []
  const sinCupo = busqueda?.sinCupo ?? 0
  const ahora = Date.now()

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Elige tu nuevo viaje</h2>
        <p className="postergacion-paso__texto">
          Elige una nueva fecha. La ruta no cambia y solo se muestran salidas posteriores a tu viaje original.
          Tu pasaje conserva su código y su pago; solo cambian el viaje y el asiento.
        </p>
      </div>

      <div className="postergacion-paso__buscador">
        <BuscadorViajes
          rutasDisponibles={rutas}
          rutaFija
          fechaMinima={fechaMinima}
          valoresIniciales={criterios}
          buscando={buscando}
          alBuscar={ejecutar}
        />
      </div>

      <div className="postergacion-paso__resultados" aria-live="polite">
        <PanelAsincrono
          variante="busqueda"
          origen={criterios.origen}
          destino={criterios.destino}
          cargando={buscando}
          error={error || null}
          vacio={viajes.length === 0}
          alReintentar={() => ejecutar(criterios)}
          estadoError={{ titulo: 'No pudimos consultar los viajes' }}
          estadoVacio={{
            titulo: 'Sin viajes disponibles',
            texto: `No hay salidas con asientos para el ${formatearFechaLarga(criterios.fecha)}. Prueba con otra fecha.`,
          }}
          compacto
        >
          <>
            <p className="postergacion-paso__conteo">
              {viajes.length} {viajes.length === 1 ? 'viaje disponible' : 'viajes disponibles'} · {formatearFechaLarga(criterios.fecha)}
            </p>
            <div className="postergacion-paso__lista">
              {viajes.map((viaje) => (
                <TarjetaResultadoViaje
                  key={viaje.id}
                  resultado={viaje}
                  estadoReserva={estadoReservaActual(viaje, ahora)}
                  alSeleccionar={alElegir}
                  textoAccion="Elegir este viaje →"
                />
              ))}
            </div>
            {sinCupo > 0 && (
              <p className="postergacion-paso__nota">
                {sinCupo} {sinCupo === 1 ? 'salida no se muestra' : 'salidas no se muestran'} por no tener cupo, salir antes de tu viaje original o ya haber partido.
              </p>
            )}
          </>
        </PanelAsincrono>
      </div>
    </div>
  )
}
