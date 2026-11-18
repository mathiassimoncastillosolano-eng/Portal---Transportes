package com.transportes.pagos.mercadopago;

import java.time.OffsetDateTime;
import java.util.Optional;

/** Interfaz con las operaciones que se hacen en Mercado Pago. */
public interface ClienteMercadoPago {

    boolean configurado();

    /** Crea una order. La clave de idempotencia evita que repetir la llamada cree otra order. */
    OrdenMercadoPago crearOrden(SolicitudOrden solicitud, String claveIdempotencia);

    /** Consulta una order por id: es la fuente de verdad de su estado. */
    OrdenMercadoPago consultarOrden(String idOrden);

    /** Busca una order por nuestra referencia, cuando no se supo si su creación funcionó. */
    Optional<OrdenMercadoPago> buscarPorReferencia(String referenciaExterna, OffsetDateTime desde, OffsetDateTime hasta);

    /** Cancela una order que no se pagó a tiempo. */
    OrdenMercadoPago cancelarOrden(String idOrden, String claveIdempotencia);

    /** Devuelve todo el dinero de una order que no pudo convertirse en compra. */
    OrdenMercadoPago reembolsarOrden(String idOrden, String claveIdempotencia);
}
