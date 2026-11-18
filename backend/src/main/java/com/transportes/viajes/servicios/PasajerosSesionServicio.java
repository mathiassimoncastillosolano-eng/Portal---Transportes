package com.transportes.viajes.servicios;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.viajes.dto.ErrorPasajeroDTO;
import com.transportes.viajes.dto.GuardarPasajerosRequest;
import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.dto.ResultadoPasajerosDTO;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;

/** Valida los datos de los pasajeros y los guarda en memoria hasta que se pague. */
@Service
public class PasajerosSesionServicio {

    private static final Logger log = LoggerFactory.getLogger(PasajerosSesionServicio.class);
    private static final ZoneId ZONA_PERU = ZoneId.of("America/Lima");
    private static final String CAMPO_PASAJERO = "pasajero";

    private final TokenSesionServicio tokenSesionServicio;
    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final PasajerosSesionCache cache;
    private final ValidadorReservaViaje validadorReserva;

    public PasajerosSesionServicio(TokenSesionServicio tokenSesionServicio,
                                   ViajeAsientoRepositorio viajeAsientoRepositorio,
                                   PasajerosSesionCache cache,
                                   ValidadorReservaViaje validadorReserva) {
        this.tokenSesionServicio = tokenSesionServicio;
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.cache = cache;
        this.validadorReserva = validadorReserva;
    }

    /** Valida los pasajeros de la sesión y los guarda si están bien. */
    @Transactional(readOnly = true)
    public ResultadoPasajerosDTO guardar(Long idViaje, GuardarPasajerosRequest request) {
        SesionReserva sesion = tokenSesionServicio.validar(request.tokenSesion(), idViaje);
        validadorReserva.exigirReservable(idViaje); // también exige 20 minutos o más antes de la salida
        Integer idViajeInt = Math.toIntExact(idViaje);
        LocalDateTime ahora = LocalDateTime.now();

        List<ViajeAsiento> bloqueados = viajeAsientoRepositorio
                .findByIdViajeAndTokenBloqueoAndEstadoViajeAsiento(idViajeInt, sesion.idSesion(), "BLOQUEADO_TEMPORAL");
        Set<Integer> asientosPropios = bloqueados.stream()
                .filter(va -> va.getFechaExpiracionBloqueo() != null && !va.getFechaExpiracionBloqueo().isBefore(ahora))
                .map(ViajeAsiento::getIdAsiento)
                .collect(Collectors.toCollection(TreeSet::new));
        if (asientosPropios.isEmpty()) {
            log.warn("Continuar al pago sin asientos vigentes: viaje={}, token={}, bloqueadosDeLaSesion={}, ahora={}, expiraSesion={}, "
                            + "asientosNoDisponiblesDelViaje={}",
                    idViaje, resumir(sesion.idSesion()), bloqueados.size(), ahora, sesion.fechaExpiracion(),
                    viajeAsientoRepositorio.findByIdViaje(idViajeInt).stream()
                            .filter(va -> !"DISPONIBLE".equals(va.getEstadoViajeAsiento()))
                            .map(va -> "asiento=" + va.getIdAsiento() + " estado=" + va.getEstadoViajeAsiento()
                                    + " expira=" + va.getFechaExpiracionBloqueo() + " token=" + resumir(va.getTokenBloqueo()))
                            .toList());
            throw new AsientoNoDisponibleException(bloqueados.isEmpty()
                    ? "No hay asientos reservados en esta sesión. Vuelve a seleccionar tus asientos."
                    : "Tu reserva de asientos expiró. Vuelve a seleccionar tus asientos.");
        }

        List<PasajeroAsientoRequest> pasajeros = request.pasajeros().stream()
                .filter(Objects::nonNull).map(ValidadorPasajero::normalizar).toList();

        List<ErrorPasajeroDTO> errores = new ArrayList<>();
        for (ValidadorPasajero.ErrorCampo e : ValidadorPasajero.validarLote(pasajeros, LocalDate.now(ZONA_PERU))) {
            errores.add(new ErrorPasajeroDTO(e.idAsiento(), e.campo(), e.mensaje()));
        }
        validarContraSesion(asientosPropios, pasajeros, errores);

        if (!errores.isEmpty()) {
            cache.eliminar(sesion.idSesion()); // datos inválidos: no se guarda nada de esta sesión
            return ResultadoPasajerosDTO.conErrores(errores);
        }
        cache.guardar(sesion.idSesion(), sesion.fechaExpiracion(), pasajeros);
        return ResultadoPasajerosDTO.ok();
    }

    /** Devuelve los pasajeros validados de la sesión. */
    public java.util.Optional<List<PasajeroAsientoRequest>> pasajerosValidados(String idSesion) {
        return cache.obtener(idSesion);
    }

    /** Olvida los pasajeros de una sesión. */
    public void descartarPasajeros(String idSesion) {
        cache.eliminar(idSesion);
    }

    private void validarContraSesion(Set<Integer> asientosPropios,
                                     List<PasajeroAsientoRequest> pasajeros, List<ErrorPasajeroDTO> errores) {
        Set<Integer> atendidos = new HashSet<>();
        for (PasajeroAsientoRequest p : pasajeros) {
            if (p.idAsiento() == null || !asientosPropios.contains(p.idAsiento())) {
                errores.add(new ErrorPasajeroDTO(p.idAsiento(), CAMPO_PASAJERO,
                        "Este asiento ya no está reservado para ti."));
            } else if (!atendidos.add(p.idAsiento())) {
                errores.add(new ErrorPasajeroDTO(p.idAsiento(), CAMPO_PASAJERO,
                        "Este asiento tiene más de un pasajero."));
            }
            // Un mismo DNI puede tener varios asientos.
        }
        for (Integer idAsiento : asientosPropios) {
            if (!atendidos.contains(idAsiento)) {
                errores.add(new ErrorPasajeroDTO(idAsiento, CAMPO_PASAJERO,
                        "Faltan los datos del pasajero de este asiento."));
            }
        }
    }

    /** Solo los 8 primeros caracteres del token: sirve para compararlos en el log sin exponerlos. */
    private static String resumir(String token) {
        return token == null ? "null" : token.substring(0, Math.min(8, token.length()));
    }

}
