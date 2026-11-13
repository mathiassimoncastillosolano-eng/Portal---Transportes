package com.transportes.postergacion.servicios;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.reglas.ReglasCompra;
import com.transportes.compras.reglas.ReglasCompra.EstadoCompra;
import com.transportes.compras.reglas.ReglasCompra.FaseViaje;
import com.transportes.compras.repositorios.CompraRepositorio;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.reglas.PoliticaPostergacion;
import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.reglas.PoliticaReservaViaje;
import com.transportes.viajes.servicios.ViajeService;

/**
 * HU-02 · Cambio de pasaje. Esta clase atiende SOLO la parte "Consulta de viajes" (criterios 1, 2 y 3a).
 *
 * <p>Patrón: Fachada. El controlador llama a un solo método y esta clase coordina a las demás:
 * {@link CompraRepositorio} (el pasaje), {@link ReglasCompra} (si está vigente), {@link PoliticaPostergacion}
 * (la regla de 6 h) y {@link ViajeService} (la búsqueda de viajes que ya existía).</p>
 *
 * <p>Las otras actividades agregan aquí sus métodos (por ejemplo, Confirmación agrega el que aplica el cambio).</p>
 */
@Service
public class PostergacionServicio {

    private final CompraRepositorio compras;
    private final ViajeService viajes;
    private final Clock reloj;

    public PostergacionServicio(CompraRepositorio compras, ViajeService viajes, Clock relojNegocio) {
        this.compras = compras;
        this.viajes = viajes;
        this.reloj = relojNegocio;
    }

    /**
     * Viajes a los que el usuario puede mover su pasaje.
     *
     * @throws ResponseStatusException 404 si el pasaje no existe o es de otra cuenta;
     *                                 409 con el motivo si el pasaje no se puede cambiar
     */
    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idUsuario, int idPasaje,
                                                   String origen, String destino, LocalDate fecha) {
        LocalDateTime ahora = LocalDateTime.now(reloj);

        // 1) Criterio 1: el pasaje es del usuario y está vigente.
        FilaCompra pasaje = buscarPasajePropio(idUsuario, idPasaje);
        if (!estaVigente(pasaje, ahora)) {
            throw rechazo("Este pasaje no está vigente, por eso no se puede cambiar.");
        }

        // 2) Criterio 2: faltan 6 h o más para la salida original.
        PoliticaPostergacion.Resultado resultado =
                PoliticaPostergacion.evaluar(pasaje.fechaSalida(), pasaje.horaSalida(), ahora);
        if (!resultado.aceptado()) {
            throw rechazo(resultado.mensaje());
        }

        // 3) Criterio 3 (primera mitad): solo viajes que se pueden elegir.
        List<ViajeResumenDto> encontrados = viajes.buscar(origen, destino, fecha, "cualquiera");
        List<ViajeResumenDto> ofrecidos = encontrados.stream()
                .filter(viaje -> sePuedeOfrecer(viaje, pasaje.idViaje(), ahora))
                .toList();
        return new ConsultaPostergacionDto(ofrecidos, encontrados.size() - ofrecidos.size());
    }

    /** Busca el pasaje entre las compras del usuario: si es de otra cuenta, no aparece (404). */
    private FilaCompra buscarPasajePropio(int idUsuario, int idPasaje) {
        return compras.filasDelUsuario(idUsuario).stream()
                .filter(fila -> Objects.equals(fila.idPasaje(), idPasaje))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No encontramos este pasaje entre tus compras."));
    }

    /** Vigente = compra pagada y viaje programado que todavía no sale (mismo criterio que "Mis pasajes"). */
    private static boolean estaVigente(FilaCompra pasaje, LocalDateTime ahora) {
        EstadoCompra estado = ReglasCompra.estadoCompra(
                pasaje.estadoVenta(), pasaje.estadoPago(), pasaje.estadoOperacion());
        FaseViaje fase = ReglasCompra.faseViaje(
                pasaje.estadoViaje(), pasaje.fechaSalida(), pasaje.horaSalida(), ahora);
        return ReglasCompra.esVigente(estado, fase);
    }

    /** Un viaje se ofrece si es otro viaje, se puede reservar, tiene asientos y sale en 6 h o más. */
    private static boolean sePuedeOfrecer(ViajeResumenDto viaje, Long idViajeOriginal, LocalDateTime ahora) {
        boolean esOtroViaje = !Objects.equals(viaje.id(), idViajeOriginal);
        boolean tieneAsientos = viaje.asientosDisponibles() > 0;
        boolean saleEn6Horas = viaje.salidaMs() - PoliticaReservaViaje.aEpochMs(ahora)
                >= PoliticaPostergacion.ANTICIPACION_MINIMA.toMillis();
        return esOtroViaje && viaje.reservable() && tieneAsientos && saleEn6Horas;
    }

    private static ResponseStatusException rechazo(String motivo) {
        return new ResponseStatusException(HttpStatus.CONFLICT, motivo);
    }
}
