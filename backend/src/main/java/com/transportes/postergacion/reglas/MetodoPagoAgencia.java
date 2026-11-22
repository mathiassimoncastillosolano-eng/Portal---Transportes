package com.transportes.postergacion.reglas;

/** Métodos con los que el personal de agencia cobra en ventanilla (filas de la tabla metodo_pago). */
public enum MetodoPagoAgencia {

    EFECTIVO("Efectivo"),
    YAPE("Yape"),
    TARJETA("Tarjeta");

    private final String nombreEnCatalogo;

    MetodoPagoAgencia(String nombreEnCatalogo) {
        this.nombreEnCatalogo = nombreEnCatalogo;
    }

    public String nombreEnCatalogo() {
        return nombreEnCatalogo;
    }

    // El efectivo se recibe en mano: siempre se registra como aprobado.
    public boolean siempreAprobado() {
        return this == EFECTIVO;
    }
}
