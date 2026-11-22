package com.transportes.postergacion.reglas;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Compara lo que el pasajero ya pagó con la tarifa del viaje nuevo.
 * Es el mismo cálculo que compararTarifas() del Portal y del Sistema Empresarial.
 */
public final class ComparacionTarifaCambio {

    public enum Escenario { IGUAL, SUPERIOR, INFERIOR }

    public record Resultado(Escenario escenario, BigDecimal importePagado, BigDecimal tarifaNueva,
                            BigDecimal montoAPagar, BigDecimal montoNoDevuelto) {

        public boolean requierePago() {
            return escenario == Escenario.SUPERIOR;
        }

        public boolean requiereAceptacion() {
            return escenario == Escenario.INFERIOR;
        }
    }

    private static final BigDecimal CERO = dinero(BigDecimal.ZERO);

    private ComparacionTarifaCambio() {
    }

    // Se suman las diferencias pagadas en cambios anteriores para no cobrar dos veces lo mismo.
    public static BigDecimal importePagado(BigDecimal precioPasaje, BigDecimal adicionalPagado) {
        return dinero(precioPasaje).add(dinero(adicionalPagado));
    }

    public static Resultado comparar(BigDecimal importePagado, BigDecimal tarifaNueva) {
        BigDecimal pagado = dinero(importePagado);
        BigDecimal nueva = dinero(tarifaNueva);
        // Positiva: falta pagar. Negativa: el viaje nuevo es más barato.
        BigDecimal diferencia = nueva.subtract(pagado);

        if (diferencia.signum() == 0) {
            return new Resultado(Escenario.IGUAL, pagado, nueva, CERO, CERO);
        }
        if (diferencia.signum() > 0) {
            return new Resultado(Escenario.SUPERIOR, pagado, nueva, diferencia, CERO);
        }
        return new Resultado(Escenario.INFERIOR, pagado, nueva, CERO, diferencia.negate());
    }

    // Todo monto se trabaja con 2 decimales (céntimos). Un monto vacío cuenta como 0.
    private static BigDecimal dinero(BigDecimal monto) {
        return (monto == null ? BigDecimal.ZERO : monto).setScale(2, RoundingMode.HALF_UP);
    }
}
