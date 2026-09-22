import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { TarjetaResultadoViaje } from '../../componentes/viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../../componentes/viajes/FiltrosResultados'
import { BotonSecundario } from '../../componentes/comunes/BotonSecundario'
import { useBusqueda } from '../../hooks/useBusqueda'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useModalesAutenticacion } from '../../layouts/LayoutPrincipal'
import { obtenerTiposDeBus, obtenerViajesReales } from '../../servicios/viajesServicio'
import './paginaResultados.css'

function fechaDeManana() {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  return manana.toISOString().split('T')[0]
}

function franjaDeHora(horaTexto) {
  const hora = Number(horaTexto?.split(':')?.[0] ?? -1)
  if (hora < 0) return 'cualquiera'
  if (hora < 6) return 'madrugada'
  if (hora < 12) return 'mañana'
  if (hora < 19) return 'tarde'
  return 'noche'
}

const FILTROS_INICIALES = { horario: 'cualquiera', servicios: new Set() }

/**
 * Vista de resultados de búsqueda.
 *
 * Los VIAJES que se listan (y se pintan con `TarjetaResultadoViaje`) vienen
 * siempre del backend real (GET /api/viajes/tipo-servicio), tanto para
 * "Todos" como para uno o varios tipos de servicio seleccionados — nunca
 * como una lista de texto aparte. El buscador de origen/destino/fecha de
 * arriba (`useBusqueda`, simulado) se deja tal cual: ese filtro lo
 * implementará otra compañera más adelante combinándolo con este mismo
 * endpoint (ver `obtenerViajesReales`, que ya acepta una lista de tipos
 * como condición adicional/combinable).
 */
