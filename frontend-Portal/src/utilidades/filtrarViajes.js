// Las franjas coinciden con las opciones que muestra FiltrosResultados.
const HORAS_POR_FRANJA = {
  madrugada: [0, 5],
  'mañana': [6, 11],
  tarde: [12, 18],
  noche: [19, 23],
}

export function filtrarViajes(viajes, horario, serviciosSeleccionados) {
  return viajes.filter((viaje) => {
    const hora = Number(String(viaje.horaSalida).split(':')[0])
    const rango = HORAS_POR_FRANJA[horario]
    const coincideHorario = !rango || (hora >= rango[0] && hora <= rango[1])
    const coincideServicio = serviciosSeleccionados.size === 0 || serviciosSeleccionados.has(viaje.tipoBus)
    return coincideHorario && coincideServicio
  })
}
