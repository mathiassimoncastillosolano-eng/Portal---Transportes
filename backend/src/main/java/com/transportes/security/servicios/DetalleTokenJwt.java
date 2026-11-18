package com.transportes.security.servicios;

import java.time.Instant;

/**
 * Id (jti) y vencimiento del JWT actual. El filtro los guarda junto a la sesión para que el logout pueda cerrar
 * ese token exacto sin volver a leerlo.
 */
public record DetalleTokenJwt(String jti, Instant expiracion) {
}
