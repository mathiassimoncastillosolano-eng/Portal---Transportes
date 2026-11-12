package com.transportes.reclamos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ConstanciaReclamoDto(
        String codigo, LocalDateTime fechaRegistro, LocalDate fechaLimiteRespuesta, int diasHabilesPlazo,
        String tipoRequerimiento, String estado,
        Consumidor consumidor, Servicio servicio, Requerimiento requerimiento, Comunicacion comunicacion) {

    public record Consumidor(
            String nombresCompletos, String tipoDocumento, String numeroDocumento,
            String domicilio, String telefono, String correo) {
    }

    public record Servicio(
            String servicioInvolucrado, String codigoPasaje, String codigoViaje, LocalDate fechaServicio,
            String origen, String destino, String numeroAsiento) {
    }

    public record Requerimiento(
            String descripcionServicio, LocalDate fechaIncidente, BigDecimal montoReclamado, String moneda,
            String detalleHechos, String pedidoConsumidor) {
    }

    public record Comunicacion(String medioRespuesta, String correoRespuesta) {
    }
}
