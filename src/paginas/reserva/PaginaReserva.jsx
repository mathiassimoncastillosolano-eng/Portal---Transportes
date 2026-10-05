import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { IndicadorProgreso } from '../../componentes/reserva/IndicadorProgreso'
import { InfoViajeCompacta } from '../../componentes/reserva/InfoViajeCompacta'
import { SelectorPiso } from '../../componentes/reserva/SelectorPiso'
import { MapaAsientosBus } from '../../componentes/reserva/MapaAsientosBus'
import { ResumenReserva } from '../../componentes/reserva/ResumenReserva'
import { GestorPasajeros } from '../../componentes/reserva/GestorPasajeros'
import { DATOS_PASAJERO_VACIOS, pasajeroEstaCompleto } from '../../componentes/reserva/FormularioPasajero'
import { PasarelaPago } from '../../componentes/reserva/PasarelaPago'
import {
  MENSAJES_ESTADO,
  VALORES_TARJETA_INICIALES,
  VALORES_YAPE_INICIALES,
  construirSolicitudPago,
  simularRespuestaPago,
  soloDigitos,
  validarPagoTarjeta,
  validarPagoYape,
} from '../../utilidades/pagoMercadoPago'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useBusqueda } from '../../hooks/useBusqueda'
import { generarMapaAsientos, MAXIMO_PASAJEROS_POR_COMPRA } from '../../servicios/viajesServicio'
import { formatearPrecio } from '../../utilidades/formato'
import './paginaReserva.css'

const TOPE_MAXIMO_YAPE = 2000

const VALIDADORES_PAGO = { tarjeta: validarPagoTarjeta, yape: validarPagoYape }

const TITULOS_PASO = {
  asiento: 'Selecciona tus asientos',
  pasajero: 'Datos de los pasajeros',
  pago: 'Pasarela de pago',
}

function claveAsiento(asiento) {
  return `${asiento.piso}-${asiento.numero}`
}

function nombreCortoPasajero(datos) {
  const apellido = datos?.apellidos?.trim()
  const nombre = datos?.nombres?.trim()
  if (!apellido && !nombre) return null
  if (!apellido) return nombre.split(' ')[0]
  return nombre ? `${apellido.split(' ')[0]}, ${nombre[0]}.` : apellido
}

