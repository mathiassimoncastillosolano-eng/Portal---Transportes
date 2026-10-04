function fechaDentroDe(dias) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

/** Datos exclusivamente para revisar las pantallas durante el desarrollo. */
export function boletosDemo() {
  return [
    {
      codigo: 'DEMO-001', compraId: 'COMPRA-DEMO-001', estado: 'confirmado', origen: 'Lima', destino: 'Cusco',
      fecha: fechaDentroDe(7), hora: '08:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama',
      asiento: '12A', precio: 95,
    },
    {
      codigo: 'DEMO-002', compraId: 'COMPRA-DEMO-001', estado: 'confirmado', origen: 'Lima', destino: 'Cusco',
      fecha: fechaDentroDe(7), hora: '08:00', empresa: 'RutaLibre', tipoBus: 'Bus Cama',
      asiento: '12B', precio: 95,
    },
    {
      codigo: 'DEMO-003', compraId: 'COMPRA-DEMO-002', estado: 'cancelado', origen: 'Lima', destino: 'Ica',
      fecha: fechaDentroDe(8), hora: '09:00', empresa: 'RutaLibre', tipoBus: 'Semi Cama',
      asiento: '03A', precio: 50,
    },
  ]
}
