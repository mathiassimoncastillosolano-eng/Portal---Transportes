package com.transportes.pagos.configuracion;

import java.math.BigDecimal;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.Getter;

@Component
@Getter
public class PropiedadesPago {

    private final long minutosPago;
    private final String nombreMetodoTarjeta;
    private final String nombreMetodoYape;
    private final BigDecimal topeYape;
    private final long segundosEntreConsultas;
    private final long segundosResultadoDesconocido;
    private final String versionTerminos;

    public PropiedadesPago(
            @Value("${culqi.minutos-pago:15}") long minutosPago,
            @Value("${culqi.metodo-tarjeta:Culqi - Tarjeta}") String nombreMetodoTarjeta,
            @Value("${culqi.metodo-yape:Culqi - Yape}") String nombreMetodoYape,
            @Value("${culqi.tope-yape:2000}") BigDecimal topeYape,
            @Value("${culqi.segundos-entre-consultas:3}") long segundosEntreConsultas,
            @Value("${culqi.segundos-resultado-desconocido:180}") long segundosResultadoDesconocido,
            @Value("${legal.version-terminos:2026-11-18}") String versionTerminos) {
        this.minutosPago = minutosPago;
        this.nombreMetodoTarjeta = nombreMetodoTarjeta;
        this.nombreMetodoYape = nombreMetodoYape;
        this.topeYape = topeYape;
        this.segundosEntreConsultas = segundosEntreConsultas;
        this.segundosResultadoDesconocido = segundosResultadoDesconocido;
        this.versionTerminos = versionTerminos;
    }
}
