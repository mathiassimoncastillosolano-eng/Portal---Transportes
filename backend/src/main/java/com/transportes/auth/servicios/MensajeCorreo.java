package com.transportes.auth.servicios;

/** Un correo listo para enviar: destinatario, asunto, versión HTML y versión de texto. */
public record MensajeCorreo(String para, String asunto, String html, String texto) {
}