export function PaginaReserva() {
  const { state } = useLocation()
  const navegar = useNavigate()
  const { usuario } = useAutenticacion()
  const { criterios } = useBusqueda()

  const [pasoActual, setPasoActual] = useState('asiento')
  const [pisoActivo, setPisoActivo] = useState(1)
  const [asientosSeleccionados, setAsientosSeleccionados] = useState([])
  const [pasajeros, setPasajeros] = useState({})
  const [claveActivaPasajero, setClaveActivaPasajero] = useState(null)

  const [metodoPago, setMetodoPago] = useState('tarjeta')
  const [datosPago, setDatosPago] = useState(() => ({
    tarjeta: { ...VALORES_TARJETA_INICIALES },
    yape: { ...VALORES_YAPE_INICIALES },
  }))
  const [erroresPago, setErroresPago] = useState({})
  const [camposTocadosPago, setCamposTocadosPago] = useState({})
  const [pagando, setPagando] = useState(false)
  const [respuestaPago, setRespuestaPago] = useState(null)
  const pagoCompletado = respuestaPago?.status === 'approved' || respuestaPago?.status === 'in_process'

  // La sesión puede cargar después del primer render: completa el correo y el
  // celular con los del usuario solo si el comprador aún no los escribió.
  useEffect(() => {
    if (!usuario) return
    const celularUsuario = soloDigitos(usuario.telefono).slice(-9)
    setDatosPago((anterior) => ({
      tarjeta: { ...anterior.tarjeta, correo: anterior.tarjeta.correo || usuario.correo || '' },
      yape: {
        ...anterior.yape,
        correo: anterior.yape.correo || usuario.correo || '',
        celular: anterior.yape.celular || (/^9\d{8}$/.test(celularUsuario) ? celularUsuario : ''),
      },
    }))
  }, [usuario])

  const mapaAsientos = useMemo(
    () => (state?.resultado ? generarMapaAsientos(state.resultado) : null),
    [state?.resultado],
  )

  if (!state?.resultado || !state?.fecha) {
    return <Navigate to="/" replace />
  }

  const { resultado, fecha } = state
  const mostrarPiso = mapaAsientos.pisos > 1
  const pisoInfo = mapaAsientos.mapaPorPiso[pisoActivo]

  const numerosSeleccionadosPisoActivo = new Set(
    asientosSeleccionados.filter((asiento) => asiento.piso === pisoActivo).map((asiento) => asiento.numero),
  )
  const limiteAlcanzado = asientosSeleccionados.length >= MAXIMO_PASAJEROS_POR_COMPRA

  const recargoTotal = asientosSeleccionados.reduce((total, asiento) => total + (asiento.precioAdicional ?? 0), 0)
  const precioTotal = resultado.precio * asientosSeleccionados.length + recargoTotal

  const pasajerosCompletos =
    asientosSeleccionados.length > 0 &&
    asientosSeleccionados.every((asiento) => pasajeroEstaCompleto(pasajeros[claveAsiento(asiento)]))

  function manejarSeleccionAsiento(asientoDelMapa) {
    const clave = `${pisoActivo}-${asientoDelMapa.numero}`
    const yaSeleccionado = asientosSeleccionados.some((asiento) => asiento.clave === clave)

    if (yaSeleccionado) {
      setAsientosSeleccionados((anterior) => anterior.filter((asiento) => asiento.clave !== clave))
      setPasajeros((anterior) => {
        const copia = { ...anterior }
        delete copia[clave]
        return copia
      })
      return
    }

    if (limiteAlcanzado) return

    setAsientosSeleccionados((anterior) => [
      ...anterior,
      {
        clave,
        numero: asientoDelMapa.numero,
        piso: pisoActivo,
        tipo: asientoDelMapa.tipo,
        precioAdicional: asientoDelMapa.precioAdicional,
      },
    ])
  }

  function irAPasajeros() {
    if (asientosSeleccionados.length === 0) return

    setPasajeros((anterior) => {
      const copia = { ...anterior }
      asientosSeleccionados.forEach((asiento) => {
        if (!copia[asiento.clave]) copia[asiento.clave] = { ...DATOS_PASAJERO_VACIOS }
      })
      return copia
    })

    const siguienteActiva = asientosSeleccionados.some((asiento) => asiento.clave === claveActivaPasajero)
      ? claveActivaPasajero
      : asientosSeleccionados[0].clave
    setClaveActivaPasajero(siguienteActiva)
    setPasoActual('pasajero')
  }

  function manejarCambiarCampoPasajero(clave, campo, valor) {
    setPasajeros((anterior) => ({
      ...anterior,
      [clave]: { ...(anterior[clave] ?? DATOS_PASAJERO_VACIOS), [campo]: valor },
    }))
  }

  function manejarEliminarTicket(clave) {
    const restantes = asientosSeleccionados.filter((asiento) => asiento.clave !== clave)
    setAsientosSeleccionados(restantes)
    setPasajeros((anterior) => {
      const copia = { ...anterior }
      delete copia[clave]
      return copia
    })

    if (restantes.length === 0) {
      setPasoActual('asiento')
      setClaveActivaPasajero(null)
      return
    }

    if (claveActivaPasajero === clave) {
      setClaveActivaPasajero(restantes[0].clave)
    }
  }

  function manejarCambiarAsientos() {
    setPasoActual('asiento')
  }

  function manejarCambiarMetodoPago(metodo) {
    setMetodoPago(metodo)
    setErroresPago({})
    setCamposTocadosPago({})
    setRespuestaPago(null)
  }

  function manejarCambiarCampoPago(campo, valor) {
    const valoresMetodo = { ...datosPago[metodoPago], [campo]: valor }
    setDatosPago((anterior) => ({ ...anterior, [metodoPago]: valoresMetodo }))
    setErroresPago(VALIDADORES_PAGO[metodoPago](valoresMetodo))
  }

  function manejarTocarCampoPago(campo) {
    setCamposTocadosPago((anterior) => ({ ...anterior, [campo]: true }))
    setErroresPago(VALIDADORES_PAGO[metodoPago](datosPago[metodoPago]))
  }

  function manejarPago() {
    const valores = datosPago[metodoPago]
    const errores = VALIDADORES_PAGO[metodoPago](valores)
    setErroresPago(errores)
    setCamposTocadosPago(Object.fromEntries(Object.keys(valores).map((campo) => [campo, true])))
    if (Object.keys(errores).length > 0) return
    if (metodoPago === 'yape' && precioTotal > TOPE_MAXIMO_YAPE) return

    // Este es el cuerpo que recibirá POST /api/pagos (T-33). En producción el
    // token lo genera MercadoPago.js a partir de los datos de la tarjeta (o del
    // celular + código de Yape); aquí usamos uno ficticio.
    const solicitud = construirSolicitudPago({
      metodo: metodoPago,
      valores,
      token: `demo_${Date.now()}`,
      monto: precioTotal,
      descripcion: `Pasaje ${resultado.origen} - ${resultado.destino} (${asientosSeleccionados.length})`,
      referencia: `RL-${resultado.id ?? 'viaje'}-${fecha}`,
    })
    console.info('[Pago demo] Solicitud para POST /api/pagos:', solicitud)

    setRespuestaPago(null)
    setPagando(true)
    setTimeout(() => {
      setPagando(false)
      setRespuestaPago(simularRespuestaPago(metodoPago, valores))
    }, 1400)
  }

  function volverAlPasoAnterior() {
    if (pasoActual === 'pasajero') setPasoActual('asiento')
    else if (pasoActual === 'pago') setPasoActual('pasajero')
    else if (criterios) {
      const consulta = new URLSearchParams(criterios).toString()
      navegar(`/resultados?${consulta}`)
    } else {
      navegar('/resultados')
    }
  }

  // --- Contenido dinámico del panel lateral, según el paso activo ---
  let filasDetalle = []
  let textoBoton = 'Continuar'
  let deshabilitadoBoton = true
  let mensajeAyuda

  if (pasoActual === 'asiento') {
    const cantidad = asientosSeleccionados.length
    filasDetalle =
      cantidad > 0
        ? [
            { etiqueta: 'Precio', valor: `${formatearPrecio(resultado.precio)} × ${cantidad}` },
            ...(recargoTotal > 0 ? [{ etiqueta: 'Asientos preferenciales', valor: `+${formatearPrecio(recargoTotal)}` }] : []),
          ]
        : [{ etiqueta: 'Servicio', valor: resultado.tipoBus }, { etiqueta: 'Precio base', valor: formatearPrecio(resultado.precio) }]
    textoBoton = cantidad > 0 ? `Continuar con ${cantidad} pasajero${cantidad === 1 ? '' : 's'} →` : 'Selecciona un asiento'
    deshabilitadoBoton = cantidad === 0
    mensajeAyuda = 'Selecciona al menos un asiento disponible para continuar.'
  } else if (pasoActual === 'pasajero') {
    const asientoActivo = asientosSeleccionados.find((asiento) => asiento.clave === claveActivaPasajero)
    filasDetalle = [
      ...(asientoActivo ? [{ etiqueta: 'Asiento activo', valor: asientoActivo.numero }] : []),
      { etiqueta: 'Servicio', valor: resultado.tipoBus },
      ...(mostrarPiso && asientoActivo ? [{ etiqueta: 'Piso', valor: `Piso ${asientoActivo.piso}` }] : []),
      ...(asientoActivo
        ? [{ etiqueta: 'Precio de este asiento', valor: formatearPrecio(resultado.precio + (asientoActivo.precioAdicional ?? 0)) }]
        : []),
    ]
    textoBoton = pasajerosCompletos ? 'Continuar al pago →' : 'Completa los datos de todos los pasajeros'
    deshabilitadoBoton = !pasajerosCompletos
  } else if (pasoActual === 'pago') {
    const nombres = asientosSeleccionados
      .map((asiento) => nombreCortoPasajero(pasajeros[asiento.clave]))
      .filter(Boolean)
    const resumenNombres =
      nombres.length <= 2 ? nombres.join(' · ') : `${nombres.slice(0, 2).join(' · ')} y ${nombres.length - 2} más`
    filasDetalle = [
      { etiqueta: 'Servicio', valor: resultado.tipoBus },
      { etiqueta: 'Pasajeros', valor: resumenNombres || `${asientosSeleccionados.length}` },
    ]
    const excedeTopeYape = metodoPago === 'yape' && precioTotal > TOPE_MAXIMO_YAPE
    filasDetalle.push({ etiqueta: 'Medio de pago', valor: metodoPago === 'yape' ? 'Yape' : 'Tarjeta' })
    if (metodoPago === 'tarjeta' && datosPago.tarjeta.cuotas > 1) {
      filasDetalle.push({ etiqueta: 'Cuotas', valor: `${datosPago.tarjeta.cuotas}` })
    }
    if (respuestaPago?.status === 'approved') textoBoton = 'Pago aprobado ✓'
    else if (respuestaPago?.status === 'in_process') textoBoton = 'Pago en proceso'
    else if (respuestaPago?.status === 'rejected') textoBoton = 'Reintentar pago'
    else textoBoton = `Pagar ${formatearPrecio(precioTotal)}`
    deshabilitadoBoton = pagoCompletado || excedeTopeYape
  }

  return (
    <section className="pagina-reserva seccion contenedor">
      <IndicadorProgreso pasoActual={pasoActual} />

      <div className="pagina-reserva__encabezado">
        <button type="button" className="pagina-reserva__volver" onClick={volverAlPasoAnterior}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2 3.5 7 9 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
        <h1 className="pagina-reserva__titulo">{TITULOS_PASO[pasoActual]}</h1>
      </div>

      <div className="pagina-reserva__cuerpo">
        <div className="pagina-reserva__contenido">
          {pasoActual === 'asiento' && (
            <>
              <InfoViajeCompacta resultado={resultado} fecha={fecha} />
              <SelectorPiso
                pisos={mapaAsientos.pisos}
                pisoActivo={pisoActivo}
                alCambiarPiso={setPisoActivo}
                mapaPorPiso={mapaAsientos.mapaPorPiso}
              />
              {limiteAlcanzado && (
                <p className="pagina-reserva__aviso-tope" role="status">
                  Alcanzaste el máximo de {MAXIMO_PASAJEROS_POR_COMPRA} pasajeros por compra. Quita un asiento para elegir otro.
                </p>
              )}
              <MapaAsientosBus
                asientos={pisoInfo.asientos}
                filas={pisoInfo.filas}
                numerosSeleccionados={numerosSeleccionadosPisoActivo}
                limiteAlcanzado={limiteAlcanzado}
                onSeleccionar={manejarSeleccionAsiento}
              />
            </>
          )}

          {pasoActual === 'pasajero' && (
            <GestorPasajeros
              asientos={asientosSeleccionados}
              mostrarPiso={mostrarPiso}
              pasajeros={pasajeros}
              claveActiva={claveActivaPasajero}
              alActivar={setClaveActivaPasajero}
              alCambiarCampo={manejarCambiarCampoPasajero}
              alEliminar={manejarEliminarTicket}
              alCambiarAsientos={manejarCambiarAsientos}
            />
          )}

          {pasoActual === 'pago' && (
            <>
              {respuestaPago && (
                <div
                  className={`pagina-reserva__pago-estado pagina-reserva__pago-estado--${respuestaPago.status}`}
                  role={respuestaPago.status === 'rejected' ? 'alert' : 'status'}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <circle cx="9" cy="9" r="8.2" stroke="currentColor" strokeWidth="1.5" />
                    {respuestaPago.status === 'rejected' ? (
                      <path d="M6.2 6.2l5.6 5.6M11.8 6.2l-5.6 5.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    ) : (
                      <path d="M5.2 9.3 7.7 11.8 12.8 6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    )}
                  </svg>
                  <span>
                    {MENSAJES_ESTADO[respuestaPago.status_detail]}
                    <small> Pago de demostración, no se realizó ningún cobro.</small>
                  </span>
                </div>
              )}
              <PasarelaPago
                metodo={metodoPago}
                alCambiarMetodo={manejarCambiarMetodoPago}
                valoresTarjeta={datosPago.tarjeta}
                valoresYape={datosPago.yape}
                errores={erroresPago}
                camposTocados={camposTocadosPago}
                alCambiarCampo={manejarCambiarCampoPago}
                alTocarCampo={manejarTocarCampoPago}
                total={precioTotal}
                bloqueado={pagando || pagoCompletado}
              />
            </>
          )}
        </div>

        <ResumenReserva
          resultado={resultado}
          fecha={fecha}
          asientosSeleccionados={asientosSeleccionados}
          mostrarPiso={mostrarPiso}
          filasDetalle={filasDetalle}
          precioTotal={asientosSeleccionados.length > 0 ? precioTotal : undefined}
          textoBoton={textoBoton}
          onContinuar={pasoActual === 'asiento' ? irAPasajeros : pasoActual === 'pasajero' ? () => pasajerosCompletos && setPasoActual('pago') : manejarPago}
          deshabilitado={deshabilitadoBoton}
          cargando={pagando}
          mensajeAyuda={mensajeAyuda}
        />
      </div>
    </section>
  )
}
