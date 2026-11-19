package com.transportes.pagos.entidades;

/** Estados posibles de un pago. */
public enum EstadoOperacion {
    /** Guardada; todavía no se sabe si Culqi creó el cargo. */
    CREANDO,
    /** Cargo creado; Culqi todavía no da un resultado final. */
    EN_PROCESO,
    /** El comprador debe completar la autenticación 3D Secure de su banco. */
    ACCION_REQUERIDA,
    /** Pago verificado y compra registrada (venta, pago y pasajes). */
    APROBADO,
    /** Pago rechazado o cancelado: no hay cobro ni venta. */
    RECHAZADO,
    /** Se acabó el tiempo para pagar sin aprobación. */
    EXPIRADO,
    /** No se pudo crear el cargo (datos inválidos o error definitivo). */
    ERROR,
    /** Se cobró, pero los asientos ya no estaban libres: hay que devolver el dinero. */
    APROBADO_SIN_ASIENTOS,
    /** El dinero se devolvió al comprador. */
    REEMBOLSADO;

    /** true para CREANDO, EN_PROCESO y ACCION_REQUERIDA (todavía pueden cambiar). */
    public boolean esActivo() {
        return this == CREANDO || this == EN_PROCESO || this == ACCION_REQUERIDA;
    }

    /** true si es un estado final (ya no cambia). */
    public boolean esFinal() {
        return !esActivo();
    }
}
