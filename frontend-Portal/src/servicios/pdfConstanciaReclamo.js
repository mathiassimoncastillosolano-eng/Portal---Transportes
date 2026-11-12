import { formatearFechaLarga, formatearPrecio } from '../utilidades/formato.js'

const AZUL = [11, 53, 64]
const TURQUESA = [20, 127, 145]
const VERDE = [16, 185, 129]
const GRIS = [83, 102, 112]
const TEXTO = [23, 43, 58]
const MARGEN = 18
const ANCHO_UTIL = 174
const BAJO_PAGINA = 278

const ETIQUETAS_TIPO = { RECLAMO: 'Reclamo', QUEJA: 'Queja' }
const ETIQUETAS_DOCUMENTO = { DNI: 'DNI', CE: 'Carné de extranjería', PASAPORTE: 'Pasaporte' }
const ETIQUETAS_MEDIO = { CORREO: 'Correo electrónico', DIRECCION: 'Dirección física' }

export function nombreArchivoConstancia(constancia) {
  return `Constancia-${String(constancia.codigo).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
}

export function textoParaPdf(valor) {
  return String(valor ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\n\t\x20-\x7E\xA0-\xFF]/gu, '?')
}

function fechaHoraCorta(iso) {
  if (!iso) return '—'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short', hour12: false })
}

export function contenidoConstancia(constancia, proveedor = {}) {
  const c = constancia
  const monto = c.requerimiento.montoReclamado
  return {
    titulo: 'HOJA DE RECLAMACIÓN VIRTUAL',
    codigo: c.codigo,
    proveedor: [
      ['Razón social', proveedor.razonSocial],
      ['RUC', proveedor.ruc],
      ['Dirección', proveedor.direccion],
      ['Teléfono', proveedor.telefono],
      ['Correo', proveedor.correo],
    ].filter(([, valor]) => valor),
    registro: [
      ['Fecha y hora de presentación', fechaHoraCorta(c.fechaRegistro)],
      ['Tipo de requerimiento', ETIQUETAS_TIPO[c.tipoRequerimiento] ?? c.tipoRequerimiento],
      ['Plazo máximo de respuesta', `${c.diasHabilesPlazo} días hábiles improrrogables`],
      ['Fecha límite de respuesta', formatearFechaLarga(c.fechaLimiteRespuesta)],
    ],
    consumidor: [
      ['Nombres y apellidos', c.consumidor.nombresCompletos],
      [ETIQUETAS_DOCUMENTO[c.consumidor.tipoDocumento] ?? 'Documento', c.consumidor.numeroDocumento],
      ['Domicilio', c.consumidor.domicilio],
      ['Teléfono', c.consumidor.telefono],
      ['Correo electrónico', c.consumidor.correo],
    ],
    servicio: [
      ['Servicio involucrado', c.servicio.servicioInvolucrado],
      ['Código de pasaje', c.servicio.codigoPasaje],
      ['Código de viaje', c.servicio.codigoViaje],
      ['Fecha del servicio', c.servicio.fechaServicio ? formatearFechaLarga(c.servicio.fechaServicio) : null],
      ['Origen', c.servicio.origen],
      ['Destino', c.servicio.destino],
      ['Asiento', c.servicio.numeroAsiento],
    ].filter(([, valor]) => valor),
    requerimiento: [
      ['Descripción del servicio', c.requerimiento.descripcionServicio],
      ['Fecha del incidente', formatearFechaLarga(c.requerimiento.fechaIncidente)],
      ['Monto reclamado', monto === null || monto === undefined ? 'No indicado' : formatearPrecio(monto, c.requerimiento.moneda)],
    ],
    hechos: c.requerimiento.detalleHechos,
    pedido: c.requerimiento.pedidoConsumidor,
    comunicacion: [
      ['Medio de respuesta', ETIQUETAS_MEDIO[c.comunicacion.medioRespuesta] ?? c.comunicacion.medioRespuesta],
      ['Correo de respuesta', c.comunicacion.correoRespuesta],
    ].filter(([, valor]) => valor),
    nota: 'La clasificación como reclamo o queja la realiza el consumidor y no limita la atención del caso conforme a su contenido y a la normativa aplicable.',
  }
}

export async function descargarConstanciaPdf(constancia, proveedor) {
  const doc = contenidoConstancia(constancia, proveedor)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = 0

  const pie = () => {
    const total = pdf.getNumberOfPages()
    for (let i = 1; i <= total; i += 1) {
      pdf.setPage(i)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(...GRIS)
      pdf.text(textoParaPdf(`${doc.codigo} · Constancia de presentación`), MARGEN, 289)
      pdf.text(`Página ${i} de ${total}`, 210 - MARGEN, 289, { align: 'right' })
    }
  }

  const cabecera = () => {
    pdf.setFillColor(...AZUL)
    pdf.rect(0, 0, 210, 34, 'F')
    pdf.setFillColor(...VERDE)
    pdf.rect(0, 34, 210, 1.2, 'F')
    pdf.setFillColor(...TURQUESA)
    pdf.roundedRect(MARGEN, 9, 16, 16, 3.5, 3.5, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text('RL', MARGEN + 8, 19.2, { align: 'center' })
    pdf.setFontSize(17)
    pdf.text('RutaLibre', MARGEN + 21, 19.5)
    pdf.setFontSize(8.5)
    pdf.text(doc.titulo, 210 - MARGEN, 15, { align: 'right' })
    pdf.setFontSize(13)
    pdf.text(doc.codigo, 210 - MARGEN, 23, { align: 'right' })
    y = 46
  }

  const asegurar = (alto) => {
    if (y + alto > BAJO_PAGINA) {
      pdf.addPage()
      y = 20
    }
  }

  const titulo = (texto) => {
    asegurar(14)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...AZUL)
    pdf.text(textoParaPdf(texto.toUpperCase()), MARGEN, y)
    pdf.setDrawColor(...VERDE)
    pdf.setLineWidth(0.6)
    pdf.line(MARGEN, y + 1.8, MARGEN + 12, y + 1.8)
    y += 8
  }

  const filas = (pares) => {
    for (const [etiqueta, valor] of pares) {
      const lineas = pdf.splitTextToSize(textoParaPdf(valor ?? '—'), ANCHO_UTIL - 54)
      asegurar(lineas.length * 4.6 + 2)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9.5)
      pdf.setTextColor(...GRIS)
      pdf.text(textoParaPdf(etiqueta), MARGEN, y)
      pdf.setFont('helvetica', 'bold')
      pdf.setTextColor(...TEXTO)
      pdf.text(lineas, MARGEN + 54, y)
      y += lineas.length * 4.6 + 1.6
    }
    y += 4
  }

  const parrafo = (texto) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(...TEXTO)
    for (const linea of pdf.splitTextToSize(textoParaPdf(texto), ANCHO_UTIL)) {
      asegurar(5.2)
      pdf.text(linea, MARGEN, y)
      y += 5
    }
    y += 5
  }

  cabecera()
  if (doc.proveedor.length > 0) {
    titulo('Datos del proveedor')
    filas(doc.proveedor)
  }
  titulo('Datos de la presentación')
  filas(doc.registro)
  titulo('Datos del consumidor')
  filas(doc.consumidor)
  titulo('Servicio de transporte')
  filas(doc.servicio)
  titulo('Detalle del requerimiento')
  filas(doc.requerimiento)
  titulo('Descripción de los hechos')
  parrafo(doc.hechos)
  titulo('Pedido del consumidor')
  parrafo(doc.pedido)
  titulo('Medio de respuesta')
  filas(doc.comunicacion)

  asegurar(16)
  pdf.setFont('helvetica', 'italic')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...GRIS)
  for (const linea of pdf.splitTextToSize(textoParaPdf(doc.nota), ANCHO_UTIL)) {
    asegurar(4.4)
    pdf.text(linea, MARGEN, y)
    y += 4.2
  }

  pie()
  pdf.save(nombreArchivoConstancia(constancia))
}
