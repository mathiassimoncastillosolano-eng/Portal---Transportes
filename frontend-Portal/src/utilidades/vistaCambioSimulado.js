/**
 * Une una compra real con el resultado simulado para mostrar el diseño final.
 * La compra recibida del servidor nunca se modifica.
 */
export function vistaCambioSimulado(compra, cambio) {
  if (!compra || !cambio || Number(compra.idVenta) !== Number(cambio.idVenta)) return compra
  if (!Array.isArray(compra.boletos) || !compra.boletos.some((boleto) =>
    String(boleto.idPasaje) === String(cambio.idPasaje) && boleto.numeroBoleto === cambio.numeroBoleto)) return compra

  const viaje = cambio.viaje
  const adicional = Number(cambio.montoAdicional)
  if (!viaje?.origen || !viaje?.destino || !viaje?.fechaSalida || !viaje?.horaSalida
    || !viaje?.tipoBus || !cambio.asiento || !Number.isFinite(adicional) || adicional < 0) return compra

  const viajeOriginal = {
    origen: compra.origen, destino: compra.destino, fechaSalida: compra.fechaSalida,
    horaSalida: compra.horaSalida, empresa: compra.empresa, tipoBus: compra.tipoBus,
  }
  const boletos = compra.boletos.map((boleto) => {
    const cambiado = String(boleto.idPasaje) === String(cambio.idPasaje)
    return {
      ...boleto,
      asiento: cambiado ? cambio.asiento : boleto.asiento,
      viajeVigente: cambiado ? { ...viaje } : { ...viajeOriginal },
      cambio: cambiado ? {
        anterior: { ...viajeOriginal, asiento: boleto.asiento },
        adicionalPagado: adicional,
      } : null,
    }
  })
  return {
    ...compra,
    boletos,
    totalPagado: Number((Number(compra.total) + adicional).toFixed(2)),
    esMock: true,
  }
}
