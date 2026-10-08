package com.transportes.auth.servicios;

/**
 * Puerto de salida para enviar correos. La implementacion real usa Resend;
 * las pruebas lo sustituyen por un doble.
 */
public interface ClienteCorreo {

    /**
     * Envia el mensaje o lanza {@code CorreoNoDisponibleException} si el proveedor no
     * confirmo el envio. Nunca debe registrar el contenido del mensaje.
     */
    void enviar(MensajeCorreo mensaje);
}
