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
import { AvisoResultadoPago, CompraConfirmada, Desafio3ds, PagoProcesando } from '../../componentes/reserva/ProcesoPago'
import {
  TOPE_MAXIMO_YAPE,
  VALORES_YAPE_INICIALES,
  construirSolicitudPagoTarjeta,
  construirSolicitudPagoYape,
  describirEstadoPago,
  soloDigitos,
  validarPagoYape,
} from '../../utilidades/pagoMercadoPago'
import {
  ESTADOS_ACTIVOS,
  borrarPagoEnCurso,
  consultarPago,
  esFalloTransitorio,
  esperarResultadoPago,
  guardarPagoEnCurso,
  iniciarPago,
  leerPagoEnCurso,
  nuevaClaveIdempotencia,
} from '../../servicios/pagosServicio'
import { MODO_SANDBOX, crearTokenYape } from '../../servicios/mercadoPagoSdk'
import { useTema } from '../../hooks/useTema'
import {
  dniConDatosDistintos,
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
  guardarSesionAsientos,
} from '../../servicios/viajesServicio'
import { formatearPrecio } from '../../utilidades/formato'
import { TEXTOS_ESTADO_RESERVA, esReservaNoPermitida } from '../../utilidades/estadoReserva'
import './paginaReserva.css'
import { Contador } from '../../componentes/reserva/Contador'
import { CargadorRutaLibre, EstadoRuta, useFaseCarga } from '../../componentes/carga'

const validarYape = (valores) => validarPagoYape(valores, { sandbox: MODO_SANDBOX })

