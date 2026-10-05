import { useEffect, useState } from 'react'
import './contador.css'

function formatearTiempo(ms) {
  const totalSegundos = Math.max(Math.floor(ms / 1000), 0)
  const minutos = Math.floor(totalSegundos / 60)
  const segundos = totalSegundos % 60
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}

/**
 * Cuenta regresiva hasta `expiraEn` (timestamp en ms que ya calcula el
 * backend según `reserva.bloqueo-minutos` de application.properties; ver
 * `sesion.expiraEn` en `obtenerOCrearSesion` dentro de viajesServicio.js).
 * Con `pausado` (pago ya completado) deja de actualizarse y se congela
 * en su último valor, sin disparar nada: la redirección por expiración
 * ya la maneja `manejarSesionVencida` en PaginaReserva.
 */
export function Contador({ expiraEn, pausado = false }) {
  const [restanteMs, setRestanteMs] = useState(() => (expiraEn ? Math.max(expiraEn - Date.now(), 0) : 0))

  useEffect(() => {
    if (!expiraEn || pausado) return undefined

    function actualizar() {
      setRestanteMs(Math.max(expiraEn - Date.now(), 0))
    }

    actualizar()
    const intervalo = setInterval(actualizar, 1000)
    return () => clearInterval(intervalo)
  }, [expiraEn, pausado])

  if (!expiraEn) return null

  return (
    <div className="contador-reserva" role="timer" aria-live="polite">
      <span className="contador-reserva__etiqueta">Tiempo de expiración</span>
      <span className="contador-reserva__tiempo">{formatearTiempo(restanteMs)}</span>
    </div>
  )
}