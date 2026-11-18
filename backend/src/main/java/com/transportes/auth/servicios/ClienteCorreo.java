package com.transportes.auth.servicios;

/**
 * Interfaz para enviar correos (patrón Adaptador). La versión real usa Resend; en las pruebas se usa una falsa.
 */
public interface ClienteCorreo {

    /**
     * Envía el mensaje. Si el proveedor no lo confirma lanza CorreoNoDisponibleException. Nunca debe escribir el
     * contenido en los logs.
     */
    void enviar(MensajeCorreo mensaje);
}
