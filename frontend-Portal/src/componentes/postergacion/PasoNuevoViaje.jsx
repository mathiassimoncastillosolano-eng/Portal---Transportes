import { useEffect, useRef, useState } from 'react'
import { SelectorFecha } from '../viajes/SelectorFecha'
import { SelectorUbicacion } from '../viajes/SelectorUbicacion'
import { TarjetaResultadoViaje } from '../viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../viajes/FiltrosResultados'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { PanelAsincrono } from '../carga'
import { obtenerRutasCiudad } from '../../servicios/destinosServicio'
import { buscarViajesPostergables } from '../../servicios/postergacionServicio'
import { estadoReservaActual } from '../../utilidades/estadoReserva'
import { formatearFechaLarga } from '../../utilidades/formato'
import { filtrarViajes } from '../../utilidades/filtrarViajes'

export function PasoNuevoViaje({ pasaje, busqueda, alGuardarBusqueda, alElegir, alCancelar,
  consultarViajes = buscarViajesPostergables, consultarRutas = obtenerRutasCiudad }) {
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [errorRutas, setErrorRutas] = useState('')
  const [rutas, setRutas] = useState([])
  const [cargandoRutas, setCargandoRutas] = useState(true)
  const [intentosRutas, setIntentosRutas] = useState(0)
  const [horario, setHorario] = useState('cualquiera')
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState(new Set())
  const consulta = useRef(0)
  const [origen, setOrigen] = useState(() => busqueda?.criterios?.origen ?? pasaje.origen)
  const [destino, setDestino] = useState(() => busqueda?.criterios?.destino ?? pasaje.destino)
  const [fechaElegida, setFechaElegida] = useState(() => busqueda?.criterios?.fecha ?? '')

  useEffect(() => {
    let activo = true
    setCargandoRutas(true)
    setErrorRutas('')
    consultarRutas()
      .then((respuesta) => {
        if (!activo) return
        if (!Array.isArray(respuesta)) throw new Error('Rutas no válidas')
        setRutas(respuesta)
        setCargandoRutas(false)
      })
      .catch(() => {
        if (!activo) return
        setErrorRutas('No pudimos cargar las rutas disponibles.')
        setCargandoRutas(false)
      })
    return () => { activo = false }
  }, [consultarRutas, intentosRutas])

  const origenes = [...new Set(rutas.map((ruta) => ruta.origen))].sort((a, b) => a.localeCompare(b, 'es'))
  const destinosDisponibles = [...new Set(rutas.filter((ruta) => ruta.origen === origen).map((ruta) => ruta.destino))]
    .sort((a, b) => a.localeCompare(b, 'es'))
  const rutaValida = destinosDisponibles.includes(destino)
  const puedeIntercambiar = rutas.some((ruta) => ruta.origen === destino && ruta.destino === origen)

  function limpiarBusqueda() {
    consulta.current += 1
    setBuscando(false)
    setError('')
    setErrorFormulario('')
    alGuardarBusqueda(null)
  }

  function cambiarOrigen(nuevoOrigen) {
    setOrigen(nuevoOrigen)
    setDestino((actual) => rutas.some((ruta) => ruta.origen === nuevoOrigen && ruta.destino === actual) ? actual : '')
    limpiarBusqueda()
  }

  function intercambiarCiudades() {
    if (!puedeIntercambiar) return
    setOrigen(destino)
    setDestino(origen)
    limpiarBusqueda()
  }

  function cambiarFecha(fecha) {
    setFechaElegida(fecha)
    limpiarBusqueda()
  }

  function buscarViajes(evento) {
    evento.preventDefault()
    if (!rutaValida || !fechaElegida) {
      setErrorFormulario('Elige una ruta disponible y una fecha para viajar.')
      return
    }
    ejecutar({ origen, destino, fecha: fechaElegida })
  }

  async function ejecutar(criterios) {
    const numero = consulta.current + 1
    consulta.current = numero
    setBuscando(true)
    setError('')
    setErrorFormulario('')
    limpiarFiltros()
    alGuardarBusqueda(null)
    try {
      const respuesta = await consultarViajes(pasaje, criterios)
      if (consulta.current !== numero) return
      alGuardarBusqueda({ criterios, viajes: respuesta.viajes, sinCupo: respuesta.sinCupo })
    } catch (fallo) {
      if (consulta.current !== numero) return
      // 404 y 409: el servidor rechazó el cambio y explica el motivo.
      const rechazado = fallo?.status === 404 || fallo?.status === 409
      setError(rechazado ? fallo.message : 'No pudimos consultar los viajes. Inténtalo nuevamente.')
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

  useEffect(() => () => { consulta.current += 1 }, [])

  const criterios = busqueda?.criterios ?? { origen, destino, fecha: fechaElegida }
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
  const mostrarFiltros = !buscando && !error && viajes.length > 0
  const ahora = Date.now()

  return (
    <div className="postergacion-paso">
      <form className="postergacion-busqueda" onSubmit={buscarViajes}>
        <div className="postergacion-busqueda__encabezado">
          <h2 className="postergacion-paso__titulo" tabIndex={-1} data-foco-paso>¿A dónde y cuándo quieres viajar?</h2>
          <p className="postergacion-paso__texto">
            Origen y destino vienen de tu pasaje. Cámbialos si lo necesitas; la fecha es obligatoria.
            Puedes adelantar o postergar: se muestran las salidas que todavía se pueden reservar.
          </p>
        </div>
        <div className="postergacion-busqueda__campos">
          <div className="postergacion-busqueda__campo">
            <SelectorUbicacion etiqueta="Origen" valor={origen} ciudades={origenes}
              alCambiar={cambiarOrigen} deshabilitado={cargandoRutas || rutas.length === 0} />
            <small>{origen === pasaje.origen ? 'De tu pasaje' : 'Nuevo origen'}</small>
          </div>
          <button type="button" className="postergacion-busqueda__intercambiar"
            onClick={intercambiarCiudades} disabled={!puedeIntercambiar}
            aria-label="Intercambiar origen y destino" title="Intercambiar origen y destino">
            <span aria-hidden="true">⇄</span>
          </button>
          <div className="postergacion-busqueda__campo">
            <SelectorUbicacion etiqueta="Destino" valor={destino} ciudades={destinosDisponibles}
              alCambiar={(valor) => { setDestino(valor); limpiarBusqueda() }}
              deshabilitado={cargandoRutas || !origen || rutas.length === 0} />
            <small>{destino === pasaje.destino ? 'De tu pasaje' : 'Nuevo destino'}</small>
          </div>
          <div className="postergacion-busqueda__campo">
            <SelectorFecha etiqueta="Nueva fecha *" valor={fechaElegida} alCambiar={cambiarFecha} textoVacio="Elige tu fecha" />
            <small>Obligatoria</small>
          </div>
        </div>
        {(errorRutas || errorFormulario) && (
          <p className="postergacion-busqueda__error" role="alert">
            {errorRutas || errorFormulario}{errorRutas && (
              <button type="button" onClick={() => setIntentosRutas((n) => n + 1)}>Reintentar</button>
            )}
          </p>
        )}
        <div className="postergacion-busqueda__acciones">
          <BotonSecundario onClick={alCancelar}>Cancelar cambio</BotonSecundario>
          <BotonPrincipal tipo="submit" deshabilitado={buscando || cargandoRutas || !rutaValida || !fechaElegida}>
            {buscando ? 'Buscando…' : 'Ver viajes →'}
          </BotonPrincipal>
        </div>
      </form>

      {(busqueda || buscando || error) && (
        <div className={`postergacion-paso__grilla${mostrarFiltros ? '' : ' postergacion-paso__grilla--sin-filtros'}`}>
          {mostrarFiltros && (
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
          )}
          <div className="postergacion-paso__resultados" aria-live="polite">
            <PanelAsincrono
              variante="busqueda"
              origen={criterios.origen}
              destino={criterios.destino}
              cargando={buscando}
              error={error || null}
              vacio={viajesFiltrados.length === 0}
              alReintentar={() => ejecutar({ origen, destino, fecha: fechaElegida })}
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
              </>
            </PanelAsincrono>
          </div>
        </div>
      )}
    </div>
  )
}
