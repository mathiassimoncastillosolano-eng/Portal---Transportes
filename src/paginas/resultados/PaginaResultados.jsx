import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { TarjetaResultadoViaje } from '../../componentes/viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../../componentes/viajes/FiltrosResultados'
import { BotonSecundario } from '../../componentes/comunes/BotonSecundario'
import { useBusqueda } from '../../hooks/useBusqueda'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useModalesAutenticacion } from '../../layouts/LayoutPrincipal'
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
 * Vista independiente de resultados de búsqueda: filtro de fecha/ruta,
 * filtros de horario/servicio, y la lista de viajes encontrados. Los
 * resultados llegan de `buscarViajes` ya ordenados por hora de salida;
 * aquí solo se filtran, nunca se reordenan.
 */
export function PaginaResultados() {
  const { resultados, buscando, error, criterios, ejecutarBusqueda } = useBusqueda()
  const { estaAutenticado } = useAutenticacion()
  const { abrirInicioSesion } = useModalesAutenticacion()
  const navegar = useNavigate()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const yaEvaluoAlEntrar = useRef(false)

  const [horario, setHorario] = useState(FILTROS_INICIALES.horario)
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState(FILTROS_INICIALES.servicios)

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
    setServiciosSeleccionados(new Set())
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

  function alternarServicio(servicio) {
    if (servicio === null) {
      setServiciosSeleccionados(new Set())
      return
    }
    setServiciosSeleccionados((anterior) => {
      const copia = new Set(anterior)
      if (copia.has(servicio)) copia.delete(servicio)
      else copia.add(servicio)
      return copia
    })
  }

  function limpiarFiltros() {
    setHorario(FILTROS_INICIALES.horario)
    setServiciosSeleccionados(new Set())
  }

  const serviciosDisponibles = useMemo(
    () => Array.from(new Set(resultados.map((resultado) => resultado.tipoBus))),
    [resultados],
  )

  const idMasEconomico = useMemo(() => {
    const disponibles = resultados.filter((resultado) => resultado.estado !== 'agotado')
    if (disponibles.length === 0) return null
    return disponibles.reduce((min, actual) => (actual.precio < min.precio ? actual : min), disponibles[0]).id
  }, [resultados])

  const resultadosFiltrados = useMemo(
    () =>
      resultados.filter((resultado) => {
        if (horario !== 'cualquiera' && franjaDeHora(resultado.horaSalida) !== horario) return false
        if (serviciosSeleccionados.size > 0 && !serviciosSeleccionados.has(resultado.tipoBus)) return false
        return true
      }),
    [resultados, horario, serviciosSeleccionados],
  )

  const hayFiltrosActivos = horario !== 'cualquiera' || serviciosSeleccionados.size > 0
  const sinResultadosPorFiltros = !buscando && !error && resultados.length > 0 && resultadosFiltrados.length === 0

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
            {buscando
              ? 'Buscando las mejores opciones disponibles…'
              : hayFiltrosActivos
                ? `${resultadosFiltrados.length} de ${resultados.length} viajes con estos filtros`
                : `${resultados.length} viajes encontrados para tu búsqueda`}
          </p>
        </div>

        {error && <p className="resultados-busqueda__error">{error}</p>}

        {buscando ? (
          <div className="pagina-resultados__grilla">
            <div className="resultados-busqueda__esqueleto resultados-busqueda__esqueleto--filtro" />
            <div className="resultados-busqueda__lista">
              {[1, 2, 3].map((clave) => (
                <div key={clave} className="resultados-busqueda__esqueleto" />
              ))}
            </div>
          </div>
        ) : resultados.length === 0 ? (
          !error && (
            <div className="resultados-busqueda__vacio">
              <h2>No encontramos viajes para esta búsqueda.</h2>
              <p>Prueba con otra fecha o revisa el origen y destino ingresados.</p>
            </div>
          )
        ) : (
          <div className="pagina-resultados__grilla">
            <FiltrosResultados
              horario={horario}
              alCambiarHorario={setHorario}
              serviciosDisponibles={serviciosDisponibles}
              serviciosSeleccionados={serviciosSeleccionados}
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
                {resultadosFiltrados.map((resultado) => (
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
