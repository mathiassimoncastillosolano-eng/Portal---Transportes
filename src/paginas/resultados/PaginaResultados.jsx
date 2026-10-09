import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BuscadorViajes } from '../../componentes/viajes/BuscadorViajes'
import { TarjetaResultadoViaje } from '../../componentes/viajes/TarjetaResultadoViaje'
import { FiltrosResultados } from '../../componentes/viajes/FiltrosResultados'
import { PanelAsincrono } from '../../componentes/carga'
import { useBusqueda } from '../../hooks/useBusqueda'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useModalesAutenticacion } from '../../layouts/LayoutPrincipal'
import { ModalExpiracionReserva } from '../../componentes/reserva/ModalExpiracionReserva'
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
  const horario = parametrosUrl.get('horario') ?? 'cualquiera'
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState(new Set())
  const buscadorRef = useRef(null)

  useEffect(() => {
    if (!origen && !destino && !fecha) { navegar('/', { replace: true }); return }
    if (criterios?.origen !== origen || criterios?.destino !== destino ||
        criterios?.fecha !== fecha || criterios?.horario !== horario) {
      ejecutarBusqueda({ origen, destino, fecha, horario })
    }
  }, [origen, destino, fecha, horario, criterios, ejecutarBusqueda, navegar])

  useEffect(() => { setServiciosSeleccionados(new Set()) }, [origen, destino, fecha])

  function manejarBuscar(parametros) {
    setServiciosSeleccionados(new Set())
    setParametrosUrl(parametros)
    ejecutarBusqueda({ ...parametros, horario: 'cualquiera' })
  }
  function cambiarHorario(nuevoHorario) {
    setParametrosUrl({ origen, destino, fecha, horario: nuevoHorario })
  }
  function manejarSeleccion(resultado) {
    if (!estaAutenticado) { abrirInicioSesion(); return }
    navegar('/reservar', { state: { resultado, fecha: resultado.fechaSalida } })
  }
  function alternarServicio(servicio) {
    setServiciosSeleccionados((anterior) => {
      const copia = new Set(anterior)
      if (servicio === null) return new Set()
      if (copia.has(servicio)) copia.delete(servicio)
      else copia.add(servicio)
      return copia
    })
  }
  function modificarBusqueda() {
    const bloque = buscadorRef.current
    bloque?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    bloque?.querySelector('button, input')?.focus({ preventScroll: true })
  }
  function limpiarFiltros() {
    setServiciosSeleccionados(new Set())
    cambiarHorario('cualquiera')
  }

  const serviciosDisponibles = useMemo(
    () => Array.from(new Set([...resultados.map((r) => r.tipoBus), ...serviciosSeleccionados])),
    [resultados, serviciosSeleccionados],
  )
  const resultadosFiltrados = useMemo(
    () => resultados.filter((r) => serviciosSeleccionados.size === 0 || serviciosSeleccionados.has(r.tipoBus)),
    [resultados, serviciosSeleccionados],
  )
  const disponibles = resultadosFiltrados.filter((r) => r.estado !== 'agotado' && r.precio != null)
  const idMasEconomico = disponibles.length
    ? disponibles.reduce((menor, r) => r.precio < menor.precio ? r : menor).id : null
  const hayFiltrosActivos = horario !== 'cualquiera' || serviciosSeleccionados.size > 0
  // Entre cambiar la URL y que el efecto lance la búsqueda hay un render: se
  // trata como "cargando" para no mostrar un instante «sin viajes».
  const busquedaPendiente = Boolean(origen || destino || fecha) &&
    (criterios?.origen !== origen || criterios?.destino !== destino ||
     criterios?.fecha !== fecha || criterios?.horario !== horario)

  return (
    <section className="seccion contenedor pagina-resultados">
      <ModalExpiracionReserva />
      <div className="pagina-resultados__filtro" ref={buscadorRef}>
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
          <FiltrosResultados horario={horario} alCambiarHorario={cambiarHorario}
            serviciosDisponibles={serviciosDisponibles} serviciosSeleccionados={serviciosSeleccionados}
            alAlternarServicio={alternarServicio} hayFiltrosActivos={hayFiltrosActivos} alLimpiarFiltros={limpiarFiltros} />
          <PanelAsincrono
            variante="busqueda"
            origen={origen}
            destino={destino}
            cargando={buscando || busquedaPendiente}
            error={error}
            vacio={resultadosFiltrados.length === 0}
            alReintentar={() => ejecutarBusqueda({ origen, destino, fecha, horario })}
            estadoError={{ titulo: 'No pudimos consultar los viajes' }}
            estadoVacio={{
              titulo: `Sin viajes ${hayFiltrosActivos ? 'con estos filtros' : 'disponibles'}`,
              texto: hayFiltrosActivos
                ? 'No encontramos viajes con estos filtros. Prueba con otro horario o servicio.'
                : 'No encontramos viajes para esta búsqueda. Prueba con otra fecha.',
              accion: hayFiltrosActivos
                ? { texto: 'Limpiar filtros', alClick: limpiarFiltros }
                : { texto: 'Modificar búsqueda', alClick: modificarBusqueda },
            }}
          >
            <div className="resultados-busqueda__lista">
              {resultadosFiltrados.map((resultado) => (
                <TarjetaResultadoViaje key={resultado.id} resultado={resultado}
                  esMasEconomico={resultado.id === idMasEconomico} alSeleccionar={manejarSeleccion} />
              ))}
            </div>
          </PanelAsincrono>
        </div>
      </div>
    </section>
  )
}
