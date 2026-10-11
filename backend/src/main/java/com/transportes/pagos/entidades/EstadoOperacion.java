package com.transportes.pagos.entidades;

/**
 * Estados internos de una operación de pago. Solo APROBADO tiene una venta asociada.
 * Los estados finales nunca retroceden (una notificación tardía o repetida no los cambia).
 */
public enum EstadoOperacion {
    /** Registrada localmente; la order aún no se creó o su resultado es desconocido (p. ej. timeout). */
    CREANDO,
    /** Order creada; Mercado Pago aún no da un resultado final (processing / in_process / waiting_*). */
    EN_PROCESO,
    /** El comprador debe completar un desafío 3DS. */
    ACCION_REQUERIDA,
    /** Pago verificado en el backend y compra registrada (venta, pago, pasajes). */
    APROBADO,
    /** Pago rechazado o cancelado por el proveedor: no hay cobro ni venta. */
    RECHAZADO,
    /** La ventana de pago venció sin una aprobación. */
    EXPIRADO,
    /** No se pudo crear la order (datos inválidos o error definitivo del proveedor). */
    ERROR,
    /** Cobro aprobado pero los asientos ya no estaban disponibles: requiere devolución. */
    APROBADO_SIN_ASIENTOS,
    /** Cobro devuelto al comprador. */
    REEMBOLSADO;

    public boolean esActivo() {
        return this == CREANDO || this == EN_PROCESO || this == ACCION_REQUERIDA;
    }

    public boolean esFinal() {
        return !esActivo();
    }
}
