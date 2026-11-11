import { formatearFechaLarga, formatearPrecio } from '../utilidades/formato.js'

/**
 * Documento descargable de una compra REAL. Se arma solo con lo que devolvió el backend para el usuario
 * autenticado; no hay datos de relleno ni QR (el sistema no tiene un esquema de validación de boletos, así
 * que no se genera uno que pueda parecer válido). Solo se emite si el backend marcó `documentoDisponible`.
 */
export function tituloDocumento(compra) {
  return compra.vigente ? 'BOLETO ELECTRÓNICO' : 'CONSTANCIA DE COMPRA'
}

export function nombreArchivoPdf(compra) {
  return `RutaLibre-${String(compra.codigoCompra ?? compra.idVenta).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
}

/** Estructura de lo que se imprime; separada del dibujo para poder probarla sin jsPDF. */
export function contenidoDocumento(compra) {
  if (!compra?.documentoDisponible) {
    throw new Error('El documento de esta compra todavía no está disponible.')
  }
  return {
    titulo: tituloDocumento(compra),
    encabezado: [
      ['Compra', compra.codigoCompra],
      ...(compra.comprobante ? [['Comprobante', compra.comprobante]] : []),
      ['Estado de la compra', 'Confirmada'],
    ],
    ruta: `${compra.origen} > ${compra.destino}`,
    viaje: [
      ['Salida', `${formatearFechaLarga(compra.fechaSalida)} · ${compra.horaSalida}`],
      ['Servicio', `${compra.empresa} · ${compra.tipoBus}`],
    ],
    boletos: compra.boletos.map((boleto, indice) => ({
      etiqueta: `Boleto ${indice + 1} · ${boleto.numeroBoleto}`,
      pasajero: boleto.pasajero ?? '—',
      documento: boleto.documento ?? '—',
      asiento: `Asiento ${boleto.asiento ?? '—'}`,
      precio: formatearPrecio(boleto.precio, compra.moneda),
    })),
    total: formatearPrecio(compra.total, compra.moneda),
    nota: 'Documento generado a partir de la compra registrada en RutaLibre. No incluye código QR de validación.',
  }
}

export async function descargarPdfCompra(compra) {
  const doc = contenidoDocumento(compra)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const azul = [10, 75, 91]
  const gris = [83, 102, 112]

  pdf.setFillColor(...azul)
  pdf.rect(0, 0, 210, 32, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.text('RutaLibre', 18, 19)
  pdf.setFontSize(9)
  pdf.text(doc.titulo, 192, 18, { align: 'right' })

  pdf.setTextColor(...azul)
  pdf.setFontSize(20)
  pdf.text(doc.ruta, 18, 50)

  let y = 61
  pdf.setFontSize(10.5)
  for (const [etiqueta, valor] of [...doc.encabezado, ...doc.viaje]) {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...gris)
    pdf.text(etiqueta, 18, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...azul)
    pdf.text(String(valor), 62, y)
    y += 8
  }

  y += 4
  pdf.setDrawColor(205, 219, 224)
  pdf.line(18, y, 192, y)
  y += 11
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Boletos (${doc.boletos.length})`, 18, y)
  y += 11

  for (const boleto of doc.boletos) {
    if (y > 245) {
      pdf.addPage()
      y = 25
    }
    pdf.setFillColor(244, 248, 248)
    pdf.roundedRect(18, y - 7, 174, 26, 2, 2, 'F')
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...gris)
    pdf.text(boleto.etiqueta, 23, y)
    pdf.text(`${boleto.documento}`, 23, y + 15)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...azul)
    pdf.text(boleto.pasajero, 23, y + 8)
    pdf.text(boleto.asiento, 125, y + 8)
    pdf.text(boleto.precio, 187, y + 8, { align: 'right' })
    y += 32
  }

  if (y > 255) {
    pdf.addPage()
    y = 25
  }
  pdf.setDrawColor(205, 219, 224)
  pdf.line(18, y, 192, y)
  pdf.setFontSize(13)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...azul)
  pdf.text('Total de la compra', 18, y + 12)
  pdf.text(doc.total, 192, y + 12, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...gris)
  pdf.text(doc.nota, 105, 285, { align: 'center', maxWidth: 170 })
  pdf.save(nombreArchivoPdf(compra))
}
