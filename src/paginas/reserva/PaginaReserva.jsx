import { useEffect, useMemo, useRef, useState } from 'react'
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
import {
  MENSAJE_DNI_REPETIDO,
  construirPasajerosApi,
  mapearErroresServidor,
} from '../../utilidades/validarPasajero'
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
  guardarPasajeros,
  confirmarCompraDemo,
} from '../../servicios/viajesServicio'
import { formatearPrecio } from '../../utilidades/formato'
import './paginaReserva.css'
import { Contador } from '../../componentes/reserva/Contador'
import { CargadorRutaLibre, EstadoRuta, useFaseCarga } from '../../componentes/carga'

const TOPE_MAXIMO_YAPE = 2000

const VALIDADORES_PAGO = { tarjeta: validarPagoTarjeta, yape: validarPagoYape }

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
  // Solo es true cuando el BACKEND confirmó la compra (pasajeros a la BD y asientos ocupados).
  const [compraConfirmada, setCompraConfirmada] = useState(false)
  const [confirmandoCompra, setConfirmandoCompra] = useState(false)
  const [errorConfirmacion, setErrorConfirmacion] = useState(null)
  const [guardandoPasajeros, setGuardandoPasajeros] = useState(false)
  // Espejos síncronos para cerrar la ventana entre dos clics antes del primer repintado.
  const pagandoRef = useRef(false)
  const confirmandoRef = useRef(false)
  const guardandoRef = useRef(false)
  const compraConfirmadaRef = useRef(false)
  // Errores devueltos por el servidor: { clave: { campo: mensaje } }
  const [erroresServidor, setErroresServidor] = useState({})

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

  const [mapaAsientos, setMapaAsientos] = useState(null)
  const [cargandoMapa, setCargandoMapa] = useState(true)
  const [errorMapa, setErrorMapa] = useState(null)
  const [errorBloqueo, setErrorBloqueo] = useState(null)
  const [intentosMapa, setIntentosMapa] = useState(0)
  // Fase visual de la carga del mapa (el hook debe llamarse antes de cualquier return).
  const { fase: faseCarga, ciclo: cicloCarga, entrando: contenidoEntrando } =
    useFaseCarga(cargandoMapa, { falla: Boolean(errorMapa) })

  // Sesión de reserva: { tokenSesion, expiraEn (ms, timestamp) }.
  const [sesion, setSesion] = useState(null)
  const sesionRef = useRef(null)

  // Asientos con una operación en vuelo. Se mantienen DOS copias a propósito:
  //  - operandoRef: lectura/escritura síncrona. setState es asíncrono, así que
  //    dos clics en el mismo tick leerían el estado viejo y dispararían dos
  //    peticiones; el ref cierra esa ventana.
  //  - asientosEnProceso: la copia que provoca repintado, para que el asiento
  //    se vea ocupado-en-curso y quede deshabilitado mientras responde el
  //    servidor (antes era solo un ref y la interfaz no reaccionaba al clic).
  const operandoRef = useRef(new Set())
  const [asientosEnProceso, setAsientosEnProceso] = useState(() => new Set())

  function marcarEnProceso(idAsiento, enProceso) {
    if (enProceso) operandoRef.current.add(idAsiento)
    else operandoRef.current.delete(idAsiento)
    setAsientosEnProceso(new Set(operandoRef.current))
  }

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
    // Confirmada la compra, el mapa ya no cuenta mis asientos como "míos": se conserva la vista final.
    if (compraConfirmadaRef.current) return
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
  }, [idViaje, intentosMapa])

  // Al vencer la sesión: liberar (lo hace el backend) y redirigir a resultados.
  // Si el pago ya se completó, o hay un pago en curso, no se agenda (o se cancela) el vencimiento:
  // el backend decide si los asientos siguen vigentes, y si el pago falla se vuelve a agendar.
  useEffect(() => {
    if (!sesion || pagoCompletado || pagando) return undefined
    const restante = Math.max(sesion.expiraEn - Date.now(), 0)
    const temporizador = setTimeout(manejarSesionVencida, restante)
    return () => clearTimeout(temporizador)
  }, [sesion, pagoCompletado, pagando])

  // Si pierdo todos los asientos (p. ej. expiraron) estando en otro paso, vuelvo a elegir.
  useEffect(() => {
    if (mapaAsientos && pasoActual !== 'asiento' && asientosSeleccionados.length === 0 && !compraConfirmada) {
      setPasoActual('asiento')
      setClaveActivaPasajero(null)
    }
  }, [mapaAsientos, pasoActual, asientosSeleccionados.length, compraConfirmada])

  // Si un asiento deja de ser mío (lo liberé, venció o el servidor me lo quitó), se descartan los datos y
  // errores asociados a él para que no reaparezcan si luego vuelvo a elegirlo.
  useEffect(() => {
    if (compraConfirmada) return
    const vigentes = new Set(asientosSeleccionados.map((asiento) => asiento.clave))
    const limpiar = (anterior) => {
      const sobrantes = Object.keys(anterior).filter((clave) => !vigentes.has(clave))
      if (sobrantes.length === 0) return anterior
      const copia = { ...anterior }
      sobrantes.forEach((clave) => delete copia[clave])
      return copia
    }
    setPasajeros(limpiar)
    setErroresServidor(limpiar)
  }, [asientosSeleccionados, compraConfirmada])

  // DNI repetido entre los pasajeros de esta compra. Se marca en TODOS los que comparten el mismo DNI
  // (no solo del 2.º en adelante), para que se vea cuáles chocan sin importar el orden en que se escribieron.
  const erroresDniRepetido = useMemo(() => {
    const clavesPorDni = {}
    asientosSeleccionados.forEach((asiento) => {
      const dni = pasajeros[asiento.clave]?.dni ?? ''
      if (!/^\d{8}$/.test(dni)) return
      if (!clavesPorDni[dni]) clavesPorDni[dni] = []
      clavesPorDni[dni].push(asiento.clave)
    })
    const resultado = {}
    Object.values(clavesPorDni).forEach((claves) => {
      if (claves.length < 2) return
      claves.forEach((clave) => {
        resultado[clave] = { dni: MENSAJE_DNI_REPETIDO }
      })
    })
    return resultado
  }, [asientosSeleccionados, pasajeros])

  const hayDniRepetido = Object.keys(erroresDniRepetido).length > 0

  // Lo que recibe GestorPasajeros: DNI repetido + errores del servidor (gana el de DNI repetido).
  const erroresExternos = useMemo(() => {
    const fusion = {}
    ;[erroresDniRepetido, erroresServidor].forEach((mapa) => {
      Object.entries(mapa).forEach(([clave, campos]) => {
        fusion[clave] = { ...campos, ...fusion[clave] }
      })
    })
    return fusion
  }, [erroresDniRepetido, erroresServidor])

    if (!contexto) {
    return <Navigate to="/" replace />
  }

  // Mientras carga (o se desvanece el cargador) se conserva la estructura de la
  // página: indicador de pasos arriba y un panel con el alto del contenido.
  if (faseCarga !== 'contenido' || cargandoMapa) {
    return (
      <section className="pagina-reserva seccion contenedor">
        <IndicadorProgreso pasoActual="asiento" />
        <CargadorRutaLibre
          variante="asientos"
          fase={faseCarga === 'contenido' ? 'viajando' : faseCarga}
          ciclo={cicloCarga}
          falla={Boolean(errorMapa)}
          detalle={contexto.resultado?.origen && contexto.resultado?.destino
            ? `${contexto.resultado.origen} → ${contexto.resultado.destino}` : undefined}
          pagina
        />
      </section>
    )
  }

  if (errorMapa) {
    return (
      <section className="pagina-reserva seccion contenedor">
        <IndicadorProgreso pasoActual="asiento" />
        <EstadoRuta
          tipo="error"
          entrando={contenidoEntrando}
          titulo="No pudimos consultar los asientos"
          texto={errorMapa}
          accion={{
            texto: 'Reintentar',
            alClick: () => {
              setErrorMapa(null)
              setCargandoMapa(true)
              setIntentosMapa((n) => n + 1)
            },
          }}
        />
      </section>
    )
  }

  const { resultado, fecha } = contexto
  const mostrarPiso = mapaAsientos.pisos > 1
  const pisoInfo = mapaAsientos.mapaPorPiso[pisoActivo]

  if (!pisoInfo) {
    return (
      <section className="pagina-reserva seccion contenedor">
        <IndicadorProgreso pasoActual="asiento" />
        <EstadoRuta
          tipo="vacio"
          entrando={contenidoEntrando}
          titulo="Sin asientos configurados"
          texto="Este viaje no tiene asientos configurados."
          accion={{ texto: 'Volver a los resultados', alClick: () => irAResultados() }}
        />
      </section>
    )
  }

  const limiteAlcanzado = asientosSeleccionados.length >= MAXIMO_PASAJEROS_POR_COMPRA
  const precioTotal = asientosSeleccionados.reduce((total, asiento) => total + (asiento.precio ?? 0), 0)

  const excedeTopeYape = metodoPago === 'yape' && precioTotal > TOPE_MAXIMO_YAPE

  const pasajerosCompletos =
    asientosSeleccionados.length > 0 &&
    asientosSeleccionados.every((asiento) => pasajeroEstaCompleto(pasajeros[asiento.clave]))

  function quitarDatosPasajero(clave) {
    setPasajeros((anterior) => {
      const copia = { ...anterior }
      delete copia[clave]
      return copia
    })
    setErroresServidor((anterior) => {
      if (!anterior[clave]) return anterior
      const copia = { ...anterior }
      delete copia[clave]
      return copia
    })
  }

  // Clic en un asiento. El asiento queda deshabilitado y marcado "en curso"
  // mientras el servidor responde; el mapa solo cambia cuando el backend
  // confirma, de modo que la pantalla nunca muestra un asiento como mío si
  // la operación falló.
  async function manejarSeleccionAsiento(asientoDelMapa) {
    const token = sesionRef.current?.tokenSesion
    const { idAsiento } = asientoDelMapa
    // Guardia síncrona: evita que una ráfaga de clics sobre el mismo asiento
    // dispare varias peticiones antes del primer repintado.
    if (!token || operandoRef.current.has(idAsiento)) return

    const estoyLiberando = Boolean(asientoDelMapa.esMio)

    if (!estoyLiberando) {
      // El tope debe contar también los bloqueos en vuelo: si solo mirase
      // asientosSeleccionados, varios clics simultáneos pasarían todos la
      // comprobación y acabaríamos pidiendo más asientos que el máximo.
      const enVueloBloqueando = Array.from(operandoRef.current).filter(
        (id) => !asientosSeleccionados.some((asiento) => asiento.idAsiento === id),
      ).length
      if (asientosSeleccionados.length + enVueloBloqueando >= MAXIMO_PASAJEROS_POR_COMPRA) {
        setErrorBloqueo(
          `Alcanzaste el máximo de ${MAXIMO_PASAJEROS_POR_COMPRA} pasajeros por compra. Quita un asiento para elegir otro.`,
        )
        return
      }
    }

    marcarEnProceso(idAsiento, true)
    setErrorBloqueo(null)
    try {
      if (estoyLiberando) {
        await liberarAsiento(idViaje, idAsiento, token)
        actualizarAsientoLocal(idAsiento, { estado: 'disponible', esMio: false })
        quitarDatosPasajero(`${asientoDelMapa.piso}-${asientoDelMapa.numero}`)
      } else {
        await bloquearAsiento(idViaje, idAsiento, token)
        actualizarAsientoLocal(idAsiento, { estado: 'bloqueado', esMio: true })
      }
    } catch (error) {
      if (error.status === 410 || error.status === 401) {
        manejarSesionVencida()
      } else if (error.status === 409) {
        setErrorBloqueo(
          estoyLiberando
            ? 'Ese asiento ya no está reservado a tu nombre.'
            : 'Ese asiento ya fue tomado por otro cliente. Elige otro.',
        )
        cargarMapaAsientos(true)
      } else {
        // Cualquier otro fallo (red caída, 500...) se muestra y se
        // resincroniza el mapa. La interfaz sigue utilizable: el asiento se
        // vuelve a habilitar en el finally.
        setErrorBloqueo(error.message)
        cargarMapaAsientos(true)
      }
    } finally {
      // Pase lo que pase —incluido un error del backend— el asiento deja de
      // estar en curso: nunca debe quedarse bloqueado para siempre.
      marcarEnProceso(idAsiento, false)
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
    // Al editar, desaparece el error del servidor de ese campo (y el del asiento).
    setErroresServidor((anterior) => {
      if (!anterior[clave]) return anterior
      const restoCampos = { ...anterior[clave] }
      delete restoCampos[campo]
      delete restoCampos.asiento
      const copia = { ...anterior }
      if (Object.keys(restoCampos).length === 0) delete copia[clave]
      else copia[clave] = restoCampos
      return copia
    })
  }

  async function manejarEliminarTicket(clave) {
    const asiento = asientosSeleccionados.find((a) => a.clave === clave)
    // Misma guardia que en el mapa: si ya hay una liberación en vuelo para
    // este asiento, un segundo clic en "eliminar" no debe repetirla.
    if (asiento && operandoRef.current.has(asiento.idAsiento)) return

    const restantes = asientosSeleccionados.filter((a) => a.clave !== clave)
    quitarDatosPasajero(clave)

    if (asiento && sesionRef.current) {
      marcarEnProceso(asiento.idAsiento, true)
      try {
        await liberarAsiento(idViaje, asiento.idAsiento, sesionRef.current.tokenSesion)
        actualizarAsientoLocal(asiento.idAsiento, { estado: 'disponible', esMio: false })
      } catch (error) {
        if (error.status === 410 || error.status === 401) {
          manejarSesionVencida()
          return
        }
        setErrorBloqueo(error.message)
        cargarMapaAsientos(true)
      } finally {
        marcarEnProceso(asiento.idAsiento, false)
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

  function manejarCambiarMetodoPago(metodo) {
    setMetodoPago(metodo)
    setErroresPago({})
    setCamposTocadosPago({})
    setRespuestaPago(null)
  }

  // Lleva al primer asiento (en orden de selección) que tenga algún error.
  function activarPrimerAsientoConError(mapaErrores) {
    const primero = asientosSeleccionados.find((asiento) => mapaErrores[asiento.clave])
    if (primero) setClaveActivaPasajero(primero.clave)
  }

  // "Continuar al pago": el backend valida los pasajeros y los deja en una caché TEMPORAL de su memoria
  // (se descarta al vencer la sesión). No se escribe en la base de datos todavía: eso ocurre al aprobarse
  // el pago (confirmarCompra). Solo avanza al pago si el servidor responde valido: true.
  async function confirmarPasajerosYContinuar() {
    if (guardandoRef.current || !pasajerosCompletos || hayDniRepetido) return
    const token = sesionRef.current?.tokenSesion
    if (!token) return

    setErrorBloqueo(null)
    setErroresServidor({})
    guardandoRef.current = true
    setGuardandoPasajeros(true)
    try {
      const guardado = await guardarPasajeros(idViaje, token, construirPasajerosApi(asientosSeleccionados, pasajeros))

      if (guardado.valido) {
        setPasoActual('pago')
        return
      }

      const mapaErrores = mapearErroresServidor(guardado.errores, asientosSeleccionados)
      if (Object.keys(mapaErrores).length === 0) {
        setErrorBloqueo('No se pudieron validar los datos de los pasajeros. Revísalos e inténtalo de nuevo.')
        return
      }
      setErroresServidor(mapaErrores)
      activarPrimerAsientoConError(mapaErrores)
      // Si el servidor dice que un asiento ya no es mío, resincroniza el mapa para que deje de aparecer seleccionado.
      if (Object.values(mapaErrores).some((campos) => campos.asiento)) {
        setErrorBloqueo('Un asiento ya no estaba reservado para ti y se quitó de tu selección.')
        cargarMapaAsientos(true)
      }
    } catch (error) {
      if (error.status === 410 || error.status === 401) {
        manejarSesionVencida()
      } else if (error.status === 409) {
        setErrorBloqueo(error.message || 'Alguno de tus asientos ya no está reservado para ti. Revisa tu selección e inténtalo de nuevo.')
        cargarMapaAsientos(true)
      } else {
        setErrorBloqueo(error.message)
      }
    } finally {
      guardandoRef.current = false
      setGuardandoPasajeros(false)
    }
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

  // Solo se llama con un pago aprobado. Confirma la compra en el backend: guarda en PostgreSQL los pasajeros
  // de la caché y pasa los asientos de BLOQUEADO_TEMPORAL a OCUPADO en una transacción. Si falla, el usuario
  // puede reintentar sin volver a pagar.
  async function confirmarCompra() {
    const token = sesionRef.current?.tokenSesion
    if (!token || confirmandoRef.current || compraConfirmadaRef.current) return
    confirmandoRef.current = true
    setConfirmandoCompra(true)
    setErrorConfirmacion(null)
    try {
      await confirmarCompraDemo(idViaje, token)
      compraConfirmadaRef.current = true
      setCompraConfirmada(true)
      borrarSesionAsientos(idViaje)
    } catch (error) {
      if (error.status === 410 || error.status === 401) {
        manejarSesionVencida()
      } else {
        setErrorConfirmacion(error.message || 'No se pudo confirmar tu compra. Inténtalo de nuevo.')
      }
    } finally {
      confirmandoRef.current = false
      setConfirmandoCompra(false)
    }
  }

  function manejarPago() {
    if (pagandoRef.current || compraConfirmadaRef.current) return
    const valores = datosPago[metodoPago]
    const errores = VALIDADORES_PAGO[metodoPago](valores)
    setErroresPago(errores)
    setCamposTocadosPago(Object.fromEntries(Object.keys(valores).map((campo) => [campo, true])))
    if (Object.keys(errores).length > 0) return
    if (excedeTopeYape) return

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

    pagandoRef.current = true
    setRespuestaPago(null)
    setPagando(true)
    setTimeout(() => {
      const respuesta = simularRespuestaPago(metodoPago, valores)
      pagandoRef.current = false
      setPagando(false)
      setRespuestaPago(respuesta)
      // Solo un pago aprobado confirma; rechazado o en proceso no guarda nada en la base de datos.
      if (respuesta.status === 'approved') confirmarCompra()
    }, 1400)
  }

  async function volverAlPasoAnterior() {
    if (pagandoRef.current || confirmandoRef.current || guardandoRef.current) return
    if (compraConfirmadaRef.current) {
      // Compra ya confirmada: no hay nada que liberar.
      borrarContexto()
      irAResultados()
    } else if (pasoActual === 'pasajero') setPasoActual('asiento')
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
    textoBoton = !pasajerosCompletos
      ? 'Completa los datos de todos los pasajeros'
      : hayDniRepetido
        ? 'Corrige los DNI repetidos'
        : 'Continuar al pago →'
    deshabilitadoBoton = !pasajerosCompletos || hayDniRepetido || guardandoPasajeros
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
    filasDetalle.push({ etiqueta: 'Medio de pago', valor: metodoPago === 'yape' ? 'Yape' : 'Tarjeta' })
    if (metodoPago === 'tarjeta' && datosPago.tarjeta.cuotas > 1) {
      filasDetalle.push({ etiqueta: 'Cuotas', valor: `${datosPago.tarjeta.cuotas}` })
    }
    if (respuestaPago?.status === 'approved') {
      textoBoton = errorConfirmacion
        ? 'Reintentar confirmación'
        : compraConfirmada
          ? 'Compra confirmada ✓'
          : 'Pago aprobado ✓'
    } else if (respuestaPago?.status === 'in_process') textoBoton = 'Pago en proceso'
    else if (respuestaPago?.status === 'rejected') textoBoton = 'Reintentar pago'
    else textoBoton = `Pagar ${formatearPrecio(precioTotal)}`
    deshabilitadoBoton = (pagoCompletado && !errorConfirmacion) || excedeTopeYape
  }

  return (
    <section className={`pagina-reserva seccion contenedor${contenidoEntrando ? ' carga-entrada' : ''}`}>
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
                asientosEnProceso={asientosEnProceso}
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
              erroresExternos={erroresExternos}
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

          {errorBloqueo && (
            <p className="pagina-reserva__aviso-tope" role="alert">
              {errorBloqueo}
            </p>
          )}

          {errorConfirmacion && (
            <p className="pagina-reserva__aviso-tope" role="alert">
              {errorConfirmacion}
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
                : errorConfirmacion
                  ? confirmarCompra
                  : manejarPago
          }
          deshabilitado={deshabilitadoBoton}
          cargando={
            pasoActual === 'pago'
              ? pagando || confirmandoCompra
              : pasoActual === 'pasajero'
                ? guardandoPasajeros
                : false
          }
          mensajeAyuda={mensajeAyuda}
        />
      </div>
    </section>
  )
}