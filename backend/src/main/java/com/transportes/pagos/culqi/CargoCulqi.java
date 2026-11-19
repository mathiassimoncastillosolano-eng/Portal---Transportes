package com.transportes.pagos.culqi;

import java.math.BigDecimal;

public record CargoCulqi(
        String id,
        String tipoResultado,
        String codigo,
        String mensajeUsuario,
        String referenciaExterna,
        BigDecimal monto,
        BigDecimal montoReembolsado,
        String moneda,
        boolean capturado,
        boolean requiere3ds) {

    public static final String RESULTADO_EXITOSO = "venta_exitosa";

    public static CargoCulqi pendiente3ds(String mensajeUsuario) {
        return new CargoCulqi(null, null, "REVIEW", mensajeUsuario, null, null, null, null, false, true);
    }

    public boolean aprobada() {
        return !requiere3ds && id != null && capturado && RESULTADO_EXITOSO.equals(tipoResultado);
    }

    public boolean rechazada() {
        return !requiere3ds && tipoResultado != null && !RESULTADO_EXITOSO.equals(tipoResultado);
    }

    public boolean reembolsadaTotalmente() {
        return monto != null && montoReembolsado != null && monto.signum() > 0
                && montoReembolsado.compareTo(monto) >= 0;
    }

    public String motivo() {
        return codigo;
    }
}
