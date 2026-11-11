import { useCatalogo } from '@/hooks/useCatalogo'
import type { ComprobantePasaje } from '@/types/pasaje'
import { formatearFecha, formatearFechaHora, formatearMoneda } from '@/utils/formato'

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-text-500">{etiqueta}</dt>
      <dd className="text-sm font-medium text-text-900">{valor}</dd>
    </div>
  )
}

/** Comprobante de pasaje en pantalla (imprimible con el navegador; no genera PDF). */
export function TicketReceipt({ comprobante }: { comprobante: ComprobantePasaje }) {
  const { catalogo } = useCatalogo()
  const { pasaje, pasajero, viaje, servicio, agenciaVenta, agenciaViaje } = comprobante
  const metodo = catalogo?.metodosPago.find((m) => m.id === pasaje.metodoPagoId)

  return (
    <article
      aria-label={`Boleto ${pasaje.codigo}, asiento ${comprobante.codigoAsiento}`}
      className="print-area overflow-hidden rounded-2xl border border-border bg-surface-card shadow-panel"
    >
      <header className="flex items-center justify-between gap-3 bg-ink-950 px-6 py-4 text-white">
        <div>
          <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            RutaLibre
          </p>
          <p className="text-xs text-ink-300">Boleto de pasaje</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-300">Código de boleto</p>
          <p className="text-lg font-semibold tabular-nums">{pasaje.codigo}</p>
        </div>
      </header>

      <div className="px-6 py-5">
        <p className="text-xl font-semibold text-text-900">
          {viaje.origen} → {viaje.destino}
        </p>
        <p className="mt-0.5 text-sm text-text-500">
          {formatearFecha(viaje.fecha)} · {viaje.hora} h · Viaje {viaje.codigo}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Dato etiqueta="Pasajero" valor={`${pasajero.nombres} ${pasajero.apellidos}`} />
          <Dato etiqueta="Documento" valor={`${pasajero.tipoDocumento} ${pasajero.numeroDocumento}`} />
          <Dato etiqueta="Teléfono" valor={pasajero.telefono} />
          <Dato etiqueta="Servicio" valor={`${servicio.nombre} · ${servicio.unidad}`} />
          <Dato etiqueta="Asiento" valor={comprobante.codigoAsiento} />
          <Dato etiqueta="Sale de" valor={agenciaViaje.name} />
          <Dato etiqueta="Método de pago" valor={metodo?.nombre ?? pasaje.metodoPagoId} />
          {pasaje.referenciaPago && <Dato etiqueta="Referencia" valor={pasaje.referenciaPago} />}
          {pasaje.montoRecibido !== undefined && (
            <Dato etiqueta="Recibido / vuelto" valor={`${formatearMoneda(pasaje.montoRecibido)} / ${formatearMoneda(pasaje.vuelto ?? 0)}`} />
          )}
          <Dato etiqueta="Sede de venta" valor={agenciaVenta.name} />
          <Dato etiqueta="Operación" valor={pasaje.operacionId} />
          <Dato etiqueta="Emitido" valor={formatearFechaHora(pasaje.fechaEmision)} />
          <Dato etiqueta="Estado" valor="Emitido" />
        </dl>

        <div className="mt-6 flex items-center justify-between rounded-xl bg-surface-sunken px-4 py-3">
          <span className="text-sm font-medium text-text-700">Total pagado</span>
          <span className="text-xl font-semibold tabular-nums text-text-900">{formatearMoneda(pasaje.precio)}</span>
        </div>
      </div>
    </article>
  )
}
