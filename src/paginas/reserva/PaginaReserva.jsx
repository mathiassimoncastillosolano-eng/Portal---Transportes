import { useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { IndicadorProgreso } from '../../componentes/reserva/IndicadorProgreso'
import { InfoViajeCompacta } from '../../componentes/reserva/InfoViajeCompacta'
import { SelectorPiso } from '../../componentes/reserva/SelectorPiso'
import { MapaAsientosBus } from '../../componentes/reserva/MapaAsientosBus'
import { ResumenReserva } from '../../componentes/reserva/ResumenReserva'
import { GestorPasajeros } from '../../componentes/reserva/GestorPasajeros'
import { DATOS_PASAJERO_VACIOS, pasajeroEstaCompleto } from '../../componentes/reserva/FormularioPasajero'
import { PasarelaPago, VALORES_PAGO_INICIALES, validarPago } from '../../componentes/reserva/PasarelaPago'
import { useAutenticacion } from '../../hooks/useAutenticacion'
import { useBusqueda } from '../../hooks/useBusqueda'
import {
  MAXIMO_PASAJEROS_POR_COMPRA,
  ID_VIAJE_PRUEBA,
  obtenerMapaAsientosViaje,
  bloquearAsiento,
  liberarAsiento,
} from '../../servicios/viajesServicio'
import { formatearPrecio } from '../../utilidades/formato'
import './paginaReserva.css'

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

  const [datosPago, setDatosPago] = useState(VALORES_PAGO_INICIALES)
  const [erroresPago, setErroresPago] = useState({})
  const [camposTocadosPago, setCamposTocadosPago] = useState({})
  const [metodoPago, setMetodoPago] = useState('tarjeta')
  const [pagando, setPagando] = useState(false)
  const [pagoCompletado, setPagoCompletado] = useState(false)

  const [mapaAsientos, setMapaAsientos] = useState(null)
  const [cargandoMapa, setCargandoMapa] = useState(true)
  const [errorMapa, setErrorMapa] = useState(null)
  const [tokensBloqueo, setTokensBloqueo] = useState({}) // clave -> tokenBloqueo
  const [bloqueando, setBloqueando] = useState(false)
  const [errorBloqueo, setErrorBloqueo] = useState(null)

  async function cargarMapaAsientos() {
    setCargandoMapa(true)
    setErrorMapa(null)
    try {
      const mapa = await obtenerMapaAsientosViaje(ID_VIAJE_PRUEBA)
      setMapaAsientos(mapa)
    } catch (error) {
      setErrorMapa(error.message)
    } finally {
      setCargandoMapa(false)
    }
  }

  useEffect(() => {
    cargarMapaAsientos()
  }, [])

  if (!state?.resultado || !state?.fecha) {
    return <Navigate to="/" replace />
  }

  if (cargandoMapa) {
    return <p className="pagina-reserva__estado">Cargando disponibilidad de asientos…</p>
  }

  if (errorMapa) {
    return <p className="pagina-reserva__estado pagina-reserva__estado--error">{errorMapa}</p>
  }

  const { resultado, fecha } = state
  const mostrarPiso = mapaAsientos.pisos > 1
  const pisoInfo = mapaAsientos.mapaPorPiso[pisoActivo]

  const numerosSeleccionadosPisoActivo = new Set(
    asientosSeleccionados.filter((asiento) => asiento.piso === pisoActivo).map((asiento) => asiento.numero),
  )
  const limiteAlcanzado = asientosSeleccionados.length >= MAXIMO_PASAJEROS_POR_COMPRA

  const precioTotal = asientosSeleccionados.reduce((total, asiento) => total + (asiento.precio ?? 0), 0)

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
        idAsiento: asientoDelMapa.idAsiento,
        piso: pisoActivo,
        precio: asientoDelMapa.precio,
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
    const token = tokensBloqueo[clave]
    const asiento = asientosSeleccionados.find((a) => a.clave === clave)
    if (token && asiento) {
      liberarAsiento(ID_VIAJE_PRUEBA, asiento.idAsiento, token)
    }

    const restantes = asientosSeleccionados.filter((a) => a.clave !== clave)
    setAsientosSeleccionados(restantes)
    setPasajeros((anterior) => {
      const copia = { ...anterior }
      delete copia[clave]
      return copia
    })
    setTokensBloqueo((anterior) => {
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

  async function confirmarPasajerosYContinuar() {
    if (!pasajerosCompletos) return

    setBloqueando(true)
    setErrorBloqueo(null)

    const nuevosTokens = {}
    try {
      for (const asiento of asientosSeleccionados) {
        const resultadoBloqueo = await bloquearAsiento(ID_VIAJE_PRUEBA, asiento.idAsiento, pasajeros[asiento.clave])
        nuevosTokens[asiento.clave] = resultadoBloqueo.tokenBloqueo
      }
      setTokensBloqueo((anterior) => ({ ...anterior, ...nuevosTokens }))
      setPasoActual('pago')
    } catch (error) {
      await Promise.all(
        Object.entries(nuevosTokens).map(([clave, token]) => {
          const asientoFallido = asientosSeleccionados.find((a) => a.clave === clave)
          return asientoFallido ? liberarAsiento(ID_VIAJE_PRUEBA, asientoFallido.idAsiento, token) : null
        }),
      )
      setErrorBloqueo(
        error.status === 409
          ? 'Uno de tus asientos ya fue tomado por otro cliente. Elige otro asiento.'
          : error.message,
      )
      setPasoActual('asiento')
      cargarMapaAsientos()
    } finally {
      setBloqueando(false)
    }
  }

  function manejarCambiarCampoPago(campo, valor) {
    setDatosPago((anterior) => ({ ...anterior, [campo]: valor }))
    if (camposTocadosPago[campo]) {
      setErroresPago(validarPago({ ...datosPago, [campo]: valor }))
    }
  }

  function manejarTocarCampoPago(campo) {
    setCamposTocadosPago((anterior) => ({ ...anterior, [campo]: true }))
    setErroresPago(validarPago(datosPago))
  }

  function manejarPago() {
    if (metodoPago === 'tarjeta') {
      const errores = validarPago(datosPago)
      setErroresPago(errores)
      setCamposTocadosPago({ numeroTarjeta: true, vencimiento: true, cvv: true, titular: true })
      if (Object.keys(errores).length > 0) return
    }

    setPagando(true)
    setTimeout(() => {
      setPagando(false)
      setPagoCompletado(true)
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
            { etiqueta: 'Asientos seleccionados', valor: `${cantidad}` },
            { etiqueta: 'Precio total', valor: formatearPrecio(precioTotal) },
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
        ? [{ etiqueta: 'Precio de este asiento', valor: formatearPrecio(asientoActivo.precio) }]
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
    textoBoton = pagoCompletado ? 'Pago simulado ✓' : `Pagar ${formatearPrecio(precioTotal)}`
    deshabilitadoBoton = pagoCompletado
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
              {pagoCompletado && (
                <div className="pagina-reserva__pago-exitoso" role="status">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <circle cx="9" cy="9" r="8.2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M5.2 9.3 7.7 11.8 12.8 6.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Pago de demostración procesado. Esta pantalla no realiza cobros reales.
                </div>
              )}
              <PasarelaPago
                valores={datosPago}
                errores={erroresPago}
                camposTocados={camposTocadosPago}
                alCambiarCampo={manejarCambiarCampoPago}
                alTocarCampo={manejarTocarCampoPago}
                metodo={metodoPago}
                alCambiarMetodo={setMetodoPago}
              />
            </>
          )}

          {errorBloqueo && (
            <p className="pagina-reserva__aviso-tope" role="alert">
              {errorBloqueo}
            </p>
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
          onContinuar={
            pasoActual === 'asiento'
              ? irAPasajeros
              : pasoActual === 'pasajero'
                ? confirmarPasajerosYContinuar
                : manejarPago
          }
          deshabilitado={deshabilitadoBoton}
          cargando={pasoActual === 'pasajero' ? bloqueando : pagando}
          mensajeAyuda={mensajeAyuda}
        />
      </div>
    </section>
  )

}
