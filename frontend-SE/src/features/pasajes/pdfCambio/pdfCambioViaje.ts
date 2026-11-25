import logoClaro from '@/assets/logo/logo-claro.png'
import { formatearPrecio } from '@/features/clientes/utils/boleto'
import { formatearFecha, formatearFechaHora, nombrePropio } from '@/utils/formato'

export interface ViajePdf {
  origen: string
  destino: string
  fechaSalida: string // '2026-11-29'
  horaSalida: string // '20:00'
  asiento: string
  bus: string | null
}

export interface DatosCambioPdf {
  numeroBoleto: string
  codigoCompra: string
  pasajero: string
  documento: string
  moneda: string // 'PEN'
  anterior: ViajePdf
  nuevo: ViajePdf
  importePagado: number // lo que ya había pagado
  tarifaNueva: number
  escenario: 'IGUAL' | 'SUPERIOR' | 'INFERIOR'
  diferenciaCobrada: number
  diferenciaNoDevuelta: number
  metodoPago: 'Efectivo' | 'Yape' | 'Tarjeta' | null
  fechaCambio: string // ISO '2026-11-24T10:30:00'
}

type Fila = [string, string]
type Color = [number, number, number]

const AZUL: Color = [10, 75, 91]
const GRIS: Color = [83, 102, 112]
const VERDE: Color = [16, 185, 129]
const VERDE_OSCURO: Color = [21, 128, 61]
const AMBAR: Color = [176, 118, 20]

const TITULO = 'CONSTANCIA DE CAMBIO DE VIAJE'
const NOTA =
  'El pasajero conserva el mismo boleto y la misma compra. Documento generado a partir del cambio registrado en RutaLibre.'

function textoViaje(viaje: ViajePdf): string {
  return `${viaje.origen} - ${viaje.destino}, ${formatearFecha(viaje.fechaSalida)} ${viaje.horaSalida}`
}

function resultadoCambio(datos: DatosCambioPdf) {
  if (datos.escenario === 'SUPERIOR') {
    return {
      titulo: 'Pago adicional por diferencia de tarifa',
      monto: formatearPrecio(datos.diferenciaCobrada, datos.moneda) as string | null,
      detalle: `Método de pago: ${datos.metodoPago ?? '—'}` as string | null,
      acento: AZUL,
    }
  }
  if (datos.escenario === 'INFERIOR') {
    return {
      titulo: 'Sin reembolso de la diferencia',
      monto: formatearPrecio(datos.diferenciaNoDevuelta, datos.moneda) as string | null,
      detalle: 'No se devuelve ni queda como saldo a favor.' as string | null,
      acento: AMBAR,
    }
  }
  return { titulo: 'Sin costo adicional', monto: null as string | null, detalle: null as string | null, acento: VERDE_OSCURO }
}

