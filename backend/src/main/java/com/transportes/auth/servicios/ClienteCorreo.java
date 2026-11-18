package com.transportes.auth.servicios;

/** Interfaz para enviar correos. */
public interface ClienteCorreo {

    /** Envía el correo. Lanza error si no se pudo enviar. */
    void enviar(MensajeCorreo mensaje);
}
