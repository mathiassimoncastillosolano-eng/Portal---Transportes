import { Stepper, type StepperStep } from '@/components/ui/Stepper'
import { useTicketWizard } from '../hooks/useTicketWizard'
import { PASOS } from '../types'

export function BookingStepper() {
  const { paso, pasoIndex, viaje, asientos, cantidadPasajes, cantidadCompletados, irA, volverABuscar } = useTicketWizard()

  const detalle: Record<string, Pick<StepperStep, 'description' | 'summary'>> = {
    viaje: {
      description: 'Ruta y horario',
      summary: viaje ? `${viaje.origen} → ${viaje.destino} · ${viaje.horaSalida}` : undefined,
    },
    asientos: {
      description: 'Elige los asientos',
      summary: asientos.length ? `${asientos.length === 1 ? 'Asiento' : 'Asientos'} ${asientos.map((a) => a.numero).join(', ')}` : undefined,
    },
    pasajeros: {
      description: 'Datos de viaje',
      summary: cantidadPasajes ? `${cantidadCompletados} de ${cantidadPasajes} completos` : undefined,
    },
    pago: {
      description: 'Forma de pago',
    },
  }

  const pasos: StepperStep[] = PASOS.map((p) => ({ id: p.id, label: p.label, ...detalle[p.id] }))

  function alIrAPaso(indice: number) {
    const destino = PASOS[indice].id
    if (destino === 'viaje') volverABuscar()
    else irA(destino)
  }

  return <Stepper steps={pasos} current={pasoIndex} onStepClick={paso === 'viaje' ? undefined : alIrAPaso} />
}
