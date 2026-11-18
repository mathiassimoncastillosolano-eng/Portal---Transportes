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

/** Lógica para buscar los viajes a los que se puede cambiar un pasaje. */
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

    /** Devuelve los viajes de la ruta y fecha elegidas, sin el viaje original. */
    @Transactional(readOnly = true)
    public ConsultaPostergacionDto consultarViajes(int idUsuario, int idPasaje,
                                                   String origen, String destino, LocalDate fecha) {
        LocalDateTime ahora = LocalDateTime.now(reloj);

        // Revisa que el pasaje sea del usuario y esté vigente.
        FilaCompra pasaje = buscarPasajePropio(idUsuario, idPasaje);
        if (!estaVigente(pasaje, ahora)) {
            throw rechazo("Este pasaje no está vigente, por eso no se puede cambiar.");
        }

        // Revisa que falten 6 horas o más para la salida.
        PoliticaPostergacion.Resultado resultado =
                PoliticaPostergacion.evaluar(pasaje.fechaSalida(), pasaje.horaSalida(), ahora);
        if (!resultado.aceptado()) {
            throw rechazo(resultado.mensaje());
        }

        // Busca los viajes de esa ruta y fecha.
        List<ViajeResumenDto> encontrados = viajes.buscar(origen, destino, fecha, "cualquiera");
        List<ViajeResumenDto> mostrados = encontrados.stream()
                .filter(viaje -> esOtroViaje(viaje, pasaje.idViaje()))
                .toList();
        return new ConsultaPostergacionDto(mostrados, encontrados.size() - mostrados.size());
    }

    /** Revisa que el pasaje todavía se pueda cambiar y lo devuelve. */
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

    /** Revisa si la compra está pagada y el viaje todavía no sale. */
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
