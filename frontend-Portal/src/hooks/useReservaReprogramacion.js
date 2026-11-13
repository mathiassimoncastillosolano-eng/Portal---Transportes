import { useCallback, useEffect, useRef } from 'react'
import { borrarSesionAsientos } from '../servicios/viajesServicio'
import { cerrarReserva, forzarLiberacionDeVencidos } from '../servicios/reprogramacionAsientosServicio'

// Reprogramación · Cuida la reserva del asiento mientras dura el cambio de fecha.
//
// Hace tres cosas:
//  1. Temporizador: cuando la sesión llega a su hora de expiración avisa con alVencer().
//     Corre mientras se elige; se pausa durante el pago y al mostrar el resultado (pausada).
//     Cuando el cambio termina con éxito (finalizada) ya no se vuelve a armar.
//  2. liberarReserva(): suelta el asiento y borra la sesión (al volver a elegir viaje).
//  3. Al salir de la pantalla sin terminar, libera el asiento para no dejarlo bloqueado.
//     Si el cambio terminó con éxito NO se libera: el backend ya lo pasó a ocupado.
export function useReservaReprogramacion({ idViaje, sesion, idAsiento, pausada, finalizada, alVencer }) {
  // Los valores más recientes van en un ref para que los efectos y las funciones
  // de abajo siempre lean datos actuales sin volver a crearse.
  const reservaActual = useRef({})
  reservaActual.current = { idViaje, token: sesion?.tokenSesion, idAsiento, finalizada, alVencer }

  const liberarReserva = useCallback(() => {
    const { idViaje: viaje, token, idAsiento: asiento } = reservaActual.current
    if (viaje) cerrarReserva(viaje, token, asiento)
  }, [])

  // 1. Temporizador de la sesión.
  useEffect(() => {
    if (!sesion || pausada || finalizada) return undefined
    const milisegundosRestantes = Math.max(sesion.expiraEn - Date.now(), 0)
    const temporizador = setTimeout(() => {
      forzarLiberacionDeVencidos(reservaActual.current.idViaje)
      reservaActual.current.alVencer()
    }, milisegundosRestantes)
    return () => clearTimeout(temporizador)
  }, [sesion, pausada, finalizada])

  // Compra terminada con éxito: la sesión ya no sirve.
  useEffect(() => {
    if (finalizada && idViaje) borrarSesionAsientos(idViaje)
  }, [finalizada, idViaje])

  // 3. Al salir de la pantalla sin terminar el cambio.
  useEffect(() => () => {
    if (!reservaActual.current.finalizada) liberarReserva()
  }, [liberarReserva])

  return { liberarReserva }
}
