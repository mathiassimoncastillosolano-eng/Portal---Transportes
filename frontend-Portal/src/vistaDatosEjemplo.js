// Datos locales para recorrer las dos pantallas sin iniciar sesión.
export const compraEjemplo = {
  idVenta: 22,
  codigoCompra: 'RL-C-000022',
  estado: 'CONFIRMADA',
  fase: 'PROXIMO',
  vigente: true,
  documentoDisponible: true,
  incompleta: false,
  totalConsistente: true,
  origen: 'Trujillo',
  destino: 'Cajamarca',
  fechaSalida: '2026-11-21',
  horaSalida: '21:00',
  empresa: 'RutaLibre',
  tipoBus: 'Bus Cama',
  fechaCompra: '2026-11-13T03:46:00Z',
  moneda: 'PEN',
  total: 129,
  boletos: [
    { idPasaje: 25, numeroBoleto: 'RL-B-000025', pasajero: 'Lucas Leonardo Muñoz Wong', documento: 'DNI ****633', asiento: '4A', precio: 43 },
    { idPasaje: 26, numeroBoleto: 'RL-B-000026', pasajero: 'Fátima del Carmen Muñoz Wong', documento: 'DNI ****642', asiento: '4B', precio: 43 },
    { idPasaje: 27, numeroBoleto: 'RL-B-000027', pasajero: 'Karina Jacqueline Aguilar Zavaleta', documento: 'DNI ****803', asiento: '5B', precio: 43 },
  ],
}

export function pasajeEjemplo(idPasaje) {
  const boleto = compraEjemplo.boletos.find((item) => item.idPasaje === Number(idPasaje)) ?? compraEjemplo.boletos[0]
  return {
    ...compraEjemplo,
    ...boleto,
    estado: 'VIGENTE',
    fechaCompra: compraEjemplo.fechaCompra,
    precioPagado: boleto.precio,
  }
}

export const cambioEjemplo = {
  idPasaje: 26,
  origen: 'Trujillo',
  destino: 'Lima',
  fechaSalida: '2026-11-24',
  horaSalida: '08:00',
  servicio: 'Bus Cama',
  asiento: '12A',
  diferenciaPagada: 17,
  fechaCambio: '2026-11-13T10:00:00-05:00',
}
