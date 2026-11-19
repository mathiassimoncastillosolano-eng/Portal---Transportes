package com.transportes.pagos.culqi;

import java.math.BigDecimal;

public record SolicitudCargo(
        String referenciaExterna,
        BigDecimal monto,
        String moneda,
        String descripcion,
        String email,
        String token,
        String nombre,
        String apellido,
        String telefono,
        Autenticacion3ds autenticacion3ds) {
}
