import { Clock } from 'lucide-react'
import { HORAS_MINIMAS } from '../reglas'

/** Texto pequeño en rojo junto a "Ver boleto": faltan menos de 6 h y ya no se puede cambiar el viaje. */
export function AvisoPlazoCambio() {
  const explicacion = `Faltan menos de ${HORAS_MINIMAS} h para la salida: ya no se puede cambiar el viaje.`
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-danger-500" title={explicacion}>
      <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
      {`Menos de ${HORAS_MINIMAS} h`}
      <span className="sr-only">{explicacion}</span>
    </span>
  )
}
