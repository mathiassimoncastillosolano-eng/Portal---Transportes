// Reprogramación · Funciones puras para el paso "Elige tu nuevo asiento".
// No hacen llamadas a la API ni usan React: reciben datos y devuelven datos,
// por eso son fáciles de probar y de entender.
//
// El mapa tiene la forma que devuelve obtenerMapaAsientosViaje():
//   { pisos: 2, mapaPorPiso: { 1: { asientos: [...] }, 2: { asientos: [...] } } }
// y cada asiento: { idAsiento, numero, piso, estado, esMio, precio, ... }

import { ESCENARIO_TARIFA, compararTarifas } from './postergacion.js'
import { formatearPrecio } from './formato.js'

// ---------------------------------------------------------------------------
// Mapa de asientos
// ---------------------------------------------------------------------------

function listarAsientos(mapa) {
  if (!mapa) return []
  return Object.values(mapa.mapaPorPiso).flatMap((piso) => piso.asientos)
}

// Devuelve el asiento que el pasajero tiene bloqueado en esta sesión (esMio),
// o null si todavía no eligió ninguno. En una reprogramación solo hay uno.
export function buscarAsientoElegido(mapa) {
  const asiento = listarAsientos(mapa).find((candidato) => candidato.esMio)
  if (!asiento) return null
  const { idAsiento, numero, piso, fila, letra, precio } = asiento
  return { idAsiento, numero, piso, fila, letra, precio }
}

// Devuelve un mapa nuevo con los cambios aplicados a UN asiento.
// No modifica el mapa original (React necesita un objeto nuevo para repintar).
export function actualizarAsientoEnMapa(mapa, idAsiento, cambios) {
  if (!mapa) return mapa
  const mapaPorPiso = {}
  Object.entries(mapa.mapaPorPiso).forEach(([numeroPiso, piso]) => {
    mapaPorPiso[numeroPiso] = {
      ...piso,
      asientos: piso.asientos.map((asiento) => (
        asiento.idAsiento === idAsiento ? { ...asiento, ...cambios } : asiento
      )),
    }
  })
  return { ...mapa, mapaPorPiso }
}

// Ids de TODOS los asientos que el backend dice que son míos. Debería haber a lo
// sumo uno, pero si por algún motivo quedó otro bloqueado, también se libera.
export function buscarIdsAsientosElegidos(mapa) {
  return listarAsientos(mapa)
    .filter((asiento) => asiento.esMio)
    .map((asiento) => asiento.idAsiento)
}

// Aplica un evento en tiempo real (SSE) { idAsiento, estado }.
// El evento no dice de quién es el bloqueo: si el asiento se libera, deja de
// ser mío; en los demás casos conservo lo que ya sabía.
export function aplicarEventoEnMapa(mapa, { idAsiento, estado }) {
  const asiento = listarAsientos(mapa).find((candidato) => candidato.idAsiento === idAsiento)
  if (!asiento) return mapa
  return actualizarAsientoEnMapa(mapa, idAsiento, {
    estado,
    esMio: estado === 'disponible' ? false : asiento.esMio,
  })
}

// ---------------------------------------------------------------------------
// Datos del viaje y tarifa
// ---------------------------------------------------------------------------

// Si el backend no calculó la hora de llegada viene null: se muestra un texto.
export function viajeParaMostrar(viaje) {
  return {
    ...viaje,
    horaLlegada: viaje.horaLlegada ?? 'Por confirmar',
    duracion: viaje.duracion ?? 'Por confirmar',
  }
}

// Compara lo que se pagó por el pasaje original con el precio del ASIENTO
// elegido (no con el precio "desde" de la búsqueda). Sin asiento no hay tarifa.
export function calcularTarifaDelAsiento(pasaje, asiento) {
  if (!asiento || !Number.isFinite(Number(asiento.precio))) return null
  return compararTarifas(pasaje.precioPagado, Number(asiento.precio))
}

// Explicación que acompaña al monto de la diferencia, según quién la asume.
const AYUDA_POR_ESCENARIO = {
  [ESCENARIO_TARIFA.SUPERIOR]: (comparacion, moneda) =>
    `Pagarás solo la diferencia de ${formatearPrecio(comparacion.montoAPagar, moneda)} en el siguiente paso.`,
  [ESCENARIO_TARIFA.IGUAL]: () => 'No pagas nada: la tarifa es igual a la de tu pasaje.',
  [ESCENARIO_TARIFA.INFERIOR]: (comparacion, moneda) =>
    `No pagas nada. La diferencia de ${formatearPrecio(comparacion.montoNoDevuelto, moneda)} no se devuelve ni genera saldo a favor.`,
}

// Datos de la tarjeta lateral según la diferencia de tarifa:
// { ayuda, montoDiferencia } (montoDiferencia es null mientras no hay asiento elegido).
export function describirTarifaLateral(comparacion, moneda) {
  if (!comparacion) {
    return {
      ayuda: 'Elige un asiento para ver la diferencia de tarifa.',
      montoDiferencia: null,
    }
  }
  return {
    ayuda: AYUDA_POR_ESCENARIO[comparacion.escenario](comparacion, moneda),
    montoDiferencia: comparacion.diferencia,
  }
}
