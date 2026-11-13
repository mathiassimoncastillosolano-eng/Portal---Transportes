import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { FASES, usePostergacion } from '../../hooks/usePostergacion'
import { IndicadorProgreso } from '../../componentes/reserva/IndicadorProgreso'
import { ModalBase } from '../../componentes/comunes/ModalBase'
import { BotonPrincipal } from '../../componentes/comunes/BotonPrincipal'
import { BotonSecundario } from '../../componentes/comunes/BotonSecundario'
import { EstadoRuta, PanelAsincrono } from '../../componentes/carga'
import { TarjetaPasajeOriginal } from '../../componentes/postergacion/TarjetaPasajeOriginal'
import { Contador } from '../../componentes/reserva/Contador'
import { ResumenReprogramacion } from '../../componentes/reprogramacion/ResumenReprogramacion'
import { AvisoSesionVencida } from '../../componentes/reprogramacion/AvisoSesionVencida'
import { BarraAcciones } from '../../componentes/postergacion/BarraAcciones'
import { PasoNuevoViaje } from '../../componentes/postergacion/PasoNuevoViaje'
import { PasoAsiento } from '../../componentes/postergacion/PasoAsiento'
import { PasoTarifa } from '../../componentes/postergacion/PasoTarifa'
import { PasoPago } from '../../componentes/postergacion/PasoPago'
import { PantallaResultado } from '../../componentes/postergacion/PantallaResultado'
import { SelectorEscenarios } from '../../componentes/postergacion/SelectorEscenarios'
import { ESCENARIO_INICIAL } from '../../mock/postergacion/escenarios'
import { obtenerPasajeMock, registrarPasajeExterno } from '../../mock/postergacion/pasajes'
import { formatearPrecio } from '../../utilidades/formato'
import { puedeContinuarDesdeTarifa } from '../../utilidades/postergacion'
import '../../componentes/postergacion/postergacion.css'

const PASOS = [
  { clave: 'viaje', etiqueta: 'Nuevo viaje' },
  { clave: 'asiento', etiqueta: 'Asiento' },
  { clave: 'tarifa', etiqueta: 'Diferencia tarifaria' },
  { clave: 'confirmacion', etiqueta: 'Confirmación' },
]

const PASO_INDICADOR = {
  [FASES.VIAJE]: 'viaje',
  [FASES.ASIENTO]: 'asiento',
  [FASES.TARIFA]: 'tarifa',
  [FASES.PAGO]: 'tarifa',
  [FASES.CONFIRMANDO]: 'confirmacion',
}

const FASES_CON_RESUMEN = [FASES.ASIENTO, FASES.TARIFA, FASES.PAGO]
// Mientras el asiento está reservado se muestra el tiempo que queda para terminar.
const FASES_CON_CONTADOR = FASES_CON_RESUMEN
const ID_AYUDA_TARIFA = 'ayuda-aceptacion-tarifa'

