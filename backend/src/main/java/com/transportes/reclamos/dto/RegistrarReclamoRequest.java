package com.transportes.reclamos.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrarReclamoRequest(
        @NotNull(message = "Falta la clave de la solicitud.") UUID claveIdempotencia,
        @NotBlank(message = "Ingresa tus nombres y apellidos.")
        @Size(min = 3, max = 200, message = "Los nombres deben tener entre 3 y 200 caracteres.") String nombresCompletos,
        @NotBlank(message = "Selecciona el tipo de documento.")
        @Pattern(regexp = "DNI|CE|PASAPORTE", message = "Tipo de documento no válido.") String tipoDocumento,
        @NotBlank(message = "Ingresa tu número de documento.")
        @Size(max = 20, message = "El número de documento es demasiado largo.") String numeroDocumento,
        @NotBlank(message = "Ingresa tu domicilio.")
        @Size(min = 5, max = 250, message = "El domicilio debe tener entre 5 y 250 caracteres.") String domicilio,
        @NotBlank(message = "Ingresa tu teléfono.")
        @Size(min = 7, max = 20, message = "El teléfono debe tener entre 7 y 20 caracteres.") String telefono,
        @NotBlank(message = "Ingresa tu correo electrónico.")
        @Size(max = 150, message = "El correo es demasiado largo.") String correo,
        @NotBlank(message = "Selecciona el servicio involucrado.")
        @Size(max = 100, message = "El servicio involucrado es demasiado largo.") String servicioInvolucrado,
        Integer idPasaje,
        @Size(max = 30, message = "El código del viaje es demasiado largo.") String codigoViaje,
        @Size(max = 100, message = "La ciudad de origen es demasiado larga.") String origen,
        @Size(max = 100, message = "La ciudad de destino es demasiado larga.") String destino,
        LocalDate fechaServicio,
        @Size(max = 10, message = "El número de asiento es demasiado largo.") String numeroAsiento,
        @NotBlank(message = "Selecciona si es un reclamo o una queja.")
        @Pattern(regexp = "RECLAMO|QUEJA", message = "Tipo de requerimiento no válido.") String tipoRequerimiento,
        @NotBlank(message = "Describe el servicio involucrado.")
        @Size(min = 3, max = 300, message = "La descripción del servicio debe tener entre 3 y 300 caracteres.") String descripcionServicio,
        @NotNull(message = "Indica la fecha del incidente.") LocalDate fechaIncidente,
        @DecimalMin(value = "0.00", message = "El monto no puede ser negativo.")
        @Digits(integer = 8, fraction = 2, message = "El monto no es válido.") BigDecimal montoReclamado,
        @Pattern(regexp = "PEN|USD", message = "Moneda no válida.") String moneda,
        @NotBlank(message = "Describe los hechos.")
        @Size(min = 20, max = 2000, message = "El detalle debe tener entre 20 y 2000 caracteres.") String detalleHechos,
        @NotBlank(message = "Indica qué solución esperas.")
        @Size(min = 10, max = 1000, message = "El pedido debe tener entre 10 y 1000 caracteres.") String pedidoConsumidor,
        @AssertTrue(message = "Debes declarar que la información es veraz.") boolean declaracionVeracidad,
        @AssertTrue(message = "Debes aceptar el tratamiento de tus datos personales.") boolean autorizaTratamientoDatos) {
}
