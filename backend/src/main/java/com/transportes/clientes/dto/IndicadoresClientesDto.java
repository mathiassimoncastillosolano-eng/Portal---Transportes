package com.transportes.clientes.dto;

import java.util.List;

/** Totales que se muestran arriba del panel de clientes. */
public record IndicadoresClientesDto(
        long totalPasajeros, long conViajesProximos, long conViajesRealizados, long pasajesConfirmados,
        List<String> tiposDocumento) {
}
