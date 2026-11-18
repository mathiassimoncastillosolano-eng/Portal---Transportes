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
import com.transportes.postergacion.excepciones.PostergacionRechazadaException;
import com.transportes.postergacion.reglas.PoliticaPostergacion;
import com.transportes.viajes.dto.ViajeResumenDto;
import com.transportes.viajes.servicios.ViajeService;

/**
 * Consulta de viajes de HU-02 (criterios 1, 2 y 3a). Patrón Fachada: el controlador llama a un solo método y esta
 * clase coordina a CompraRepositorio (busca el pasaje), ReglasCompra (¿está vigente?), PoliticaPostergacion (regla
 * de 6 h) y ViajeService (búsqueda de viajes). También tiene exigirPasajeCambiable, que usa la confirmación.
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
     * Viajes de la ruta y fecha elegidas a los que se puede cambiar el pasaje (todos menos el original, cada uno
     * con su estado).
     * @throws ResponseStatusException 404 si el pasaje no existe o es de otra cuenta; 409 con el motivo si el
     * pasaje no se puede cambiar
     */
    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idUsuario, int idPasaje,
                                                   String origen, String destino, LocalDate fecha) {
        LocalDateTime ahora = LocalDateTime.now(reloj);

        // Paso 1 (criterio 1): el pasaje es del usuario y está vigente.
        FilaCompra pasaje = buscarPasajePropio(idUsuario, idPasaje);
        if (!estaVigente(pasaje, ahora)) {
            throw rechazo("Este pasaje no está vigente, por eso no se puede cambiar.");
        }

        // Paso 2 (criterio 2): faltan 6 h o más para la salida original.
        PoliticaPostergacion.Resultado resultado =
                PoliticaPostergacion.evaluar(pasaje.fechaSalida(), pasaje.horaSalida(), ahora);
        if (!resultado.aceptado()) {
            throw rechazo(resultado.mensaje());
        }

        // Paso 3 (criterio 3): todos los viajes de esa ruta y fecha menos el original, igual que la búsqueda
        // normal (también los que ya salieron o están llenos). Cada uno trae estadoReserva y reservable, y la
        // pantalla solo deja elegir los reservables. Al reservar y pagar el servidor vuelve a validar.
        List<ViajeResumenDto> encontrados = viajes.buscar(origen, destino, fecha, "cualquiera");
        List<ViajeResumenDto> mostrados = encontrados.stream()
                .filter(viaje -> esOtroViaje(viaje, pasaje.idViaje()))
                .toList();
        return new ConsultaPostergacionDto(mostrados, encontrados.size() - mostrados.size());
    }

    /**
     * Revalida, justo antes de confirmar, lo mismo que la consulta: el pasaje es del usuario, está vigente y
     * faltan 6 h o más. Devuelve el pasaje con su viaje y asiento actuales. Lo usa
     * ConfirmacionPostergacionServicio.
     * @throws ResponseStatusException 404 si el pasaje no existe o es de otra cuenta; 409 si ya no se puede
     * cambiar
     */
    public FilaCompra exigirPasajeCambiable(int idUsuario, int idPasaje) {
        LocalDateTime ahora = LocalDateTime.now(reloj);
        FilaCompra pasaje = buscarPasajePropio(idUsuario, idPasaje);
        if (!estaVigente(pasaje, ahora)) {
            throw new PostergacionRechazadaException(PostergacionRechazadaException.PASAJE_NO_VIGENTE,
                    "Este pasaje no está vigente, por eso no se puede cambiar.");
        }
        PoliticaPostergacion.Resultado resultado =
                PoliticaPostergacion.evaluar(pasaje.fechaSalida(), pasaje.horaSalida(), ahora);
        if (!resultado.aceptado()) {
            String codigo = resultado == PoliticaPostergacion.Resultado.VIAJE_YA_SALIO
                    ? PostergacionRechazadaException.VIAJE_INICIADO
                    : PostergacionRechazadaException.ANTICIPACION_INSUFICIENTE;
            throw new PostergacionRechazadaException(codigo, resultado.mensaje());
        }
        return pasaje;
    }

    /** Busca el pasaje entre las compras del usuario. Si es de otra cuenta no aparece y se responde 404. */
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

    /** El viaje original no se muestra: cambiar al mismo viaje no sería un cambio. */
    private static boolean esOtroViaje(ViajeResumenDto viaje, Long idViajeOriginal) {
        return !Objects.equals(viaje.id(), idViajeOriginal);
    }

    private static ResponseStatusException rechazo(String motivo) {
        return new ResponseStatusException(HttpStatus.CONFLICT, motivo);
    }
}