export function PaginaResultados() {
  // `resultados` (la búsqueda mock por origen/destino/fecha) no se usa
  // para pintar tarjetas: eso ahora viene siempre del backend real (ver
  // `viajesReales` más abajo). Se deja `useBusqueda` intacto — `buscando`,
  // `criterios` y `ejecutarBusqueda` los sigue usando el buscador de
  // arriba y son la base sobre la que se integrará el filtro real de
  // origen/destino/fecha más adelante.
  const { buscando, error, criterios, ejecutarBusqueda } = useBusqueda()
  const { estaAutenticado } = useAutenticacion()
  const { abrirInicioSesion } = useModalesAutenticacion()
  const navegar = useNavigate()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const yaEvaluoAlEntrar = useRef(false)

  const [horario, setHorario] = useState(FILTROS_INICIALES.horario)
  // Set vacío == "Todos" seleccionado. Cualquier elemento en el Set es un
  // nombre_tipo específico (p. ej. "Semi Cama"); pueden convivir varios a
  // la vez (selección múltiple, combinados con OR).
  const [tiposSeleccionados, setTiposSeleccionados] = useState(FILTROS_INICIALES.servicios)

  // Chips dinámicos: nombres de tipo_bus tal como existen en la BD, nunca
  // hardcodeados. Se cargan una sola vez.
  const [tiposDisponibles, setTiposDisponibles] = useState([])
  const [errorTipos, setErrorTipos] = useState(null)

  useEffect(() => {
    let cancelado = false
    obtenerTiposDeBus()
      .then((tipos) => {
        if (!cancelado) setTiposDisponibles(tipos.map((tipo) => tipo.nombreTipo))
      })
      .catch((error) => {
        if (!cancelado) setErrorTipos(error.message ?? 'No se pudo cargar los tipos de servicio.')
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Viajes reales (backend), según los tipos seleccionados. Se vuelve a
  // pedir cada vez que cambia la selección, incluyendo "Todos" (lista
  // vacía = sin filtro de tipo, backend devuelve todos los viajes).
  const [viajesReales, setViajesReales] = useState([])
  const [cargandoViajesReales, setCargandoViajesReales] = useState(true)
  const [errorViajesReales, setErrorViajesReales] = useState(null)

  useEffect(() => {
    let cancelado = false
    setCargandoViajesReales(true)
    setErrorViajesReales(null)

    obtenerViajesReales(Array.from(tiposSeleccionados))
      .then((viajes) => {
        if (!cancelado) setViajesReales(viajes)
      })
      .catch((error) => {
        if (cancelado) return
        setErrorViajesReales(error.message ?? 'No se pudo consultar los viajes.')
        setViajesReales([])
      })
      .finally(() => {
        if (!cancelado) setCargandoViajesReales(false)
      })

    return () => {
      cancelado = true
    }
  }, [tiposSeleccionados])

  useEffect(() => {
    if (yaEvaluoAlEntrar.current) return
    yaEvaluoAlEntrar.current = true

    const origenUrl = parametrosUrl.get('origen')
    const destinoUrl = parametrosUrl.get('destino')

    // Si el usuario llegó desde Inicio, la búsqueda ya se disparó y sus
    // criterios coinciden con la URL: se conserva tal cual, sin repetirla.
    const yaHayBusquedaVigente = criterios && criterios.origen === origenUrl && criterios.destino === destinoUrl

    if (origenUrl && destinoUrl && !yaHayBusquedaVigente) {
      ejecutarBusqueda({
        origen: origenUrl,
        destino: destinoUrl,
        fecha: parametrosUrl.get('fecha') || fechaDeManana(),
      })
    } else if (!origenUrl && !destinoUrl && !criterios) {
      // No hay ninguna búsqueda ni en la URL ni conservada en el
      // contexto: no tiene sentido esta vista.
      navegar('/', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Una nueva búsqueda (otra ruta u otra fecha) reinicia los filtros: no
  // tendría sentido conservar "Tarde" si el usuario cambió de ciudades.
  useEffect(() => {
    setHorario(FILTROS_INICIALES.horario)
    setTiposSeleccionados(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterios?.origen, criterios?.destino, criterios?.fecha])

  function manejarBuscar(parametros) {
    setParametrosUrl({ origen: parametros.origen, destino: parametros.destino, fecha: parametros.fecha })
    ejecutarBusqueda(parametros)
  }

  function manejarSeleccion(resultado) {
    if (!estaAutenticado) {
      abrirInicioSesion()
      return
    }
    const fecha = criterios?.fecha ?? fechaDeManana()
    navegar('/reservar', { state: { resultado, fecha } })
  }

  // "Todos" (servicio === null) limpia la selección. Elegir un tipo
  // específico se suma/quita del Set; si queda vacío, "Todos" vuelve a
  // quedar seleccionado automáticamente (Set vacío == Todos).
  function alternarServicio(servicio) {
    if (servicio === null) {
      setTiposSeleccionados(new Set())
      return
    }
    setTiposSeleccionados((anterior) => {
      const copia = new Set(anterior)
      if (copia.has(servicio)) copia.delete(servicio)
      else copia.add(servicio)
      return copia
    })
  }

  function limpiarFiltros() {
    setHorario(FILTROS_INICIALES.horario)
    setTiposSeleccionados(new Set())
  }

  const idMasEconomico = useMemo(() => {
    const conPrecio = viajesReales.filter(
      (resultado) => resultado.estado !== 'agotado' && typeof resultado.precio === 'number',
    )
    if (conPrecio.length === 0) return null
    return conPrecio.reduce((min, actual) => (actual.precio < min.precio ? actual : min), conPrecio[0]).id
  }, [viajesReales])

  // El filtro de horario (ya existente, franjas del día) sigue operando
  // en el cliente, ahora sobre los viajes reales: `horaSalida` llega en
  // el mismo formato "HH:mm" que ya entendía `franjaDeHora`.
  const viajesFiltrados = useMemo(
    () => viajesReales.filter((resultado) => horario === 'cualquiera' || franjaDeHora(resultado.horaSalida) === horario),
    [viajesReales, horario],
  )

  const hayFiltrosActivos = horario !== 'cualquiera' || tiposSeleccionados.size > 0
  const sinResultadosPorFiltros =
    !cargandoViajesReales && !errorViajesReales && viajesReales.length > 0 && viajesFiltrados.length === 0

  return (
    <section className="seccion contenedor pagina-resultados">
      <div className="pagina-resultados__filtro">
        <BuscadorViajes
          key={criterios ? `${criterios.origen}-${criterios.destino}-${criterios.fecha}` : 'inicial'}
          alBuscar={manejarBuscar}
          buscando={buscando}
          valoresIniciales={criterios}
        />
      </div>

      <div className="pagina-resultados__cuerpo">
        <div className="encabezado-seccion">
          {criterios && (
            <h1 className="encabezado-seccion__titulo">
              {criterios.origen} → {criterios.destino}
            </h1>
          )}
          <p className="encabezado-seccion__texto">
            {cargandoViajesReales
              ? 'Buscando las mejores opciones disponibles…'
              : hayFiltrosActivos
                ? `${viajesFiltrados.length} de ${viajesReales.length} viajes con estos filtros`
                : `${viajesReales.length} viajes encontrados`}
          </p>
        </div>

        {error && <p className="resultados-busqueda__error">{error}</p>}
        {errorViajesReales && <p className="resultados-busqueda__error">{errorViajesReales}</p>}
        {errorTipos && <p className="resultados-busqueda__error">{errorTipos}</p>}

        {cargandoViajesReales ? (
          <div className="pagina-resultados__grilla">
            <div className="resultados-busqueda__esqueleto resultados-busqueda__esqueleto--filtro" />
            <div className="resultados-busqueda__lista">
              {[1, 2, 3].map((clave) => (
                <div key={clave} className="resultados-busqueda__esqueleto" />
              ))}
            </div>
          </div>
        ) : viajesReales.length === 0 && !errorViajesReales ? (
          <div className="resultados-busqueda__vacio">
            <h2>No encontramos viajes para esta búsqueda.</h2>
            <p>Prueba con otro tipo de servicio o vuelve a intentarlo más tarde.</p>
          </div>
        ) : (
          <div className="pagina-resultados__grilla">
            <FiltrosResultados
              horario={horario}
              alCambiarHorario={setHorario}
              serviciosDisponibles={tiposDisponibles}
              serviciosSeleccionados={tiposSeleccionados}
              alAlternarServicio={alternarServicio}
              hayFiltrosActivos={hayFiltrosActivos}
              alLimpiarFiltros={limpiarFiltros}
            />

            {sinResultadosPorFiltros ? (
              <div className="resultados-busqueda__vacio">
                <h2>No encontramos viajes con estos filtros.</h2>
                <p>Prueba modificando la hora o el tipo de servicio.</p>
                <BotonSecundario onClick={limpiarFiltros}>Limpiar filtros</BotonSecundario>
              </div>
            ) : (
              <div className="resultados-busqueda__lista">
                {viajesFiltrados.map((resultado) => (
                  <TarjetaResultadoViaje
                    key={resultado.id}
                    resultado={resultado}
                    esMasEconomico={resultado.id === idMasEconomico}
                    alSeleccionar={manejarSeleccion}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
