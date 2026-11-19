package com.transportes.pagos.culqi;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

public interface ClienteCulqi {

    boolean configurado();

    CargoCulqi crearCargo(SolicitudCargo solicitud);

    CargoCulqi consultarCargo(String idCargo);

    Optional<CargoCulqi> buscarPorReferencia(String referenciaExterna, String email, OffsetDateTime desde,
                                             OffsetDateTime hasta);

    String reembolsar(String idCargo, BigDecimal monto, String motivo);
}
