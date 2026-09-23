import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { TarjetaResultadoViaje } from '../../componentes/viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../../componentes/viajes/FiltrosResultados'
import { BotonSecundario } from '../../componentes/comunes/BotonSecundario'
import { useBusqueda } from '../../hooks/useBusqueda'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useModalesAutenticacion } from '../../layouts/LayoutPrincipal'
import { obtenerTiposDeBus } from '../../servicios/viajesServicio'
import './paginaResultados.css'

export function PaginaResultados() {
  const { resultados, buscando, error, criterios, ejecutarBusqueda } = useBusqueda()
  const { estaAutenticado } = useAutenticacion()
  const { abrirInicioSesion } = useModalesAutenticacion()
  const navegar = useNavigate()
  const [parametrosUrl, setParametrosUrl] = useSearchParams()
  const origen = parametrosUrl.get('origen') ?? ''
  const destino = parametrosUrl.get('destino') ?? ''
  const fecha = parametrosUrl.get('fecha') ?? ''
  const horarioUrl = parametrosUrl.get('horario') ?? 'cualquiera'
  const horario = horarioUrl === 'manana' ? 'mañana' : horarioUrl
  const tiposUrl = JSON.stringify(parametrosUrl.getAll('tipoServicio').sort())
  const serviciosSeleccionados = useMemo(() => new Set(JSON.parse(tiposUrl)), [tiposUrl])
  const [serviciosDisponibles, setServiciosDisponibles] = useState([])
  const [errorTipos, setErrorTipos] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerTiposDeBus().then((tipos) => {
      if (vigente) setServiciosDisponibles(tipos.map((t) => t.nombreTipo))
    }).catch((err) => { if (vigente) setErrorTipos(err.message) })
    return () => { vigente = false }
  }, [])

  useEffect(() => {
    if (!origen && !destino && !fecha) { navegar('/', { replace: true }); return }
    if (criterios?.origen !== origen || criterios?.destino !== destino ||
        criterios?.fecha !== fecha || criterios?.horario !== horario ||
        JSON.stringify([...(criterios?.tiposServicio ?? [])].sort()) !== tiposUrl) {
      ejecutarBusqueda({ origen, destino, fecha, horario, tiposServicio: JSON.parse(tiposUrl) })
    }
  }, [origen, destino, fecha, horario, tiposUrl, criterios, ejecutarBusqueda, navegar])

  function manejarBuscar(parametros) {
    setParametrosUrl(parametros)
  }
  function cambiarHorario(nuevoHorario) {
    const siguientes = new URLSearchParams(parametrosUrl)
    siguientes.set('horario', nuevoHorario)
    setParametrosUrl(siguientes)
  }
  function manejarSeleccion(resultado) {
    if (!estaAutenticado) { abrirInicioSesion(); return }
    navegar('/reservar', { state: { resultado, fecha: resultado.fechaSalida } })
  }
  function alternarServicio(servicio) {
    const copia = new Set(serviciosSeleccionados)
    if (servicio === null) copia.clear()
    else if (copia.has(servicio)) copia.delete(servicio)
    else copia.add(servicio)
    const siguientes = new URLSearchParams(parametrosUrl)
    siguientes.delete('tipoServicio')
    copia.forEach((tipo) => siguientes.append('tipoServicio', tipo))
    setParametrosUrl(siguientes)
  }
  function limpiarFiltros() {
    setParametrosUrl({ origen, destino, fecha, horario: 'cualquiera' })
  }

  const resultadosFiltrados = resultados
  const disponibles = resultadosFiltrados.filter((r) => r.estado !== 'agotado' && r.precio != null)
  const idMasEconomico = disponibles.length
    ? disponibles.reduce((menor, r) => r.precio < menor.precio ? r : menor).id : null
  const hayFiltrosActivos = horario !== 'cualquiera' || serviciosSeleccionados.size > 0

  return (
    <section className="seccion contenedor pagina-resultados">
      <div className="pagina-resultados__filtro">
        <BuscadorViajes key={`${origen}-${destino}-${fecha}`} alBuscar={manejarBuscar}
          buscando={buscando} valoresIniciales={{ origen, destino, fecha }} />
      </div>
      <div className="pagina-resultados__cuerpo">
        <div className="encabezado-seccion">
          <h1 className="encabezado-seccion__titulo">{origen} → {destino}</h1>
          <p className="encabezado-seccion__texto" aria-live="polite">
            {buscando ? 'Consultando viajes disponibles…' : `${resultadosFiltrados.length} viajes encontrados${hayFiltrosActivos ? ' con estos filtros' : ''}`}
          </p>
        </div>
        <div className="pagina-resultados__grilla">
          {errorTipos && <p role="alert">{errorTipos} Puedes seguir buscando por ruta, fecha y horario.</p>}
          <FiltrosResultados horario={horario} alCambiarHorario={cambiarHorario}
            serviciosDisponibles={serviciosDisponibles} serviciosSeleccionados={serviciosSeleccionados}
            alAlternarServicio={alternarServicio} hayFiltrosActivos={hayFiltrosActivos} alLimpiarFiltros={limpiarFiltros} />
          {buscando ? (
            <div className="resultados-busqueda__lista" aria-busy="true">
              {[1, 2, 3].map((n) => <div key={n} className="resultados-busqueda__esqueleto" />)}
            </div>
          ) : error ? (
            <div className="resultados-busqueda__vacio" role="alert">
              <p className="resultados-busqueda__error">{error}</p>
              <BotonSecundario onClick={() => ejecutarBusqueda({ origen, destino, fecha, horario, tiposServicio: JSON.parse(tiposUrl) })}>Reintentar</BotonSecundario>
            </div>
          ) : resultadosFiltrados.length === 0 ? (
            <div className="resultados-busqueda__vacio">
              <h2>No encontramos viajes {hayFiltrosActivos ? 'con estos filtros' : 'para esta búsqueda'}.</h2>
              <p>Prueba con otra fecha o modifica los filtros.</p>
              {hayFiltrosActivos && <BotonSecundario onClick={limpiarFiltros}>Limpiar filtros</BotonSecundario>}
            </div>
          ) : (
            <div className="resultados-busqueda__lista">
              {resultadosFiltrados.map((resultado) => (
                <TarjetaResultadoViaje key={resultado.id} resultado={resultado}
                  esMasEconomico={resultado.id === idMasEconomico} alSeleccionar={manejarSeleccion} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
