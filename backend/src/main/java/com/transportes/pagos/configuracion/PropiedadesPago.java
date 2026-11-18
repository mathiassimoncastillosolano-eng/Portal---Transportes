package com.transportes.pagos.configuracion;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import com.transportes.pagos.mercadopago.DocumentoPagador;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

/** Parámetros de Mercado Pago leídos de application.properties (solo valores no secretos). */
@Component
@Getter
public class PropiedadesPago {

    /** Minutos que los asientos quedan bloqueados desde que se crea la order de pago. */
    private final long minutosPago;
    /** Validación 3DS de tarjetas: on_fraud_risk (recomendado) o never. */
    private final String validacion3ds;
    /** Solo Sandbox: correo de pagador de prueba que pide Mercado Pago (vacío = usar el del comprador). */
    private final String emailPagadorPrueba;
    private final String nombreMetodoTarjeta;
    private final String nombreMetodoYape;
    /** Monto máximo por pago con Yape. */
    private final BigDecimal topeYape;
    /** Segundos mínimos entre dos consultas a Mercado Pago de la misma operación (evita saturar la API). */
    private final long segundosEntreConsultas;
    /** Si tras este tiempo no aparece una order cuya creación quedó en duda, se da por no creada. */
    private final long segundosResultadoDesconocido;
    /** Tipos de documento que se envían a Mercado Pago (por defecto solo DNI). */
    private final Set<String> tiposIdentificacion;
    /** Traducciones de tipo de documento configuradas a mano. */
    private final Map<String, String> mapeoTiposIdentificacion;

    public PropiedadesPago(
            @Value("${mercadopago.minutos-pago:15}") long minutosPago,
            @Value("${mercadopago.validacion-3ds:on_fraud_risk}") String validacion3ds,
            @Value("${mercadopago.email-pagador-prueba:}") String emailPagadorPrueba,
            @Value("${mercadopago.metodo-tarjeta:Mercado Pago - Tarjeta}") String nombreMetodoTarjeta,
            @Value("${mercadopago.metodo-yape:Mercado Pago - Yape}") String nombreMetodoYape,
            @Value("${mercadopago.tope-yape:2000}") BigDecimal topeYape,
            @Value("${mercadopago.segundos-entre-consultas:3}") long segundosEntreConsultas,
            @Value("${mercadopago.segundos-resultado-desconocido:180}") long segundosResultadoDesconocido,
            @Value("${mercadopago.identificacion.tipos:DNI}") String tiposIdentificacion,
            @Value("${mercadopago.identificacion.mapeo-tipos:}") String mapeoTiposIdentificacion) {
        this.minutosPago = minutosPago;
        this.validacion3ds = "never".equals(validacion3ds) ? "never" : "on_fraud_risk";
        this.emailPagadorPrueba = emailPagadorPrueba == null ? "" : emailPagadorPrueba.strip();
        this.nombreMetodoTarjeta = nombreMetodoTarjeta;
        this.nombreMetodoYape = nombreMetodoYape;
        this.topeYape = topeYape;
        this.segundosEntreConsultas = segundosEntreConsultas;
        this.segundosResultadoDesconocido = segundosResultadoDesconocido;
        this.tiposIdentificacion = DocumentoPagador.analizarTipos(tiposIdentificacion);
        this.mapeoTiposIdentificacion = DocumentoPagador.analizarMapeo(mapeoTiposIdentificacion);
    }
}
