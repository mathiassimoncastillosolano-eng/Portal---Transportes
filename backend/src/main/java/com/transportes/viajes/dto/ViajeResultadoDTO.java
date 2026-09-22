package com.transportes.viajes.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * - asientosDisponibles: cantidad real de asientos con estado "disponible" en viaje_asiento para ese viaje. Puede venir
 *   null solo si el viaje todavía no tiene ninguna fila en viaje_asiento (no se le han generado asientos); en ese caso la
 *   tarjeta lo trata como "disponible" sin número, para no romperse.
 * - precio: el menor `viaje_asiento.precio` entre los asientos disponibles de ese viaje (o el menor precio general si ya no queda
 *   ninguno disponible, para poder seguir mostrando un precio de referencia). null solo si el viaje no tiene asientos cargados.
 * - estado ('disponible' | 'pocos-asientos' | 'agotado'): 'agotado' si el viaje está cancelado o si asientosDisponibles = 0;
 *   'pocos-asientos' si asientosDisponibles < 10; 'disponible' en el resto de los casos.
 */
public record ViajeResultadoDTO(
        String id,
        String empresa,
        String origen,
        String destino,
        String horaSalida,
        String horaLlegada,
        String duracion,
        String tipoBus,
        List<String> servicios,
        Integer asientosDisponibles,
        BigDecimal precio,
        String estado
) {
}
