export const ESCENARIO_INICIAL = Object.freeze({
  tarifa: 'natural',
  pago: 'aprobado',
  asiento: 'disponible',
})

export const OPCIONES_TARIFA = Object.freeze([
  { valor: 'natural', etiqueta: 'Según el viaje elegido' },
  { valor: 'igual', etiqueta: 'Tarifas iguales' },
  { valor: 'superior', etiqueta: 'Nueva tarifa superior' },
  { valor: 'inferior', etiqueta: 'Nueva tarifa inferior' },
])

export const OPCIONES_PAGO = Object.freeze([
  { valor: 'aprobado', etiqueta: 'Pago aprobado' },
  { valor: 'rechazado', etiqueta: 'Pago rechazado' },
  { valor: 'pendiente', etiqueta: 'Pago pendiente' },
  { valor: 'error', etiqueta: 'Error de procesamiento' },
])

export const OPCIONES_ASIENTO = Object.freeze([
  { valor: 'disponible', etiqueta: 'Asiento disponible' },
  { valor: 'se-pierde', etiqueta: 'Asiento deja de estar disponible' },
])

export const DIFERENCIA_FORZADA_SUPERIOR = 20
export const DIFERENCIA_FORZADA_INFERIOR = 15
