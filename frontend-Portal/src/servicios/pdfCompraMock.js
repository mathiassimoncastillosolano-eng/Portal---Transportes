import { formatearFechaCorta, formatearPrecio } from '../utilidades/formato.js'

/** Nombre del archivo: uno para el viaje original y otro por cada pasaje cambiado. */
export function nombreArchivoMock(compra, documento) {
  const sufijo = documento.tipo === 'cambiado'
    ? `${documento.boletos[0].numeroBoleto}-cambiado`
    : 'viaje-original'
  return `RutaLibre-${compra.codigoCompra}-${sufijo}-prueba.pdf`
}

/**
 * PDF de prueba de UN documento de `documentosCambio`: el viaje original con los pasajes
 * que quedaron, o un pasaje cambiado con su viaje nuevo.
 */
export async function crearPdfDocumentoMock(compra, documento) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const azul = [15, 76, 92]
  const gris = [83, 102, 112]
  const tinta = [25, 55, 67]
  const verde = [14, 122, 60]
  const esCambio = documento.tipo === 'cambiado'
  const color = esCambio ? verde : azul
  const viaje = documento.viaje
  const texto = (valor, x, y, opciones) => pdf.text(String(valor), x, y, opciones)

  // Encabezado
  pdf.setFillColor(...azul)
  pdf.rect(0, 0, 210, 31, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  texto('RutaLibre', 15, 16)
  pdf.setFontSize(8)
  texto('DOCUMENTO DE PRUEBA - SIN VALIDEZ PARA VIAJAR', 195, 16, { align: 'right' })

  // Título y viaje del documento
  pdf.setTextColor(...color)
  pdf.setFontSize(9)
  texto(documento.titulo.toUpperCase(), 15, 43)
  pdf.setFontSize(18)
  texto(`${viaje.origen} - ${viaje.destino}`, 15, 53)

  let y = 63
  const filas = [
    ['Compra', compra.codigoCompra],
    ['Salida', `${formatearFechaCorta(viaje.fechaSalida)} ${viaje.horaSalida}`],
    ['Servicio', `${viaje.empresa} - ${viaje.tipoBus}`],
  ]
  pdf.setFontSize(9.5)
  for (const [etiqueta, valor] of filas) {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...gris)
    texto(etiqueta, 15, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...tinta)
    texto(valor, 50, y)
    y += 7
  }

  // Solo el pasaje cambiado indica a qué viaje reemplaza.
  if (esCambio) {
    const anterior = documento.anterior
    pdf.setFillColor(244, 248, 248)
    pdf.roundedRect(15, y, 180, 12, 2, 2, 'F')
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...gris)
    texto(`Reemplaza a: ${anterior.origen} - ${anterior.destino}, ${formatearFechaCorta(anterior.fechaSalida)} ${anterior.horaSalida}, asiento ${anterior.asiento}`, 20, y + 7.5)
    y += 18
  } else {
    y += 4
  }

  // Un recuadro por boleto
  for (const boleto of documento.boletos) {
    if (y + 26 > 255) {
      pdf.addPage()
      y = 20
    }
    const numero = compra.boletos.indexOf(boleto) + 1
    pdf.setFillColor(...(esCambio ? [232, 248, 238] : [244, 248, 248]))
    pdf.setDrawColor(...(esCambio ? verde : [205, 219, 224]))
    pdf.roundedRect(15, y, 180, 24, 3, 3, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...color)
    texto(`BOLETO ${numero}  ${boleto.numeroBoleto}`, 20, y + 8)
    texto(`Asiento ${boleto.asiento}`, 190, y + 8, { align: 'right' })
    pdf.setTextColor(...tinta)
    texto(boleto.pasajero ?? '-', 20, y + 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(...gris)
    texto(boleto.documento ?? '', 20, y + 21)
    texto(formatearPrecio(boleto.precio, compra.moneda), 190, y + 16, { align: 'right' })
    y += 28
  }

  // Totales
  if (y + 32 > 275) {
    pdf.addPage()
    y = 20
  }
  pdf.setDrawColor(205, 219, 224)
  pdf.line(15, y, 195, y)
  y += 9
  if (esCambio) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...gris)
    texto('Precio del pasaje original', 15, y)
    texto(formatearPrecio(documento.precioOriginal, compra.moneda), 195, y, { align: 'right' })
    texto('Diferencia pagada por el cambio', 15, y + 7)
    texto(formatearPrecio(documento.adicionalPagado, compra.moneda), 195, y + 7, { align: 'right' })
    y += 17
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...azul)
  texto(esCambio ? 'TOTAL PAGADO' : 'TOTAL DE ESTOS PASAJES', 15, y)
  texto(formatearPrecio(documento.total, compra.moneda), 195, y, { align: 'right' })

  // Pie de página
  const paginas = pdf.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    pdf.setPage(pagina)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...gris)
    texto('Vista previa simulada. Ningún cambio ni pago se registró en el sistema.', 15, 287)
    texto(`${pagina}/${paginas}`, 195, 287, { align: 'right' })
  }
  return pdf
}

export async function descargarPdfDocumentoMock(compra, documento) {
  const pdf = await crearPdfDocumentoMock(compra, documento)
  pdf.save(nombreArchivoMock(compra, documento))
}

export async function verPdfDocumentoMock(compra, documento) {
  // Abrir la pestaña antes del await evita que el navegador bloquee el visor.
  const pestaña = window.open('', '_blank')
  if (!pestaña) throw new Error('No se pudo abrir una pestaña para el PDF.')
  pestaña.opener = null
  try {
    const pdf = await crearPdfDocumentoMock(compra, documento)
    pestaña.location.replace(pdf.output('bloburl'))
  } catch (error) {
    pestaña.close()
    throw error
  }
}