// Polling del estado: hasta 2 min en general y hasta 15 min durante el desafío 3DS del banco.
const ESPERA_MAXIMA_MS = 120000
const ESPERA_MAXIMA_3DS_MS = 15 * 60 * 1000
const FASES_PAGO_ACTIVAS = new Set(['procesando', 'accion', 'pendiente'])

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
  const { tema } = useTema()
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
  // Si la búsqueda ya marcó el viaje como no reservable no se abre sesión: el backend lo rechazaría igual.
  const estadoReservaContexto = contexto?.resultado?.estadoReserva
  const viajeNoReservable = Boolean(estadoReservaContexto) && estadoReservaContexto !== 'DISPONIBLE'

  useEffect(() => {
    if (contexto) guardarContexto(contexto)
  }, [contexto])
  const [pasoActual, setPasoActual] = useState('asiento')
  const [pisoActivo, setPisoActivo] = useState(1)
  const [pasajeros, setPasajeros] = useState({})
  const [claveActivaPasajero, setClaveActivaPasajero] = useState(null)

  const [metodoPago, setMetodoPago] = useState('tarjeta')
  const [datosYape, setDatosYape] = useState(() => ({ ...VALORES_YAPE_INICIALES }))
  const [erroresPago, setErroresPago] = useState({})
  const [camposTocadosPago, setCamposTocadosPago] = useState({})
  // procesando: la capa "Estamos procesando tu pago" está visible (creación de la order o espera del resultado).
  const [procesando, setProcesando] = useState(false)
  // Último estado VERIFICADO POR EL BACKEND: { fase, titulo, texto, respuesta }. Nunca se arma en el navegador.
  const [pago, setPago] = useState(null)
  const [errorPago, setErrorPago] = useState(null)
  const [consultandoPago, setConsultandoPago] = useState(false)
  const pagoActivo = procesando || FASES_PAGO_ACTIVAS.has(pago?.fase)
  // Solo es true cuando el BACKEND verificó el pago aprobado y registró la compra.
  const [compraConfirmada, setCompraConfirmada] = useState(false)
  const [guardandoPasajeros, setGuardandoPasajeros] = useState(false)
  // Espejos síncronos para cerrar la ventana entre dos clics antes del primer repintado.
  const pagandoRef = useRef(false)
  const guardandoRef = useRef(false)
  const compraConfirmadaRef = useRef(false)
  const refControladorTarjeta = useRef(null)
  // Última solicitud enviada: si se perdió la respuesta, se reenvía IGUAL (misma clave de idempotencia).
  const solicitudPendienteRef = useRef(null)
  const desmontadoRef = useRef(false)
  useEffect(() => {
    desmontadoRef.current = false
    return () => {
      desmontadoRef.current = true
    }
  }, [])
  // Errores devueltos por el servidor: { clave: { campo: mensaje } }
  const [erroresServidor, setErroresServidor] = useState({})

  // La sesión puede cargar después del primer render: completa el correo y el
  // celular con los del usuario solo si el comprador aún no los escribió.
  useEffect(() => {
    if (!usuario) return
    const celularUsuario = soloDigitos(usuario.telefono).slice(-9)
    setDatosYape((anterior) => ({
      ...anterior,
      correo: anterior.correo || usuario.correo || '',
      celular: anterior.celular || (/^9\d{8}$/.test(celularUsuario) ? celularUsuario : ''),
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
    if (!idViaje || viajeNoReservable) return undefined
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
        // Un pago que quedó en curso (recarga de la página) se retoma: nunca se vuelve a cobrar.
        const referenciaEnCurso = leerPagoEnCurso(idViaje)
        if (referenciaEnCurso) {
          setPasoActual('pago')
          seguirPago(referenciaEnCurso)
        }
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
  }, [idViaje, intentosMapa, viajeNoReservable])

  // Al vencer la sesión: liberar (lo hace el backend) y redirigir a resultados.
  // Si el pago ya se completó, o hay un pago en curso, no se agenda (o se cancela) el vencimiento:
  // el backend decide si los asientos siguen vigentes, y si el pago falla se vuelve a agendar.
  useEffect(() => {
    if (!sesion || compraConfirmada || pagoActivo) return undefined
    const restante = Math.max(sesion.expiraEn - Date.now(), 0)
    const temporizador = setTimeout(manejarSesionVencida, restante)
    return () => clearTimeout(temporizador)
  }, [sesion, compraConfirmada, pagoActivo])

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

  // Un mismo DNI puede repetirse en la compra (una persona con varios asientos) si los nombres coinciden;
  // se marca el asiento posterior cuyo DNI ya está usado con otros nombres (igual que el backend).
  const erroresDniRepetido = useMemo(() => dniConDatosDistintos(
    asientosSeleccionados.map((asiento) => ({
      clave: asiento.clave,
      dni: pasajeros[asiento.clave]?.dni ?? '',
      nombres: pasajeros[asiento.clave]?.nombres ?? '',
      apellidos: pasajeros[asiento.clave]?.apellidos ?? '',
    })),
  ), [asientosSeleccionados, pasajeros])

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

  if (viajeNoReservable) {
    // Navegación directa con un viaje que la búsqueda ya marcó como no reservable.
    const textos = TEXTOS_ESTADO_RESERVA[contexto.resultado.estadoReserva]
    return (
      <section className="pagina-reserva seccion contenedor">
        <IndicadorProgreso pasoActual="asiento" />
        <EstadoRuta
          tipo="vacio"
          entrando={contenidoEntrando}
          titulo={textos?.insignia ?? 'Viaje no disponible'}
          texto={textos?.detalle ?? 'Este viaje no está disponible para reservas.'}
          accion={{ texto: 'Volver a los resultados', alClick: () => irAResultados() }}
        />
      </section>
    )
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
  const correoComprador = usuario?.correo ?? ''


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
      } else if (esReservaNoPermitida(error)) {
        setErrorBloqueo(error.message)
        cargarMapaAsientos(true)
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
    if (pagoActivo) return
    setMetodoPago(metodo)
    setErroresPago({})
    setCamposTocadosPago({})
    setErrorPago(null)
  }

  // Lleva al primer asiento (en orden de selección) que tenga algún error.
  function activarPrimerAsientoConError(mapaErrores) {
    const primero = asientosSeleccionados.find((asiento) => mapaErrores[asiento.clave])
    if (primero) setClaveActivaPasajero(primero.clave)
  }

  // "Continuar al pago": el backend valida los pasajeros y los deja en una caché TEMPORAL de su memoria
  // (se descarta al vencer la sesión). No se escribe en la base de datos todavía: eso ocurre cuando el
  // backend verifica con Mercado Pago que el pago fue aprobado. Solo avanza al pago si el servidor responde valido: true.
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
      } else if (esReservaNoPermitida(error)) {
        setErrorBloqueo(error.message)
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
    const valores = { ...datosYape, [campo]: valor }
    setDatosYape(valores)
    setErroresPago(validarYape(valores))
  }

  function manejarTocarCampoPago(campo) {
    setCamposTocadosPago((anterior) => ({ ...anterior, [campo]: true }))
    setErroresPago(validarYape(datosYape))
  }

  // ---------------------------------------------------------------------------------------------
  // Pago con Mercado Pago. La compra SOLO se registra en el backend cuando él verifica la order
  // aprobada; el navegador se limita a mostrar el estado que el backend devuelve.
  // ---------------------------------------------------------------------------------------------

  function aplicarSesionRenovada(respuesta) {
    if (!respuesta?.sesion?.tokenSesion) return
    const renovada = guardarSesionAsientos(idViaje, respuesta.sesion)
    sesionRef.current = renovada
    setSesion(renovada)
  }

  function finalizarPago(respuesta, agotado = false) {
    const estado = describirEstadoPago(respuesta, { agotado })
    setPago({ ...estado, respuesta })
    if (respuesta?.estado === 'APROBADO') {
      compraConfirmadaRef.current = true
      setCompraConfirmada(true)
      borrarPagoEnCurso(idViaje)
      borrarSesionAsientos(idViaje)
    } else if (!ESTADOS_ACTIVOS.has(respuesta?.estado)) {
      borrarPagoEnCurso(idViaje)
      cargarMapaAsientos(true)
    }
  }

  /** Consulta el estado verificado hasta que sea final o se agote la espera. */
  async function seguirPago(referencia) {
    setProcesando(true)
    try {
      const { respuesta, agotado } = await esperarResultadoPago(referencia, {
        cancelado: () => desmontadoRef.current,
        alActualizar: (r) => {
          if (desmontadoRef.current) return
          setPago({ ...describirEstadoPago(r), respuesta: r })
          // Durante el desafío 3DS se oculta la capa de espera para que el comprador vea el iframe.
          setProcesando(r?.estado !== 'ACCION_REQUERIDA')
        },
        limitePara: (r) => (r?.estado === 'ACCION_REQUERIDA' ? ESPERA_MAXIMA_3DS_MS : ESPERA_MAXIMA_MS),
      })
      if (!desmontadoRef.current && respuesta) finalizarPago(respuesta, agotado)
    } catch (error) {
      // 401/404: la operación no es de este usuario o la sesión de la cuenta venció.
      borrarPagoEnCurso(idViaje)
      setPago(null)
      setErrorPago(error.message || 'No pudimos consultar el estado del pago.')
    } finally {
      if (!desmontadoRef.current) setProcesando(false)
    }
  }

  async function procesarRespuestaInicial(respuesta) {
    solicitudPendienteRef.current = null
    aplicarSesionRenovada(respuesta)
    if (ESTADOS_ACTIVOS.has(respuesta.estado)) {
      guardarPagoEnCurso(idViaje, respuesta.referencia)
      setPago({ ...describirEstadoPago(respuesta), respuesta })
      await seguirPago(respuesta.referencia)
    } else {
      finalizarPago(respuesta)
    }
  }

  async function obtenerSolicitudPago(tokenSesion) {
    const claveIdempotencia = nuevaClaveIdempotencia()
    if (metodoPago === 'yape') {
      const errores = validarYape(datosYape)
      setErroresPago(errores)
      setCamposTocadosPago(Object.fromEntries(Object.keys(datosYape).map((campo) => [campo, true])))
      if (Object.keys(errores).length > 0) return null
      const token = await crearTokenYape(datosYape)
      return construirSolicitudPagoYape({ idViaje, tokenSesion, claveIdempotencia, token, valores: datosYape })
    }

    const controlador = refControladorTarjeta.current
    if (!controlador) throw new Error('El formulario de tarjeta todavía se está cargando. Espera un momento.')
    let datosTarjeta
    try {
      datosTarjeta = await controlador.getFormData()
    } catch {
      datosTarjeta = null
    }
    if (!datosTarjeta?.token) {
      throw new Error('Revisa los datos de la tarjeta marcados en el formulario.')
    }
    const datosAdicionales = await Promise.resolve(controlador.getAdditionalData?.()).catch(() => null)
    return construirSolicitudPagoTarjeta({ idViaje, tokenSesion, claveIdempotencia, datosTarjeta, datosAdicionales })
  }

  async function manejarPago() {
    // Guardia síncrona: un doble clic no puede iniciar dos pagos.
    if (pagandoRef.current || compraConfirmadaRef.current || FASES_PAGO_ACTIVAS.has(pago?.fase)) return
    if (excedeTopeYape) return
    const tokenSesion = sesionRef.current?.tokenSesion
    if (!tokenSesion) return

    pagandoRef.current = true
    setProcesando(true)
    setErrorPago(null)
    setPago(null)
    try {
      const solicitud = await obtenerSolicitudPago(tokenSesion)
      if (!solicitud) return
      solicitudPendienteRef.current = solicitud
      const respuesta = await iniciarPago(solicitud)
      await procesarRespuestaInicial(respuesta)
    } catch (error) {
      manejarErrorPago(error)
    } finally {
      pagandoRef.current = false
      if (!desmontadoRef.current) setProcesando(false)
    }
  }

  function manejarErrorPago(error) {
    if (esFalloTransitorio(error) && solicitudPendienteRef.current) {
      // La solicitud pudo llegar al servidor: el resultado es DESCONOCIDO, no un rechazo.
      setPago({
        fase: 'pendiente',
        titulo: 'No pudimos confirmar el estado de tu pago',
        texto: 'El servidor tardó en responder. No vuelvas a pagar: verifica el estado y te mostraremos el resultado real.',
        respuesta: null,
      })
    } else if (error.status === 410 || error.status === 401) {
      manejarSesionVencida()
    } else if (esReservaNoPermitida(error)) {
      setErrorPago(error.message)
    } else if (error.status === 409) {
      setErrorPago(error.message || 'Tu reserva cambió. Revisa tus asientos e inténtalo de nuevo.')
      cargarMapaAsientos(true)
    } else {
      setErrorPago(error.message || 'No pudimos iniciar el pago. Inténtalo de nuevo.')
    }
  }

  /** "Consultar el estado ahora" de un pago pendiente o con resultado desconocido. */
  async function verificarPagoPendiente() {
    if (consultandoPago || procesando) return
    setConsultandoPago(true)
    setErrorPago(null)
    try {
      const referencia = pago?.respuesta?.referencia ?? leerPagoEnCurso(idViaje)
      if (referencia) {
        const respuesta = await consultarPago(referencia)
        if (ESTADOS_ACTIVOS.has(respuesta.estado)) {
          setPago({ ...describirEstadoPago(respuesta), respuesta })
          await seguirPago(referencia)
        } else {
          finalizarPago(respuesta)
        }
      } else if (solicitudPendienteRef.current) {
        // Reenvío idéntico (misma clave): devuelve la operación ya creada, nunca una nueva.
        const respuesta = await iniciarPago(solicitudPendienteRef.current)
        await procesarRespuestaInicial(respuesta)
      }
    } catch (error) {
      if (!esFalloTransitorio(error)) manejarErrorPago(error)
    } finally {
      setConsultandoPago(false)
    }
  }

  async function volverAlPasoAnterior() {
    if (pagandoRef.current || pagoActivo || guardandoRef.current) return
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
        ? 'Corrige los DNI con nombres distintos'
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
    const reservaVencida = pago?.respuesta?.estado === 'EXPIRADO'
    if (compraConfirmada) textoBoton = 'Compra confirmada ✓'
    else if (pago?.fase === 'accion') textoBoton = 'Esperando a tu banco…'
    else if (pago?.fase === 'pendiente' || pago?.fase === 'procesando') textoBoton = 'Pago en revisión'
    else if (pago?.fase === 'rechazado' && !reservaVencida) textoBoton = `Reintentar pago de ${formatearPrecio(precioTotal)}`
    else textoBoton = `Pagar ${formatearPrecio(precioTotal)}`
    deshabilitadoBoton = compraConfirmada || pagoActivo || excedeTopeYape || pago?.fase === 'reembolso' || reservaVencida
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
        {/* Con la compra confirmada ya no hay nada que expirar: el contador desaparece. */}
        {!compraConfirmada && <Contador expiraEn={sesion?.expiraEn} pausado={pagoActivo} />}
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

          {pasoActual === 'pago' && compraConfirmada && pago?.respuesta && (
            <CompraConfirmada
              respuesta={pago.respuesta}
              resultado={resultado}
              fecha={fecha}
              alVerPasajes={() => {
                borrarContexto()
                navegar('/perfil/pasajes')
              }}
              alIrInicio={() => {
                borrarContexto()
                navegar('/')
              }}
            />
          )}

          {pasoActual === 'pago' && !compraConfirmada && (
            <>
              {pago && ['rechazado', 'pendiente', 'reembolso'].includes(pago.fase) && (
                <AvisoResultadoPago
                  fase={pago.fase}
                  titulo={pago.titulo}
                  texto={pago.texto}
                  alConsultar={verificarPagoPendiente}
                  consultando={consultandoPago}
                />
              )}
              <PasarelaPago
                metodo={metodoPago}
                alCambiarMetodo={manejarCambiarMetodoPago}
                valoresYape={datosYape}
                errores={erroresPago}
                camposTocados={camposTocadosPago}
                alCambiarCampo={manejarCambiarCampoPago}
                alTocarCampo={manejarTocarCampoPago}
                total={precioTotal}
                correoInicial={correoComprador}
                tema={tema}
                bloqueado={pagoActivo}
                refControladorTarjeta={refControladorTarjeta}
              />
            </>
          )}

          {errorPago && (
            <p className="pagina-reserva__aviso-tope" role="alert">
              {errorPago}
            </p>
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
          cargando={
            pasoActual === 'pago'
              ? procesando
              : pasoActual === 'pasajero'
                ? guardandoPasajeros
                : false
          }
          mensajeAyuda={mensajeAyuda}
        />
      </div>

      {procesando && pago?.fase !== 'accion' && (
        <PagoProcesando detalle={pago?.respuesta?.estado === 'CREANDO' ? pago.texto : undefined} />
      )}
      {pago?.fase === 'accion' && pago.respuesta?.urlDesafio3ds && (
        <Desafio3ds url={pago.respuesta.urlDesafio3ds} alTerminar={() => setProcesando(true)} />
      )}
    </section>
  )
}