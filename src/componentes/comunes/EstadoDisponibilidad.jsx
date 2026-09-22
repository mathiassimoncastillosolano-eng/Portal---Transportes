import './estadoDisponibilidad.css'

const CONFIGURACION_ESTADOS = {
  disponible: { etiqueta: 'Disponible', clase: 'estado-disponibilidad--disponible' },
  'pocos-asientos': { etiqueta: 'Pocos asientos', clase: 'estado-disponibilidad--pocos' },
  agotado: { etiqueta: 'Agotado', clase: 'estado-disponibilidad--agotado' },
  confirmado: { etiqueta: 'Confirmado', clase: 'estado-disponibilidad--disponible' },
  completado: { etiqueta: 'Completado', clase: 'estado-disponibilidad--completado' },
  cancelado: { etiqueta: 'Cancelado', clase: 'estado-disponibilidad--agotado' },
}

function etiquetaAsientos(estado, asientosDisponibles) {
  if (typeof asientosDisponibles !== 'number') return null
  if (estado === 'agotado') return null
  if (asientosDisponibles < 10) {
    return `Últimos ${asientosDisponibles} asiento${asientosDisponibles === 1 ? '' : 's'}`
  }
  return `${asientosDisponibles} asientos disponibles`
}

export function EstadoDisponibilidad({ estado, asientosDisponibles }) {
  const configuracion = CONFIGURACION_ESTADOS[estado] ?? CONFIGURACION_ESTADOS.disponible
  const etiqueta = etiquetaAsientos(estado, asientosDisponibles) ?? configuracion.etiqueta
  return (
    <span className={`estado-disponibilidad ${configuracion.clase}`}>
      <span className="estado-disponibilidad__punto" />
      {etiqueta}
    </span>
  )
}
