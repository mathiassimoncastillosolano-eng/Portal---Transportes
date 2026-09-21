package com.transportes.security.servicios;

import java.time.Instant;

/**
 * Datos del JWT actual (identificador unico y expiracion) que el filtro de
 * autenticacion adjunta a la {@code Authentication} para que, por ejemplo,
 * el endpoint de cierre de sesion pueda invalidar exactamente ese token sin
 * necesidad de volver a parsearlo.
 */
public record DetalleTokenJwt(String jti, Instant expiracion) {
}
