import { jsPDF } from 'jspdf'

/** Comprobante visual para probar la descarga durante el desarrollo. */
export async function descargarPdfCompraDemo(compra) {
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
  pdf.text('DETALLE DE COMPRA', 192, 18, { align: 'right' })

  pdf.setTextColor(...azul)
  pdf.setFontSize(18)
  pdf.text(`${compra.origen}  >  ${compra.destino}`, 18, 52)
  pdf.setTextColor(...gris)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.text(`Compra: ${compra.id}`, 18, 63)
  pdf.text(`Salida: ${compra.fecha} a las ${compra.hora}`, 18, 72)
  pdf.text(`Servicio: ${compra.empresa} / ${compra.tipoBus}`, 18, 81)

  pdf.setDrawColor(205, 219, 224)
  pdf.line(18, 90, 192, 90)
  pdf.setTextColor(...azul)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(`Boletos (${compra.boletos.length})`, 18, 101)
  let y = 114
  for (const [indice, boleto] of compra.boletos.entries()) {
    if (y > 250) { pdf.addPage(); y = 25 }
    pdf.setFillColor(244, 248, 248)
    pdf.roundedRect(18, y - 7, 174, 22, 2, 2, 'F')
    pdf.setFontSize(10)
    pdf.setTextColor(...gris)
    pdf.text(`Boleto ${indice + 1}`, 23, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...azul)
    pdf.text(`Asiento ${boleto.asiento}`, 23, y + 8)
    pdf.text(String(boleto.codigo), 100, y + 8)
    pdf.text(`S/ ${Number(boleto.precio || 0).toFixed(2)}`, 185, y + 8, { align: 'right' })
    y += 29
  }
  if (y > 260) { pdf.addPage(); y = 25 }
  pdf.setDrawColor(205, 219, 224)
  pdf.line(18, y, 192, y)
  pdf.setFontSize(13)
  pdf.text('Total de la compra', 18, y + 13)
  pdf.text(`S/ ${compra.total.toFixed(2)}`, 192, y + 13, { align: 'right' })

  pdf.setTextColor(190, 58, 49)
  pdf.setFontSize(10)
  pdf.text('DEMOSTRACION - NO VALIDO PARA VIAJAR', 105, 275, { align: 'center' })
  pdf.setTextColor(...gris)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text('Los datos de esta vista no provienen de la base de datos.', 105, 283, { align: 'center' })
  const nombreSeguro = String(compra.id).replace(/[^a-zA-Z0-9_-]/g, '_')
  pdf.save(`RutaLibre-${nombreSeguro}-DEMO.pdf`)
}
