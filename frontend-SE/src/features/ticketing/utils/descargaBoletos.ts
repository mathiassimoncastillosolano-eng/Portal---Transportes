import type { ComprobantePasaje } from '@/types/pasaje'
import { formatearFecha, formatearFechaHora, formatearMoneda } from '@/utils/formato'

/**
 * "Descargar boleto" en este MVP genera un archivo **HTML autocontenido**
 * (sin dependencias, sin backend) con el mismo contenido del boleto en
 * pantalla, listo para abrir, guardar o imprimir/exportar a PDF desde el
 * navegador. Cuando exista un servicio real de generación de boletos, esta
 * función es el único lugar a reemplazar por, por ejemplo, la descarga de
 * un PDF que devuelva la API — nada más del flujo depende de este detalle.
 */

function fila(etiqueta: string, valor: string): string {
  return `<div class="dato"><dt>${etiqueta}</dt><dd>${valor}</dd></div>`
}

function boletoHtml(c: ComprobantePasaje, metodoNombre: string): string {
  const { pasaje, pasajero, viaje, servicio, agenciaVenta, agenciaViaje } = c
  const referencia = pasaje.referenciaPago ? fila('Referencia', pasaje.referenciaPago) : ''
  const vuelto =
    pasaje.montoRecibido !== undefined
      ? fila('Recibido / vuelto', `${formatearMoneda(pasaje.montoRecibido)} / ${formatearMoneda(pasaje.vuelto ?? 0)}`)
      : ''
  return `
    <article class="boleto">
      <header>
        <div>
          <p class="marca">RutaLibre</p>
          <p class="sub">Boleto de pasaje</p>
        </div>
        <div class="codigo">
          <p class="sub">Código de boleto</p>
          <p class="cod">${pasaje.codigo}</p>
        </div>
      </header>
      <div class="cuerpo">
        <p class="ruta">${viaje.origen} → ${viaje.destino}</p>
        <p class="sub">${formatearFecha(viaje.fecha)} · ${viaje.hora} h · Viaje ${viaje.codigo}</p>
        <div class="datos">
          ${fila('Pasajero', `${pasajero.nombres} ${pasajero.apellidos}`)}
          ${fila('Documento', `${pasajero.tipoDocumento} ${pasajero.numeroDocumento}`)}
          ${fila('Teléfono', pasajero.telefono)}
          ${fila('Servicio', `${servicio.nombre} · ${servicio.unidad}`)}
          ${fila('Asiento', c.codigoAsiento)}
          ${fila('Sale de', agenciaViaje.name)}
          ${fila('Método de pago', metodoNombre)}
          ${referencia}
          ${vuelto}
          ${fila('Sede de venta', agenciaVenta.name)}
          ${fila('Operación', pasaje.operacionId)}
          ${fila('Emitido', formatearFechaHora(pasaje.fechaEmision))}
          ${fila('Estado', 'Emitido')}
        </div>
        <div class="total">
          <span>Precio del boleto</span>
          <strong>${formatearMoneda(pasaje.precio)}</strong>
        </div>
      </div>
    </article>`
}

const ESTILOS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 16px; background: #eef2f3; font-family: -apple-system, Inter, Segoe UI, Arial, sans-serif; color: #12232a; }
  .boleto { max-width: 640px; margin: 0 auto 24px; border-radius: 18px; overflow: hidden; border: 1px solid #d7e0e2; background: #fff; box-shadow: 0 1px 3px rgba(7,30,37,.08); }
  .boleto header { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #0b2530; color: #fff; padding: 18px 24px; }
  .boleto .marca { font-size: 18px; font-weight: 700; margin: 0; }
  .boleto .sub { font-size: 11px; opacity: .7; margin: 2px 0 0; }
  .boleto .codigo { text-align: right; }
  .boleto .cod { font-size: 17px; font-weight: 700; margin: 2px 0 0; font-variant-numeric: tabular-nums; }
  .boleto .cuerpo { padding: 20px 24px; }
  .boleto .ruta { font-size: 20px; font-weight: 700; margin: 0; }
  .boleto .datos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px 20px; margin-top: 18px; }
  .boleto .dato dt { font-size: 11px; color: #62787f; margin: 0 0 2px; }
  .boleto .dato dd { font-size: 13.5px; font-weight: 600; margin: 0; }
  .boleto .total { display: flex; align-items: center; justify-content: space-between; margin-top: 20px; padding: 12px 16px; border-radius: 12px; background: #eef2f3; }
  .boleto .total strong { font-size: 18px; }
  @media print { body { background: #fff; padding: 0; } .boleto { box-shadow: none; border: 1px solid #ccc; margin-bottom: 12px; page-break-inside: avoid; } }
`

function documentoHtml(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${titulo}</title>
<style>${ESTILOS}</style>
</head>
<body>${cuerpo}</body>
</html>`
}

function dispararDescarga(nombreArchivo: string, contenido: string) {
  const blob = new Blob([contenido], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

export function descargarBoleto(comprobante: ComprobantePasaje, metodoNombre: string) {
  const html = documentoHtml(`Boleto ${comprobante.pasaje.codigo}`, boletoHtml(comprobante, metodoNombre))
  dispararDescarga(`${comprobante.pasaje.codigo}.html`, html)
}

export function descargarTodosLosBoletos(boletos: ComprobantePasaje[], operacionId: string, metodoNombre: string) {
  const cuerpo = boletos.map((b) => boletoHtml(b, metodoNombre)).join('')
  const html = documentoHtml(`Boletos · ${operacionId}`, cuerpo)
  dispararDescarga(`${operacionId}.html`, html)
}
