import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PantallaInicializacion } from '../componentes/inicializacion/PantallaInicializacion'
import { consultarDisponibilidad } from '../servicios/saludServicio'
import { crearCicloInicializacion } from '../utilidades/cicloInicializacion'
import { ESTADOS_INICIO, TIEMPOS_INICIO } from '../utilidades/inicializacion'

export const ContextoInicializacion = createContext(null)

function prefiereMenosMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function estaEnLinea() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/**
 * Puerta de entrada global de RutaLibre.
 *
 * Comprueba GET /api/health/ready UNA vez por carga de la página y solo monta `children` (la
 * aplicación completa: autenticación, búsqueda, rutas…) cuando el backend responde READY. Mientras
 * tanto no se monta ningún módulo, así que no se dispara ninguna solicitud de negocio.
 *
 * Se coloca DENTRO de BrowserRouter: la URL solicitada (p. ej. /perfil/pasajes) se conserva y React
 * Router la resuelve normalmente al montar la aplicación. Una vez READY no vuelve a intervenir.
 *
 * No toca tokens, localStorage ni cookies.
 *
 * Fases de presentación:
 *  oculta     → aún no vale la pena mostrar nada (READY suele llegar en < retrasoVisible)
 *  visible    → pantalla de inicialización
 *  despedida  → "Todo está listo" y fundido de salida, con la app ya montada debajo
 *  terminada  → solo la aplicación
 */
export function ProveedorInicializacion({ children }) {
  const [estado, setEstado] = useState(() => ({
    estado: ESTADOS_INICIO.INITIALIZING,
    tipo: null,
    lento: false,
    intentos: 0,
  }))
  const [fase, setFase] = useState('oculta')
  const [sinInternet, setSinInternet] = useState(() => !estaEnLinea())
  const cicloRef = useRef(null)
  const faseRef = useRef(fase)
  faseRef.current = fase

  // Ciclo de comprobación: se crea al montar y se cancela al desmontar (también en StrictMode).
  useEffect(() => {
    const ciclo = crearCicloInicializacion({
      consultar: consultarDisponibilidad,
      alCambiar: setEstado,
    })
    cicloRef.current = ciclo
    ciclo.iniciar()

    const alVolverEnLinea = () => {
      setSinInternet(false)
      ciclo.despertar()
    }
    const alPerderConexion = () => setSinInternet(true)
    window.addEventListener('online', alVolverEnLinea)
    window.addEventListener('offline', alPerderConexion)

    return () => {
      window.removeEventListener('online', alVolverEnLinea)
      window.removeEventListener('offline', alPerderConexion)
      ciclo.detener()
      cicloRef.current = null
    }
  }, [])

  const listo = estado.estado === ESTADOS_INICIO.READY

  // Mostrar la pantalla solo si READY no llega enseguida (evita un destello con el backend activo).
  useEffect(() => {
    if (listo || fase !== 'oculta') return undefined
    if (estado.estado === ESTADOS_INICIO.WAITING || estado.estado === ESTADOS_INICIO.ERROR) {
      setFase('visible')
      return undefined
    }
    const id = setTimeout(() => setFase('visible'), TIEMPOS_INICIO.retrasoVisible)
    return () => clearTimeout(id)
  }, [listo, fase, estado.estado])

  // Transición a la aplicación.
  useEffect(() => {
    if (!listo) return undefined
    if (faseRef.current === 'oculta') {
      setFase('terminada') // backend activo: acceso directo, sin animación
      return undefined
    }
    if (faseRef.current !== 'visible') return undefined

    const reducido = prefiereMenosMovimiento()
    const espera = reducido ? TIEMPOS_INICIO.despedidaReducida : TIEMPOS_INICIO.despedida
    const id = setTimeout(() => setFase('despedida'), espera)
    return () => clearTimeout(id)
  }, [listo])

  const alTerminarSalida = useCallback(() => setFase('terminada'), [])

  const reintentar = useCallback(() => {
    cicloRef.current?.reintentar()
  }, [])

  const valor = useMemo(() => ({ estado: estado.estado, listo, reintentar }), [estado.estado, listo, reintentar])

  const montarApp = listo && (fase === 'despedida' || fase === 'terminada')
  const mostrarPantalla = fase === 'visible' || fase === 'despedida'

  return (
    <ContextoInicializacion.Provider value={valor}>
      {montarApp && children}
      {mostrarPantalla && (
        <PantallaInicializacion
          estado={estado.estado}
          tipo={estado.tipo}
          lento={estado.lento}
          sinInternet={sinInternet}
          saliendo={fase === 'despedida'}
          onSalidaCompleta={alTerminarSalida}
          onReintentar={reintentar}
        />
      )}
    </ContextoInicializacion.Provider>
  )
}
