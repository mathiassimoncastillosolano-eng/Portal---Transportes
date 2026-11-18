package com.transportes.security.servicios;

import java.time.Instant;

/** Id y vencimiento del token actual, para poder cerrarlo en el logout. */
public record DetalleTokenJwt(String jti, Instant expiracion) {
}
