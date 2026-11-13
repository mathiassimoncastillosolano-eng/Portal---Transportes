/**
 * Separa una compra en los documentos PDF que debe recibir el cliente después de cambiar pasajes:
 * - un documento con los pasajes que siguen en el viaje original;
 * - un documento por cada pasaje cambiado, con su viaje nuevo.
 * Solo lee `boleto.cambio` y `boleto.viajeVigente`, así que sirve igual con datos simulados
 * que con los datos reales cuando el backend registre la postergación.
 */
export function documentosCambio(compra) {
  const viajeOriginal = {
    origen: compra.origen,
    destino: compra.destino,
    fechaSalida: compra.fechaSalida,
    horaSalida: compra.horaSalida,
    empresa: compra.empresa,
    tipoBus: compra.tipoBus,
  }
  const sinCambio = compra.boletos.filter((boleto) => !boleto.cambio)
  const cambiados = compra.boletos.filter((boleto) => boleto.cambio)
  const documentos = []

  if (sinCambio.length > 0) {
    documentos.push({
      tipo: 'original',
      clave: 'original',
      titulo: cambiados.length > 0 ? 'Viaje original actualizado' : 'Boletos de la compra',
      viaje: viajeOriginal,
      boletos: sinCambio,
      total: sumarPrecios(sinCambio),
    })
  }

  for (const boleto of cambiados) {
    const precio = Number(boleto.precio)
    const adicional = Number(boleto.cambio.adicionalPagado)
    documentos.push({
      tipo: 'cambiado',
      clave: `cambiado-${boleto.idPasaje}`,
      titulo: 'Pasaje cambiado',
      viaje: boleto.viajeVigente,
      anterior: boleto.cambio.anterior,
      boletos: [boleto],
      precioOriginal: precio,
      adicionalPagado: adicional,
      total: Number((precio + adicional).toFixed(2)),
    })
  }
  return documentos
}

/** Línea corta bajo el nombre de cada PDF: qué pasajes lleva y a qué viaje corresponde. */
export function resumenDocumento(documento) {
  const ruta = `${documento.viaje.origen} → ${documento.viaje.destino}`
  if (documento.tipo === 'cambiado') return `Boleto ${documento.boletos[0].numeroBoleto} · ${ruta}`
  const cantidad = documento.boletos.length
  return `${cantidad} ${cantidad === 1 ? 'pasaje' : 'pasajes'} · ${ruta}`
}

function sumarPrecios(boletos) {
  const suma = boletos.reduce((total, boleto) => total + Number(boleto.precio), 0)
  return Number(suma.toFixed(2))
}