function FlujoPostergacion({ pasajeInicial, idCliente }) {
  const navegar = useNavigate()
  const [pasaje] = useState(pasajeInicial)
  const [escenario, setEscenario] = useState(ESCENARIO_INICIAL)
  const [cancelando, setCancelando] = useState(false)
  const encabezadoRef = useRef(null)
  const primeraFase = useRef(true)
  const consumirEscenarioAsiento = useCallback(() => setEscenario((actual) => ({ ...actual, asiento: 'disponible' })), [])

  const { estado, acciones } = usePostergacion({
    pasaje,
    idCliente,
    escenario,
    alEscenarioConsumido: consumirEscenarioAsiento,
  })
  const { fase, viaje, asiento, comparacion, aceptaCondiciones, metodo, procesando, avisoPago, intentos, busqueda, versionMapa, resultado, sesion, sesionVencida } = estado

  useEffect(() => {
    if (primeraFase.current) {
      primeraFase.current = false
      return
    }
    encabezadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const frame = requestAnimationFrame(() => {
      document.querySelector('[data-foco-paso]')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [fase])

  const irAMisPasajes = () => navegar('/perfil/pasajes')

  function pedirCancelacion() {
    if (fase !== FASES.RESULTADO && fase !== FASES.VALIDANDO && viaje) setCancelando(true)
    else irAMisPasajes()
  }

  const enResultado = fase === FASES.RESULTADO
  const pasosVisibles = PASOS.map((paso) => (paso.clave === 'tarifa' && fase === FASES.PAGO ? { ...paso, etiqueta: 'Pago' } : paso))
  const indiceVisible = PASOS.findIndex((paso) => paso.clave === PASO_INDICADOR[fase])
  const puedeContinuarTarifa = comparacion ? puedeContinuarDesdeTarifa(comparacion, aceptaCondiciones) : false
  const textoTarifa = comparacion?.requierePago ? 'Continuar al pago' : 'Confirmar cambio'

  return (
    <section className="seccion contenedor pagina-postergacion">
      <header className="postergacion-encabezado" ref={encabezadoRef}>
        <div>
          <button type="button" className="postergacion-encabezado__volver" onClick={pedirCancelacion}>
            <span aria-hidden="true">←</span> Mis pasajes
          </button>
          <p className="postergacion-encabezado__eyebrow">CAMBIO DE FECHA</p>
          <h1 className="postergacion-encabezado__titulo">Cambia la fecha de tu viaje</h1>
        </div>
        {FASES_CON_CONTADOR.includes(fase) && <Contador expiraEn={sesion?.expiraEn} pausado={procesando} />}      </header>

      {!enResultado && <TarjetaPasajeOriginal pasaje={pasaje} />}

      {!enResultado && fase !== FASES.VALIDANDO && (
        <div className="postergacion-progreso">
          <IndicadorProgreso pasoActual={PASO_INDICADOR[fase]} pasos={pasosVisibles} etiqueta="Progreso del cambio de fecha" />
          <p className="postergacion-progreso__movil" aria-hidden="true">
            Paso {indiceVisible + 1} de {PASOS.length} · {pasosVisibles[indiceVisible]?.etiqueta}
          </p>
        </div>
      )}

      <div className={`postergacion-cuerpo${FASES_CON_RESUMEN.includes(fase) ? ' postergacion-cuerpo--con-resumen' : ''}`}>
        <div className="postergacion-principal" key={fase}>
          {fase === FASES.VALIDANDO && (
            <PanelAsincrono
              variante="procesamiento"
              mensaje="Verificando tu pasaje"
              detalle="Comprobamos que sea tuyo, esté vigente y cumpla la anticipación mínima."
              cargando
              compacto
            />
          )}

          {fase === FASES.VIAJE && (
            <>
              {sesionVencida && <AvisoSesionVencida />}
              <PasoNuevoViaje
                pasaje={pasaje}
                busqueda={busqueda}
                alGuardarBusqueda={acciones.guardarBusqueda}
                alElegir={acciones.elegirViaje}
              />
              <BarraAcciones alCancelar={pedirCancelacion} />
            </>
          )}

          {fase === FASES.ASIENTO && viaje && (
            <>
              <PasoAsiento
                pasaje={pasaje}
                viaje={viaje}
                versionMapa={versionMapa}
                alElegir={acciones.elegirAsiento}
                alGuardarSesion={acciones.guardarSesion}
                alSesionVencida={acciones.vencerSesion}
              />
              <BarraAcciones
                alVolver={acciones.volver}
                alCancelar={pedirCancelacion}
                alContinuar={acciones.continuarDesdeAsiento}
                textoContinuar="Continuar"
                deshabilitado={!asiento}
              />
            </>
          )}

          {fase === FASES.TARIFA && comparacion && (
            <>
              <PasoTarifa
                pasaje={pasaje}
                viaje={viaje}
                comparacion={comparacion}
                aceptaCondiciones={aceptaCondiciones}
                alAceptar={acciones.aceptarCondiciones}
                avisoPago={avisoPago}
              />
              <BarraAcciones
                alVolver={acciones.volver}
                alCancelar={pedirCancelacion}
                alContinuar={acciones.continuarDesdeTarifa}
                textoContinuar={textoTarifa}
                deshabilitado={!puedeContinuarTarifa}
                ayuda={comparacion.requiereAceptacion && !aceptaCondiciones ? 'Acepta la condición para continuar.' : undefined}
                idAyuda={ID_AYUDA_TARIFA}
              />
            </>
          )}

          {fase === FASES.PAGO && comparacion && (
            <>
              <PasoPago
                pasaje={pasaje}
                comparacion={comparacion}
                metodo={metodo}
                alCambiarMetodo={acciones.cambiarMetodo}
                procesando={procesando}
                avisoPago={avisoPago}
                intentos={intentos}
              />
              <BarraAcciones
                alVolver={acciones.volver}
                alCancelar={pedirCancelacion}
                alContinuar={acciones.pagar}
                textoContinuar={`${avisoPago ? 'Reintentar pago' : 'Pagar'} ${formatearPrecio(comparacion.montoAPagar, pasaje.moneda)}`}
                cargando={procesando}
                bloqueado={procesando}
              />
            </>
          )}

          {fase === FASES.CONFIRMANDO && (
            <PanelAsincrono
              variante="procesamiento"
              mensaje="Confirmando el cambio de fecha"
              detalle="Estamos actualizando tu pasaje. No cierres esta ventana."
              cargando
              compacto
            />
          )}

          {enResultado && resultado && (
            <PantallaResultado
              resultado={resultado}
              pasajeOriginal={pasaje}
              alIrAMisPasajes={irAMisPasajes}
              alReelegirAsiento={acciones.reelegirAsiento}
            />
          )}
        </div>

        {FASES_CON_RESUMEN.includes(fase) && (
          <aside className="postergacion-lateral">
            <ResumenReprogramacion pasaje={pasaje} viaje={viaje} asiento={asiento} />
          </aside>
        )}
      </div>

      {import.meta.env.DEV && (
        <SelectorEscenarios
          idCliente={idCliente}
          idPasajeActual={pasaje.idPasaje}
          escenario={escenario}
          alCambiarEscenario={setEscenario}
        />
      )}

      <ModalBase
        abierto={cancelando}
        alCerrar={() => setCancelando(false)}
        titulo="¿Cancelar el cambio de fecha?"
        subtitulo="Perderás el viaje y el asiento que elegiste. Tu pasaje original no cambia."
      >
        <div className="postergacion-modal__acciones">
          <BotonPrincipal onClick={() => setCancelando(false)}>Seguir con el cambio</BotonPrincipal>
          <BotonSecundario onClick={irAMisPasajes}>Sí, cancelar</BotonSecundario>
        </div>
      </ModalBase>
    </section>
  )
}

export function PaginaPostergarPasaje() {
  const { idPasaje } = useParams()
  const { state } = useLocation()
  const { usuario } = useAutenticacion()
  const idCliente = usuario?.id ?? 'cliente-mock'

  const externo = state?.pasaje && String(state.pasaje.idPasaje) === String(idPasaje) ? state.pasaje : null
  const pasaje = externo
    ? registrarPasajeExterno({ ...externo, idCliente }, idCliente)
    : obtenerPasajeMock(idPasaje, idCliente)

  if (!pasaje) {
    return (
      <section className="seccion contenedor pagina-postergacion">
        <EstadoRuta
          tipo="error"
          titulo="No encontramos este pasaje"
          texto="Vuelve a Mis pasajes y elige el pasaje al que quieres cambiarle la fecha."
          accion={{ texto: 'Ir a Mis pasajes', to: '/perfil/pasajes' }}
        />
      </section>
    )
  }

  return <FlujoPostergacion key={idPasaje} pasajeInicial={pasaje} idCliente={idCliente} />
}
