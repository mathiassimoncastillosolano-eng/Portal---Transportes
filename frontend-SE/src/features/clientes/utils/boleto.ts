import type { EstadoPasaje, ViajeHistorial } from '@/types/cliente'
import { formatearFechaLarga, nombrePropio } from '@/utils/formato'

export const ETIQUETA_ESTADO: Record<EstadoPasaje, string> = {
  CONFIRMADA: 'Confirmada',
  REEMBOLSADA: 'Reembolsada',
  SIN_CONFIRMAR: 'Sin confirmar',
}

export function formatearPrecio(valor: number | null, moneda: string): string {
  if (valor === null) return '—'
  try {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda || 'PEN', currencyDisplay: 'narrowSymbol' }).format(valor)
  } catch {
    return `${moneda} ${valor.toFixed(2)}`
  }
}

export function diasEntre(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.slice(0, 10).split('-').map(Number)
  const [yb, mb, db] = hasta.slice(0, 10).split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000)
}

export function textoLlegada(viaje: ViajeHistorial): string | null {
  if (!viaje.horaLlegada) return null
  const dias = viaje.fechaSalida && viaje.fechaLlegada ? diasEntre(viaje.fechaSalida, viaje.fechaLlegada) : 0
  return dias > 0 ? `${viaje.horaLlegada} (+${dias} ${dias === 1 ? 'día' : 'días'})` : viaje.horaLlegada
}

export function textoSalida(viaje: ViajeHistorial): string {
  if (!viaje.fechaSalida) return '—'
  return `${formatearFechaLarga(viaje.fechaSalida)}${viaje.horaSalida ? ` · ${viaje.horaSalida}` : ''}`
}

export function tituloDocumento(viaje: ViajeHistorial): string {
  return viaje.fase === 'PROXIMO' ? 'BOLETO ELECTRÓNICO' : 'CONSTANCIA DE COMPRA'
}

export function nombreArchivoPdf(viaje: ViajeHistorial): string {
  return `RutaLibre-${viaje.numeroBoleto.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
}

export function contenidoDocumento(viaje: ViajeHistorial) {
  if (!viaje.documentoDisponible) {
    throw new Error('El documento de este pasaje todavía no está disponible.')
  }
  const llegada = textoLlegada(viaje)
  return {
    titulo: tituloDocumento(viaje),
    ruta: `${viaje.origen} > ${viaje.destino}`,
    datos: [
      ['Compra', viaje.codigoCompra],
      ...(viaje.comprobante ? [['Comprobante', viaje.comprobante]] : []),
      ['Estado', ETIQUETA_ESTADO[viaje.estadoPasaje]],
      ['Salida', textoSalida(viaje)],
      ...(llegada ? [['Llegada estimada', llegada]] : []),
      ['Bus', viaje.bus ?? '—'],
    ] as [string, string][],
    boleto: {
      etiqueta: `Boleto · ${viaje.numeroBoleto}`,
      pasajero: viaje.pasajero ? nombrePropio(viaje.pasajero) : '—',
      documento: viaje.documento || '—',
      asiento: `Asiento ${viaje.asiento ?? '—'}${viaje.piso ? ` · Piso ${viaje.piso}` : ''}`,
      precio: formatearPrecio(viaje.precio, viaje.moneda),
    },
    nota: 'Documento generado a partir del pasaje registrado en RutaLibre. No incluye código QR de validación.',
  }
}

export async function descargarPdfBoleto(viaje: ViajeHistorial) {
  const doc = contenidoDocumento(viaje)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const azul: [number, number, number] = [10, 75, 91]
  const gris: [number, number, number] = [83, 102, 112]

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
  for (const [etiqueta, valor] of doc.datos) {
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
  pdf.setFillColor(244, 248, 248)
  pdf.roundedRect(18, y - 7, 174, 26, 2, 2, 'F')
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(...gris)
  pdf.text(doc.boleto.etiqueta, 23, y)
  pdf.text(doc.boleto.documento, 23, y + 15)
  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...azul)
  pdf.text(doc.boleto.pasajero, 23, y + 8)
  pdf.text(doc.boleto.asiento, 125, y + 8)
  pdf.text(doc.boleto.precio, 187, y + 8, { align: 'right' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...gris)
  pdf.text(doc.nota, 105, 285, { align: 'center', maxWidth: 170 })
  pdf.save(nombreArchivoPdf(viaje))
}
