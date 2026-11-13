import { formatearFechaCorta, formatearPrecio } from '../utilidades/formato.js'

/** PDF de la compra simulada. Se genera con el estado actual de cada boleto. */
export async function descargarPdfCompraMock(compra) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const azul = [15, 76, 92]
  const gris = [83, 102, 112]
  const tinta = [25, 55, 67]
  const verde = [14, 122, 60]
  const texto = (valor, x, y, opciones) => pdf.text(String(valor), x, y, opciones)

  pdf.setFillColor(...azul)
  pdf.rect(0, 0, 210, 31, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  texto('RutaLibre', 15, 16)
  pdf.setFontSize(8)
  texto('DOCUMENTO DE PRUEBA - SIN VALIDEZ PARA VIAJAR', 195, 16, { align: 'right' })

  pdf.setTextColor(...azul)
  pdf.setFontSize(11)
  texto(`Compra ${compra.codigoCompra}`, 15, 43)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  texto(`Viaje original: ${compra.origen} - ${compra.destino}`, 15, 50)
  texto(`Salida original: ${formatearFechaCorta(compra.fechaSalida)} ${compra.horaSalida}`, 15, 56)

  let y = 65
  for (const [indice, boleto] of compra.boletos.entries()) {
    const alto = boleto.cambio ? 48 : 39
    if (y + alto > 262) {
      pdf.addPage()
      y = 20
    }
    pdf.setFillColor(...(boleto.cambio ? [232, 248, 238] : [244, 248, 248]))
    pdf.setDrawColor(...(boleto.cambio ? verde : [205, 219, 224]))
    pdf.roundedRect(15, y, 180, alto, 3, 3, 'FD')
    pdf.setTextColor(...(boleto.cambio ? verde : azul))
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    texto(`BOLETO ${indice + 1}  ${boleto.numeroBoleto}`, 20, y + 8)
    texto(boleto.cambio ? 'VIAJE CAMBIADO' : 'SIN CAMBIOS', 190, y + 8, { align: 'right' })
    pdf.setTextColor(...tinta)
    texto(boleto.pasajero, 20, y + 16)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    texto(`Viaje vigente: ${boleto.viajeVigente.origen} - ${boleto.viajeVigente.destino}`, 20, y + 23)
    texto(`Salida: ${formatearFechaCorta(boleto.viajeVigente.fechaSalida)} ${boleto.viajeVigente.horaSalida}`, 20, y + 29)
    texto(`Asiento: ${boleto.asiento}  |  Servicio: ${boleto.viajeVigente.tipoBus}`, 20, y + 35)
    if (boleto.cambio) {
      pdf.setTextColor(...gris)
      texto(`Antes: ${boleto.cambio.anterior.origen} - ${boleto.cambio.anterior.destino}, ${formatearFechaCorta(boleto.cambio.anterior.fechaSalida)} ${boleto.cambio.anterior.horaSalida}, asiento ${boleto.cambio.anterior.asiento}`, 20, y + 42)
    }
    y += alto + 4
  }

  if (y + 35 > 275) {
    pdf.addPage()
    y = 20
  }
  pdf.setDrawColor(205, 219, 224)
  pdf.line(15, y + 2, 195, y + 2)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...gris)
  texto('Compra original', 15, y + 11)
  texto(formatearPrecio(compra.total, compra.moneda), 195, y + 11, { align: 'right' })
  texto('Pagos adicionales por cambios', 15, y + 18)
  texto(formatearPrecio(compra.totalPagado - compra.total, compra.moneda), 195, y + 18, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.setTextColor(...azul)
  texto('TOTAL PAGADO', 15, y + 28)
  texto(formatearPrecio(compra.totalPagado, compra.moneda), 195, y + 28, { align: 'right' })

  const paginas = pdf.getNumberOfPages()
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    pdf.setPage(pagina)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7)
    pdf.setTextColor(...gris)
    texto('Ejemplo local. Ningún cambio ni pago se registró en el sistema.', 15, 287)
    texto(`${pagina}/${paginas}`, 195, 287, { align: 'right' })
  }
  pdf.save(`RutaLibre-${compra.codigoCompra}-prueba.pdf`)
}
