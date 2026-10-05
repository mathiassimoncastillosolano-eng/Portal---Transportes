import { useEffect, useMemo, useRef, useState } from 'react'
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
  obtenerMapaAsientosViaje,
  obtenerOCrearSesion,
  borrarSesionAsientos,
  bloquearAsiento,
  liberarAsiento,
  abrirEventosAsientos,
} from '../../servicios/viajesServicio'
import { formatearPrecio } from '../../utilidades/formato'
import './paginaReserva.css'
import { Contador } from '../../componentes/reserva/Contador'

const TITULOS_PASO = {
  asiento: 'Selecciona tus asientos',
  pasajero: 'Datos de los pasajeros',
  pago: 'Pasarela de pago',
}

const CLAVE_CONTEXTO = 'rutalibre:reserva-contexto'

function leerContextoGuardado() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_CONTEXTO)
    return crudo ? JSON.parse(crudo) : null
  } catch {
    return null
  }
}

function guardarContexto(contexto) {
  try {
    sessionStorage.setItem(CLAVE_CONTEXTO, JSON.stringify(contexto))
  } catch {
    // no bloqueante
  }
}

function borrarContexto() {
  try {
    sessionStorage.removeItem(CLAVE_CONTEXTO)
  } catch {
    // no bloqueante
  }
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
    const contexto = useMemo(() => {
    const guardado = leerContextoGuardado()
    if (state?.resultado && state?.fecha) {
      return {
        resultado: state.resultado,
        fecha: state.fecha,
        criterios: criterios ?? guardado?.criterios ?? null,
      }
    }
    return guardado
  }, [state, criterios])

  const idViaje = contexto?.resultado?.id

  useEffect(() => {
    if (contexto) guardarContexto(contexto)
  }, [contexto])
  const [pasoActual, setPasoActual] = useState('asiento')
  const [pisoActivo, setPisoActivo] = useState(1)
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
  const [errorBloqueo, setErrorBloqueo] = useState(null)

  // Sesión de reserva: { tokenSesion, expiraEn (ms, timestamp) }.
  const [sesion, setSesion] = useState(null)
  const sesionRef = useRef(null)
  const operandoRef = useRef(new Set()) // idAsiento -> promesa de la última operación

  // La selección SIEMPRE se deriva del mapa: asientos con esMio = true.
  const asientosSeleccionados = useMemo(() => {
    if (!mapaAsientos) return []
    const lista = []
    Object.values(mapaAsientos.mapaPorPiso).forEach((info) => {
      info.asientos.forEach((asiento) => {
        if (asiento.esMio) {
          lista.push({
            clave: claveAsiento(asiento),
            numero: asiento.numero,
            idAsiento: asiento.idAsiento,
            piso: asiento.piso,
            precio: asiento.precio,
          })
        }
      })
    })
    return lista
  }, [mapaAsientos])

  function irAResultados(estado) {
    const criteriosEfectivos = criterios ?? contexto?.criterios
    if (criteriosEfectivos) {
      const consulta = new URLSearchParams(criteriosEfectivos).toString()
      navegar(`/resultados?${consulta}`, { state: estado })
    } else {
      navegar('/resultados', { state: estado })
    }
  }

  async function manejarSesionVencida() {
    borrarSesionAsientos(idViaje)
    borrarContexto()
    try {
      // Fuerza al backend a liberar los bloqueos vencidos de este viaje.
      await obtenerMapaAsientosViaje(idViaje)
    } catch {
      // no bloqueante: igual se redirige
    }
    irAResultados({ sesionExpirada: true })
  }

  async function cargarMapaAsientos(silencioso = false) {
    const token = sesionRef.current?.tokenSesion
    if (!silencioso) setCargandoMapa(true)
    if (!silencioso) setErrorMapa(null)
    try {
      const mapa = await obtenerMapaAsientosViaje(idViaje, token)
      setMapaAsientos(mapa)
    } catch (error) {
      if (!silencioso) setErrorMapa(error.message)
    } finally {
      setCargandoMapa(false)
    }
  }

  // Actualiza un asiento del mapa local (respuesta propia o evento SSE).
  function actualizarAsientoLocal(idAsiento, cambiosOFuncion) {
    setMapaAsientos((anterior) => {
      if (!anterior) return anterior
      const mapaPorPiso = {}
      Object.entries(anterior.mapaPorPiso).forEach(([piso, info]) => {
        mapaPorPiso[piso] = {
          ...info,
          asientos: info.asientos.map((asiento) => {
            if (asiento.idAsiento !== idAsiento) return asiento
            const cambios = typeof cambiosOFuncion === 'function' ? cambiosOFuncion(asiento) : cambiosOFuncion
            return { ...asiento, ...cambios }
          }),
        }
      })
      return { ...anterior, mapaPorPiso }
    })
  }

  function aplicarEventoAsiento({ idAsiento, estado }) {
    // El evento no dice de quién es el bloqueo: si se libera, ya no es mío;
    // en los demás casos conservo lo que ya sabía.
    actualizarAsientoLocal(idAsiento, (asiento) => ({
      estado,
      esMio: estado === 'disponible' ? false : asiento.esMio,
    }))
  }

  // Sesión + mapa + tiempo real
  useEffect(() => {
    if (!idViaje) return undefined
    let cancelado = false
    let cerrarEventos = () => {}

    async function iniciar() {
      try {
        const nuevaSesion = await obtenerOCrearSesion(idViaje)
        if (cancelado) return
        sesionRef.current = nuevaSesion
        setSesion(nuevaSesion)
        await cargarMapaAsientos()
        if (cancelado) return
        cerrarEventos = abrirEventosAsientos(idViaje, {
          alAbrir: () => cargarMapaAsientos(true), // al abrir y en cada reconexión
          alAsiento: aplicarEventoAsiento,
        })
      } catch (error) {
        if (cancelado) return
        setErrorMapa(error.message)
        setCargandoMapa(false)
      }
    }

    iniciar()
    return () => {
      cancelado = true
      cerrarEventos()
    }
  }, [idViaje])

  // Al vencer la sesión: liberar (lo hace el backend) y redirigir a resultados.
  // Si el pago ya se completó no se agenda (o se cancela) el vencimiento.
  useEffect(() => {
    if (!sesion || pagoCompletado) return undefined
    const restante = Math.max(sesion.expiraEn - Date.now(), 0)
    const temporizador = setTimeout(manejarSesionVencida, restante)
    return () => clearTimeout(temporizador)
  }, [sesion, pagoCompletado])

  // Si pierdo todos los asientos (p. ej. expiraron) estando en otro paso, vuelvo a elegir.
  useEffect(() => {
    if (mapaAsientos && pasoActual !== 'asiento' && asientosSeleccionados.length === 0) {
      setPasoActual('asiento')
      setClaveActivaPasajero(null)
    }
  }, [mapaAsientos, pasoActual, asientosSeleccionados.length])

    if (!contexto) {
    return <Navigate to="/" replace />
  }

  if (cargandoMapa) {
    return <p className="pagina-reserva__estado">Cargando disponibilidad de asientos…</p>
  }

  if (errorMapa) {
    return <p className="pagina-reserva__estado pagina-reserva__estado--error">{errorMapa}</p>
  }

  const { resultado, fecha } = contexto
  const mostrarPiso = mapaAsientos.pisos > 1
  const pisoInfo = mapaAsientos.mapaPorPiso[pisoActivo]

  if (!pisoInfo) {
    return <p className="pagina-reserva__estado pagina-reserva__estado--error">Este viaje no tiene asientos configurados.</p>
  }

  const limiteAlcanzado = asientosSeleccionados.length >= MAXIMO_PASAJEROS_POR_COMPRA
  const precioTotal = asientosSeleccionados.reduce((total, asiento) => total + (asiento.precio ?? 0), 0)

  const pasajerosCompletos =
    asientosSeleccionados.length > 0 &&
    asientosSeleccionados.every((asiento) => pasajeroEstaCompleto(pasajeros[asiento.clave]))

  function quitarDatosPasajero(clave) {
    setPasajeros((anterior) => {
      const copia = { ...anterior }
      delete copia[clave]
      return copia
    })
  }

    // Clic en un asiento: la pantalla cambia al instante y el servidor confirma después.
  async function manejarSeleccionAsiento(asientoDelMapa) {
    const token = sesionRef.current?.tokenSesion
    const { idAsiento } = asientoDelMapa
    if (!token || operandoRef.current.has(idAsiento)) return

    operandoRef.current.add(idAsiento)
    setErrorBloqueo(null)
    try {
      if (asientoDelMapa.esMio) {
        await liberarAsiento(idViaje, idAsiento, token)
        actualizarAsientoLocal(idAsiento, { estado: 'disponible', esMio: false })
        quitarDatosPasajero(`${asientoDelMapa.piso}-${asientoDelMapa.numero}`)
      } else {
        if (limiteAlcanzado) return
        await bloquearAsiento(idViaje, idAsiento, token)
        actualizarAsientoLocal(idAsiento, { estado: 'bloqueado', esMio: true })
      }
    } catch (error) {
      if (error.status === 410 || error.status === 401) {
        manejarSesionVencida()
      } else if (error.status === 409) {
        setErrorBloqueo(
          limiteAlcanzado
            ? `Alcanzaste el máximo de ${MAXIMO_PASAJEROS_POR_COMPRA} pasajeros por compra.`
            : 'Ese asiento ya fue tomado por otro cliente. Elige otro.',
        )
        cargarMapaAsientos(true)
      } else {
        setErrorBloqueo(error.message)
        cargarMapaAsientos(true)
      }
    } finally {
      operandoRef.current.delete(idAsiento)
    }
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

  async function manejarEliminarTicket(clave) {
    const asiento = asientosSeleccionados.find((a) => a.clave === clave)
    const restantes = asientosSeleccionados.filter((a) => a.clave !== clave)
    quitarDatosPasajero(clave)

    if (asiento && sesionRef.current) {
      try {
        await liberarAsiento(idViaje, asiento.idAsiento, sesionRef.current.tokenSesion)
        actualizarAsientoLocal(asiento.idAsiento, { estado: 'disponible', esMio: false })
      } catch (error) {
        if (error.status === 410 || error.status === 401) {
          manejarSesionVencida()
          return
        }
        cargarMapaAsientos(true)
      }
    }

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

  // Ya no se bloquea aquí: los asientos se bloquearon al hacer clic.
  function confirmarPasajerosYContinuar() {
    if (!pasajerosCompletos) return
    setErrorBloqueo(null)
    setPasoActual('pago')
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

  async function volverAlPasoAnterior() {
    if (pasoActual === 'pasajero') setPasoActual('asiento')
    else if (pasoActual === 'pago') setPasoActual('pasajero')
    else {
      const token = sesionRef.current?.tokenSesion
      if (token) {
        await Promise.all(
          asientosSeleccionados.map((asiento) =>
            liberarAsiento(idViaje, asiento.idAsiento, token).catch(() => {}),
          ),
        )
      }
      borrarSesionAsientos(idViaje)
      borrarContexto()
      irAResultados()
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
        <Contador expiraEn={sesion?.expiraEn} pausado={pagoCompletado} />
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
          cargando={pasoActual === 'pago' ? pagando : false}
          mensajeAyuda={mensajeAyuda}
        />
      </div>
    </section>
  )
}