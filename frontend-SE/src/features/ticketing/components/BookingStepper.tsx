import { Stepper, type StepperStep } from '@/components/ui/Stepper'
import { formatearMoneda } from '@/utils/formato'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { PASOS } from '../types'
import { codigoDeAsiento } from '@/utils/asientos'
import { useAsientos } from '../hooks/useAsientos'

/**
 * Progreso del registro. Cada paso muestra su subtítulo mientras está
 * pendiente/actual y, al completarse, un resumen de lo elegido
 * ("Lima → Trujillo · 08:00", "Asientos 3A, 3B"…) para no perder el hilo.
 * "Confirmación" corresponde al paso de verificación previo a emitir; al
 * registrarse la operación todos los pasos quedan completos.
 */
export function BookingStepper() {
  const { paso, pasoIndex, viaje, asientos, cantidadPasajes, cantidadCompletados, pago, total, irA } = useTicketWizard()
  const { datos } = useAsientos(viaje?.id)

  const codigos = datos ? asientos.map((a) => codigoDeAsiento(a, datos.servicio.distribucion)) : asientos.map(String)

  const detalle: Record<string, Pick<StepperStep, 'description' | 'summary'>> = {
    viaje: {
      description: 'Ruta y horario',
      summary: viaje ? `${viaje.origen} → ${viaje.destino} · ${viaje.hora}` : undefined,
    },
    asientos: {
      description: 'Elige tus asientos',
      summary: asientos.length ? `${asientos.length === 1 ? 'Asiento' : 'Asientos'} ${codigos.join(', ')}` : undefined,
    },
    pasajeros: {
      description: 'Datos de viaje',
      summary: cantidadPasajes ? `${cantidadCompletados} de ${cantidadPasajes} completos` : undefined,
    },
    pago: {
      description: 'Método y monto',
      summary: pago.metodoPagoId ? `Total ${formatearMoneda(total)}` : undefined,
    },
    revision: { description: 'Verifica y confirma' },
  }

  const pasos: StepperStep[] = PASOS.filter((p) => p.id !== 'confirmacion').map((p) => ({
    id: p.id,
    label: p.label,
    ...detalle[p.id],
  }))

  return (
    <Stepper
      steps={pasos}
      current={paso === 'confirmacion' ? pasos.length : pasoIndex}
      onStepClick={paso === 'confirmacion' ? undefined : (i) => irA(PASOS[i].id)}
    />
  )
}
