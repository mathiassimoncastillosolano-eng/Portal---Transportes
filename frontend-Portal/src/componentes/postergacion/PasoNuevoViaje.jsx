import { useEffect, useRef, useState } from 'react'
import { SelectorFecha } from '../viajes/SelectorFecha'
import { TarjetaResultadoViaje } from '../viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../viajes/FiltrosResultados'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { PanelAsincrono } from '../carga'
import { buscarViajesPostergables, fechaInicialDeBusqueda } from '../../servicios/postergacionServicio'
import { estadoReservaActual } from '../../utilidades/estadoReserva'
import { formatearFechaLarga } from '../../utilidades/formato'
import { filtrarViajes } from '../../utilidades/filtrarViajes'

export function PasoNuevoViaje({ pasaje, busqueda, alGuardarBusqueda, alElegir, consultarViajes = buscarViajesPostergables }) {
  const [buscando, setBuscando] = useState(!busqueda)
  const [error, setError] = useState('')
  const [horario, setHorario] = useState('cualquiera')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState(new Set())
  const consulta = useRef(0)
  // La búsqueda empieza en el día del viaje original; se puede elegir otro día.
  const [fechaInicial] = useState(() => fechaInicialDeBusqueda(pasaje))
  const [fechaElegida, setFechaElegida] = useState(() => busqueda?.criterios?.fecha ?? fechaInicial)

  function buscarFecha(evento) {
    evento.preventDefault()
    if (!fechaElegida) return
    ejecutar({ origen: pasaje.origen, destino: pasaje.destino, fecha: fechaElegida })
  }

  async function ejecutar(criterios) {
    const numero = consulta.current + 1
    consulta.current = numero
    setBuscando(true)
    setError('')
    limpiarFiltros()
    try {
      const respuesta = await consultarViajes(pasaje, criterios)
      if (consulta.current !== numero) return
      alGuardarBusqueda({ criterios, viajes: respuesta.viajes, sinCupo: respuesta.sinCupo })
    } catch {
      if (consulta.current !== numero) return
      setError('No pudimos consultar los viajes. Inténtalo nuevamente.')
    } finally {
      if (consulta.current === numero) setBuscando(false)
    }
  }

  function alternarServicio(servicio) {
    setServiciosSeleccionados((anteriores) => {
      if (servicio === null) return new Set()
      const siguientes = new Set(anteriores)
      if (siguientes.has(servicio)) siguientes.delete(servicio)
      else siguientes.add(servicio)
      return siguientes
    })
  }

  function limpiarFiltros() {
    setHorario('cualquiera')
    setServiciosSeleccionados(new Set())
  }

  useEffect(() => {
    if (busqueda) return undefined
    ejecutar({ origen: pasaje.origen, destino: pasaje.destino, fecha: fechaInicial })
    return () => { consulta.current += 1 }
  }, [])

  const criterios = busqueda?.criterios ?? { origen: pasaje.origen, destino: pasaje.destino, fecha: fechaInicial }
  const viajes = busqueda?.viajes ?? []
  const viajesFiltrados = filtrarViajes(viajes, horario, serviciosSeleccionados)
  const serviciosDisponibles = [...new Set(viajes.map((viaje) => viaje.tipoBus).filter(Boolean))]
  const ordenServicios = ['Estándar', 'Semi Cama', 'Bus Cama', 'Prime']
  serviciosDisponibles.sort((a, b) => {
    const indiceA = ordenServicios.indexOf(a)
    const indiceB = ordenServicios.indexOf(b)
    return (indiceA < 0 ? ordenServicios.length : indiceA) - (indiceB < 0 ? ordenServicios.length : indiceB)
      || a.localeCompare(b, 'es')
  })
  const hayFiltrosActivos = horario !== 'cualquiera' || serviciosSeleccionados.size > 0
  const sinCupo = busqueda?.sinCupo ?? 0
  const ahora = Date.now()

  return (
    <div className="postergacion-paso">
      <div className="postergacion-paso__cabecera">
        <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>Elige tu nuevo viaje</h2>
        <p className="postergacion-paso__texto">
          Elige otra fecha u hora, antes o después de tu viaje. La ruta no cambia y solo se muestran
          salidas que parten dentro de 6 horas o más. Tu pasaje conserva su código y su pago.
        </p>
      </div>

      <form className="postergacion-fecha" onSubmit={buscarFecha}>
        <h3 className="postergacion-fecha__titulo">¿Qué día quieres viajar?</h3>
        <SelectorFecha etiqueta="Nueva fecha" valor={fechaElegida} alCambiar={setFechaElegida} />
        <BotonPrincipal tipo="submit" deshabilitado={buscando || !fechaElegida}>
          {buscando ? 'Buscando…' : 'Ver viajes →'}
        </BotonPrincipal>
      </form>

      <div className="postergacion-paso__grilla">
        <aside aria-label="Filtros de viajes">
          <FiltrosResultados
            horario={horario}
            alCambiarHorario={setHorario}
            serviciosDisponibles={serviciosDisponibles}
            serviciosSeleccionados={serviciosSeleccionados}
            alAlternarServicio={alternarServicio}
            hayFiltrosActivos={hayFiltrosActivos}
            alLimpiarFiltros={limpiarFiltros}
          />
        </aside>
        <div className="postergacion-paso__resultados" aria-live="polite">
          <PanelAsincrono
            variante="busqueda"
            origen={criterios.origen}
            destino={criterios.destino}
            cargando={buscando}
            error={error || null}
            vacio={viajesFiltrados.length === 0}
            alReintentar={() => ejecutar(criterios)}
            estadoError={{ titulo: 'No pudimos consultar los viajes' }}
            estadoVacio={{
              titulo: hayFiltrosActivos && viajes.length > 0 ? 'Sin viajes con estos filtros' : 'Sin viajes disponibles',
              texto: hayFiltrosActivos && viajes.length > 0
                ? 'Prueba con otra hora de salida o tipo de servicio.'
                : `No hay salidas con asientos para el ${formatearFechaLarga(criterios.fecha)}. Prueba con otra fecha.`,
              accion: hayFiltrosActivos && viajes.length > 0
                ? { texto: 'Limpiar filtros', alClick: limpiarFiltros }
                : undefined,
            }}
            compacto
          >
            <>
              <p className="postergacion-paso__conteo">
                {viajesFiltrados.length} {viajesFiltrados.length === 1 ? 'viaje disponible' : 'viajes disponibles'}{hayFiltrosActivos ? ' con estos filtros' : ''} · {formatearFechaLarga(criterios.fecha)}
              </p>
              <div className="postergacion-paso__lista">
                {viajesFiltrados.map((viaje) => (
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
                  {sinCupo} {sinCupo === 1 ? 'salida no se muestra' : 'salidas no se muestran'} por no tener cupo, ser tu viaje actual o salir en menos de 6 horas.
                </p>
              )}
            </>
          </PanelAsincrono>
        </div>
      </div>
    </div>
  )
}
