package com.transportes.pagos.configuracion;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

/**
 * Parámetros de la integración con Mercado Pago. Los secretos (Access Token y clave de Webhooks) se leen
 * directamente en el cliente HTTP y en el validador de firmas; aquí solo hay valores no sensibles.
 */
@Component
@Getter
public class PropiedadesPago {

    /** Minutos que se mantienen bloqueados los asientos desde que se crea la order. */
    private final long minutosPago;
    /** Validación 3DS para tarjetas: on_fraud_risk (recomendado) o never. */
    private final String validacion3ds;
    /** Solo Sandbox: correo de pagador de prueba que exige Mercado Pago (vacío = usar el del comprador). */
    private final String emailPagadorPrueba;
    private final String nombreMetodoTarjeta;
    private final String nombreMetodoYape;
    /** Tope por operación de Yape (S/ 500, 900 o 2000 según la app del pagador). */
    private final BigDecimal topeYape;
    /** Intervalo mínimo entre consultas a Mercado Pago para una misma operación (polling del frontend). */
    private final long segundosEntreConsultas;
    /** Tras este tiempo sin encontrar una order cuya creación tuvo resultado desconocido, se da por no creada. */
    private final long segundosResultadoDesconocido;

    public PropiedadesPago(
            @Value("${mercadopago.minutos-pago:15}") long minutosPago,
            @Value("${mercadopago.validacion-3ds:on_fraud_risk}") String validacion3ds,
            @Value("${mercadopago.email-pagador-prueba:}") String emailPagadorPrueba,
            @Value("${mercadopago.metodo-tarjeta:Mercado Pago - Tarjeta}") String nombreMetodoTarjeta,
            @Value("${mercadopago.metodo-yape:Mercado Pago - Yape}") String nombreMetodoYape,
            @Value("${mercadopago.tope-yape:2000}") BigDecimal topeYape,
            @Value("${mercadopago.segundos-entre-consultas:3}") long segundosEntreConsultas,
            @Value("${mercadopago.segundos-resultado-desconocido:180}") long segundosResultadoDesconocido) {
        this.minutosPago = minutosPago;
        this.validacion3ds = "never".equals(validacion3ds) ? "never" : "on_fraud_risk";
        this.emailPagadorPrueba = emailPagadorPrueba == null ? "" : emailPagadorPrueba.strip();
        this.nombreMetodoTarjeta = nombreMetodoTarjeta;
        this.nombreMetodoYape = nombreMetodoYape;
        this.topeYape = topeYape;
        this.segundosEntreConsultas = segundosEntreConsultas;
        this.segundosResultadoDesconocido = segundosResultadoDesconocido;
    }
}
