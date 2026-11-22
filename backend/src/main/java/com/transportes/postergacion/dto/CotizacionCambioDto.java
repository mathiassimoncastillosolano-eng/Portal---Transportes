package com.transportes.postergacion.dto;

import java.math.BigDecimal;

import com.transportes.postergacion.reglas.ComparacionTarifaCambio.Resultado;

/**
 * Resultado de comparar tarifas antes de confirmar el cambio.
 * mensajeParaAgente es lo que el personal debe informarle al pasajero.
 */
public record CotizacionCambioDto(
        String escenario, BigDecimal importePagado, BigDecimal tarifaNueva,
        BigDecimal montoAPagar, BigDecimal montoNoDevuelto,
        boolean requierePago, boolean requiereAceptacion, String mensajeParaAgente) {

    public static CotizacionCambioDto desde(Resultado resultado) {
        return new CotizacionCambioDto(resultado.escenario().name(), resultado.importePagado(),
                resultado.tarifaNueva(), resultado.montoAPagar(), resultado.montoNoDevuelto(),
                resultado.requierePago(), resultado.requiereAceptacion(), mensajeParaAgente(resultado));
    }

    private static String mensajeParaAgente(Resultado resultado) {
        return switch (resultado.escenario()) {
            case IGUAL -> "La tarifa es la misma. Informe al pasajero que el cambio no tiene costo.";
            case SUPERIOR -> "La nueva tarifa es mayor. El pasajero debe pagar " + soles(resultado.montoAPagar())
                    + " de diferencia para confirmar el cambio.";
            case INFERIOR -> "La nueva tarifa es menor. Informe al pasajero que la diferencia de "
                    + soles(resultado.montoNoDevuelto())
                    + " no se devuelve ni queda como saldo a favor, y confirme que lo acepta.";
        };
    }

    private static String soles(BigDecimal monto) {
        return "S/ " + monto.toPlainString();
    }
}
