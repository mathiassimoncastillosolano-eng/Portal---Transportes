import { ResumenReserva } from '../reserva/ResumenReserva'
import { formatearPrecio } from '../../utilidades/formato'
import {
  calcularTarifaDelAsiento,
  describirTarifaLateral,
  viajeParaMostrar,
} from '../../utilidades/reprogramacionAsientos'

// Filas de la lista de la tarjeta: datos del viaje y, si ya hay asiento, la tarifa.
function construirFilas(pasaje, viaje, comparacion, textosTarifa) {
  const filas = [
    { etiqueta: 'Servicio', valor: viaje.tipoBus },
    { etiqueta: 'Asiento original', valor: pasaje.asiento },
  ]
  if (!comparacion) {
    if (Number.isFinite(Number(viaje.precio))) {
      filas.push({ etiqueta: 'Precio desde', valor: formatearPrecio(viaje.precio, pasaje.moneda) })
    }
    return filas
  }
  filas.push(
    { etiqueta: 'Pagaste', valor: formatearPrecio(comparacion.original, pasaje.moneda) },
    { etiqueta: 'Precio del asiento', valor: formatearPrecio(comparacion.nueva, pasaje.moneda) },
    { etiqueta: 'Diferencia', valor: textosTarifa.diferencia },
  )
  return filas
}

// Tarjeta lateral de la reprogramación. Reutiliza ResumenReserva (la de la compra
// normal) para verse igual; solo cambia lo que se le entrega:
//  - un único asiento en lugar de varios,
//  - la diferencia de tarifa entre el pasaje original y el asiento elegido,
//    visible desde que se elige el asiento.
export function ResumenReprogramacion({ pasaje, viaje, asiento }) {
  if (!viaje) return null

  const comparacion = calcularTarifaDelAsiento(pasaje, asiento)
  const textosTarifa = describirTarifaLateral(comparacion, pasaje.moneda)
  const asientosSeleccionados = asiento
    ? [{ clave: `${asiento.piso}-${asiento.numero}`, numero: asiento.numero, piso: asiento.piso }]
    : []

  return (
    <ResumenReserva
      resultado={viajeParaMostrar(viaje)}
      fecha={viaje.fechaSalida}
      asientosSeleccionados={asientosSeleccionados}
      mostrarPiso={Boolean(asiento && asiento.piso > 1)}
      filasDetalle={construirFilas(pasaje, viaje, comparacion, textosTarifa)}
      precioTotal={textosTarifa.montoAPagar ?? undefined}
      etiquetaTotal="A pagar ahora"
      mensajeAyuda={textosTarifa.ayuda}
      mostrarBoton={false}
    />
  )
}