export function nombreArchivoPdfCambio(numeroBoleto: string): string {
  return `RutaLibre-Cambio-${numeroBoleto.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
}

export function contenidoPdfCambio(datos: DatosCambioPdf) {
  const { nuevo } = datos
  const filas: Fila[] = [
    ['Compra', datos.codigoCompra],
    ['Salida', `${formatearFecha(nuevo.fechaSalida)} ${nuevo.horaSalida}`],
  ]
  if (nuevo.bus) filas.push(['Bus', nuevo.bus])

  return {
    titulo: TITULO,
    boleto: `Boleto ${datos.numeroBoleto}`,
    etiqueta: 'VIAJE VIGENTE',
    ruta: `${nuevo.origen} - ${nuevo.destino}`,
    filas,
    reemplaza: [
      `Reemplaza a: ${textoViaje(datos.anterior)}, asiento ${datos.anterior.asiento}`,
      `Cambio realizado el ${formatearFechaHora(datos.fechaCambio).replace(' · ', ', ').replace(' h', '')}`,
    ],
    pasajero: {
      boleto: `BOLETO ${datos.numeroBoleto}`,
      asiento: `Asiento ${nuevo.asiento}`,
      nombre: nombrePropio(datos.pasajero),
      documento: datos.documento,
    },
    importes: [
      ['Ya pagado', formatearPrecio(datos.importePagado, datos.moneda)],
      ['Tarifa nueva', formatearPrecio(datos.tarifaNueva, datos.moneda)],
    ] as Fila[],
    resultado: resultadoCambio(datos),
    nota: NOTA,
    archivo: nombreArchivoPdfCambio(datos.numeroBoleto),
  }
}

async function cargarLogo(): Promise<string | null> {
  try {
    const blob = await (await fetch(logoClaro)).blob()
    return await new Promise<string>((resolver, rechazar) => {
      const lector = new FileReader()
      lector.onload = () => resolver(lector.result as string)
      lector.onerror = () => rechazar(lector.error)
      lector.readAsDataURL(blob)
    })
  } catch {
    return null // sin logo el PDF se genera igual
  }
}

export async function descargarPdfCambio(datos: DatosCambioPdf): Promise<void> {
  const doc = contenidoPdfCambio(datos)
  const { jsPDF } = await import('jspdf')
  const logo = await cargarLogo()
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

  const partir = (texto: string, ancho: number, tamano: number, negrita: boolean): string[] => {
    pdf.setFont('helvetica', negrita ? 'bold' : 'normal')
    pdf.setFontSize(tamano)
    return pdf.splitTextToSize(texto, ancho) as string[]
  }

  // Encabezado
  pdf.setFillColor(...AZUL)
  pdf.rect(0, 0, 210, 34, 'F')
  pdf.setFillColor(...VERDE)
  pdf.rect(0, 34, 210, 1.2, 'F')
  if (logo) pdf.addImage(logo, 'PNG', 18, 9.5, 24.6, 15.6)
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.text('RutaLibre', logo ? 47 : 18, 19.5)
  pdf.setFontSize(8.5)
  pdf.text(doc.titulo, 192, 15, { align: 'right' })
  pdf.setFontSize(13)
  pdf.text(doc.boleto, 192, 23, { align: 'right' })

  // Viaje vigente
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...VERDE_OSCURO)
  pdf.text(doc.etiqueta, 18, 47)

  const ruta = partir(doc.ruta, 174, 18, true)
  pdf.setTextColor(...VERDE_OSCURO)
  ruta.forEach((linea, i) => pdf.text(linea, 18, 57 + i * 8))
  let y = 57 + (ruta.length - 1) * 8 + 10

  for (const [etiqueta, valor] of doc.filas) {
    const lineas = partir(valor, 130, 10.5, true)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...GRIS)
    pdf.text(etiqueta, 18, y)
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(...AZUL)
    lineas.forEach((linea, i) => pdf.text(linea, 62, y + i * 5))
    y += Math.max(8, lineas.length * 5 + 3)
  }

  // Viaje anterior: una nota discreta, no una tarjeta
  y += 3
  const nota = doc.reemplaza.flatMap((texto) => partir(texto, 164, 9, false))
  const altoNota = 8 + nota.length * 4.6
  pdf.setFillColor(244, 246, 247)
  pdf.roundedRect(18, y, 174, altoNota, 2, 2, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...GRIS)
  nota.forEach((linea, i) => pdf.text(linea, 23, y + 6.5 + i * 4.6))
  y += altoNota + 8

  // Pasajero y asiento
  const nombre = partir(doc.pasajero.nombre, 120, 10, true)
  const altoPasajero = 14.5 + nombre.length * 5 + 3
  pdf.setFillColor(230, 244, 236)
  pdf.setDrawColor(...VERDE_OSCURO)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(18, y, 174, altoPasajero, 2.5, 2.5, 'FD')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...VERDE_OSCURO)
  pdf.text(doc.pasajero.boleto, 23, y + 7)
  pdf.text(doc.pasajero.asiento, 187, y + 7, { align: 'right' })
  pdf.setFontSize(10)
  pdf.setTextColor(...AZUL)
  nombre.forEach((linea, i) => pdf.text(linea, 23, y + 14.5 + i * 5))
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...GRIS)
  pdf.text(doc.pasajero.documento, 23, y + 14.5 + nombre.length * 5)
  y += altoPasajero + 9

  // Pago del cambio
  pdf.setDrawColor(205, 219, 224)
  pdf.setLineWidth(0.2)
  pdf.line(18, y, 192, y)
  y += 8
  pdf.setFontSize(10)
  for (const [etiqueta, valor] of doc.importes) {
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(...GRIS)
    pdf.text(etiqueta, 18, y)
    pdf.text(valor, 192, y, { align: 'right' })
    y += 7
  }

  y += 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11.5)
  pdf.setTextColor(...doc.resultado.acento)
  pdf.text(doc.resultado.titulo, 18, y)
  if (doc.resultado.monto) {
    pdf.setFontSize(13)
    pdf.text(doc.resultado.monto, 192, y, { align: 'right' })
  }
  if (doc.resultado.detalle) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...GRIS)
    partir(doc.resultado.detalle, 174, 9.5, false).forEach((linea, i) => pdf.text(linea, 18, y + 6.5 + i * 4.8))
  }

  // Nota al pie
  const pie = partir(doc.nota, 170, 8, false)
  pdf.setTextColor(...GRIS)
  pie.forEach((linea, i) => pdf.text(linea, 105, 285 - (pie.length - 1 - i) * 4, { align: 'center' }))

  pdf.save(doc.archivo)
}