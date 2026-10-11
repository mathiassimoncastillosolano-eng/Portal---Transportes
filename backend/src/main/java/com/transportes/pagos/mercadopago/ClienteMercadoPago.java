package com.transportes.pagos.mercadopago;

import java.time.OffsetDateTime;
import java.util.Optional;

/** Operaciones de la API de Orders que usa RutaLibre. Se reemplaza por un mock en las pruebas. */
public interface ClienteMercadoPago {

    boolean configurado();

    /** POST /v1/orders con X-Idempotency-Key: repetir la llamada con la misma clave no crea otra order. */
    OrdenMercadoPago crearOrden(SolicitudOrden solicitud, String claveIdempotencia);

    /** GET /v1/orders/{id}: fuente de verdad del estado. */
    OrdenMercadoPago consultarOrden(String idOrden);

    /** GET /v1/orders?external_reference=...: recupera una order cuya creación terminó con resultado desconocido. */
    Optional<OrdenMercadoPago> buscarPorReferencia(String referenciaExterna, OffsetDateTime desde, OffsetDateTime hasta);

    /** POST /v1/orders/{id}/cancel: cierra una order sin resultado al vencer la ventana de pago. */
    OrdenMercadoPago cancelarOrden(String idOrden, String claveIdempotencia);

    /** POST /v1/orders/{id}/refund (total): devuelve un cobro que no pudo convertirse en compra. */
    OrdenMercadoPago reembolsarOrden(String idOrden, String claveIdempotencia);
}
