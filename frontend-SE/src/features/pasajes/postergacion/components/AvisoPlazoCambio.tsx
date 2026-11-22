import { Clock } from 'lucide-react'
import { HORAS_MINIMAS } from '../reglas'

/** Aviso pequeño en la tarjeta del pasaje: faltan menos de 6 h y ya no se puede cambiar el viaje. */
export function AvisoPlazoCambio() {
  const explicacion = `Faltan menos de ${HORAS_MINIMAS} h para la salida: ya no se puede cambiar el viaje.`
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-500" title={explicacion}>
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      {`Menos de ${HORAS_MINIMAS} h`}
      <span className="sr-only">{explicacion}</span>
    </span>
  )
}
