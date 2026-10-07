package com.transportes.auth.servicios;

/** Mensaje listo para enviar: version HTML y version de texto plano. */
public record MensajeCorreo(String para, String asunto, String html, String texto) {
}
