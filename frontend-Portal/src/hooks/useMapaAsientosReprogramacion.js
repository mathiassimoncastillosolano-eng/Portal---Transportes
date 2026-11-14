import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { abrirEventosAsientos, obtenerMapaAsientosViaje, obtenerOCrearSesion } from '../servicios/viajesServicio'
import {
  cambiarAsientoElegido,
  esAsientoTomado,
  esSesionVencida,
  liberarAsientoPropio,
} from '../servicios/reprogramacionAsientosServicio'
import {
  aplicarEventoEnMapa,
  buscarAsientoElegido,
  buscarIdsAsientosElegidos,
} from '../utilidades/reprogramacionAsientos'

const MENSAJE_ASIENTO_TOMADO = 'Ese asiento acaba de ser tomado por otra persona. Elige otro.'
const MENSAJE_ERROR_MAPA = 'No pudimos consultar los asientos de este viaje.'
const MENSAJE_ERROR_BLOQUEO = 'No pudimos reservar el asiento. Inténtalo de nuevo.'

// Reprogramación · Mapa de asientos real de un viaje, con selección de UN solo asiento.
//
// Flujo:
//  - Abre (o reutiliza) la sesión del viaje y se la entrega a la pantalla con alGuardarSesion.
//  - Carga el mapa y escucha los cambios en tiempo real (SSE) de los demás clientes.
//  - seleccionarAsiento(): al elegir uno se bloquea en el backend y se libera el anterior;
//    al tocar el asiento ya elegido, simplemente se libera.
//  - Mantiene alCambiarAsiento() al día con lo que dice el backend (esMio).
export function useMapaAsientosReprogramacion({ viaje, versionMapa, alGuardarSesion, alCambiarAsiento, alSesionVencida }) {
  const [mapa, setMapa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [errorBloqueo, setErrorBloqueo] = useState('')
  const [idEnProceso, setIdEnProceso] = useState(null)
  const [intentos, setIntentos] = useState(0)

  const tokenSesion = useRef(null)
  // Solo se permite una operación a la vez: evita bloquear dos asientos con clics rápidos.
  const operacionEnCurso = useRef(false)

  const asientoElegido = useMemo(() => buscarAsientoElegido(mapa), [mapa])
  const asientosEnProceso = useMemo(() => new Set(idEnProceso == null ? [] : [idEnProceso]), [idEnProceso])

  const recargarMapa = useCallback(async () => {
    const mapaActual = await obtenerMapaAsientosViaje(viaje.id, tokenSesion.current)
    setMapa(mapaActual)
  }, [viaje.id])

  // Sesión + mapa + tiempo real.
  useEffect(() => {
    let cancelado = false
    let cerrarEventos = () => {}

    async function iniciar() {
      setCargando(true)
      setError('')
      try {
        const sesion = await obtenerOCrearSesion(viaje.id)
        if (cancelado) return
        tokenSesion.current = sesion.tokenSesion
        alGuardarSesion(sesion)
        await recargarMapa()
        if (cancelado) return
        setCargando(false)
        cerrarEventos = abrirEventosAsientos(viaje.id, {
          alAbrir: () => recargarMapa().catch(() => {}),
          alAsiento: (evento) => setMapa((anterior) => aplicarEventoEnMapa(anterior, evento)),
        })
      } catch (fallo) {
        if (cancelado) return
        setError(fallo.message || MENSAJE_ERROR_MAPA)
        setCargando(false)
      }
    }

    iniciar()
    return () => {
      cancelado = true
      cerrarEventos()
    }
  }, [viaje.id, versionMapa, intentos, alGuardarSesion, recargarMapa])

  // El backend manda: si dice que tengo un asiento (o que ya no), la pantalla lo refleja.
  // Cubre recargas de página y bloqueos que vencen mientras se mira el mapa.
  useEffect(() => {
    if (mapa) alCambiarAsiento(asientoElegido)
  }, [asientoElegido?.idAsiento, Boolean(mapa)])

  function manejarFalloDeReserva(fallo) {
    if (esSesionVencida(fallo)) {
      alSesionVencida()
      return
    }
    if (esAsientoTomado(fallo)) {
      setErrorBloqueo(MENSAJE_ASIENTO_TOMADO)
      return
    }
    setErrorBloqueo(fallo.message || MENSAJE_ERROR_BLOQUEO)
  }

  // Pide al backend lo que se debe hacer según el asiento tocado.
  async function aplicarSeleccionEnBackend(asientoDelMapa, token) {
    if (asientoDelMapa.esMio) {
      // Tocó su propio asiento: se libera.
      await liberarAsientoPropio(viaje.id, token, asientoDelMapa.idAsiento)
      return
    }
    // Tocó otro asiento: se bloquea y se sueltan los que tenía.
    const idsAnteriores = buscarIdsAsientosElegidos(mapa)
    await cambiarAsientoElegido(viaje.id, token, idsAnteriores, asientoDelMapa.idAsiento)
  }

  // Clic en un asiento del mapa. El mapa no se "adivina" en el navegador: se espera la
  // respuesta del backend y se vuelve a pedir el mapa, así la pantalla siempre muestra
  // lo que realmente está bloqueado (incluso si la operación falló).
  async function seleccionarAsiento(asientoDelMapa) {
    const token = tokenSesion.current
    if (!token || operacionEnCurso.current) return

    operacionEnCurso.current = true
    setIdEnProceso(asientoDelMapa.idAsiento)
    setErrorBloqueo('')
    try {
      await aplicarSeleccionEnBackend(asientoDelMapa, token)
    } catch (fallo) {
      manejarFalloDeReserva(fallo)
    }
    try {
      await recargarMapa()
    } catch {
      // Si no se pudo recargar, los eventos en tiempo real corregirán el mapa.
    } finally {
      operacionEnCurso.current = false
      setIdEnProceso(null)
    }
  }

  return {
    mapa,
    cargando,
    error,
    errorBloqueo,
    asientoElegido,
    asientosEnProceso,
    seleccionarAsiento,
    reintentar: () => setIntentos((n) => n + 1),
  }
}
