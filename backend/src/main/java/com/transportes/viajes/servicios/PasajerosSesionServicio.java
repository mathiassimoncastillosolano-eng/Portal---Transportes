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
import com.transportes.viajes.repositorios.PasajeroRepositorio;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;

/**
 * "Continuar al pago": valida los pasajeros contra los asientos bloqueados por la sesión y los deja
 * en una caché temporal en memoria. NO escribe en la base de datos ni ocupa asientos; eso ocurre
 * en {@link #confirmarCompra} cuando el pago se aprueba. Los mensajes nunca incluyen datos personales.
 */
@Service
public class PasajerosSesionServicio {

    private static final Logger log = LoggerFactory.getLogger(PasajerosSesionServicio.class);
    private static final ZoneId ZONA_PERU = ZoneId.of("America/Lima");
    private static final String CAMPO_PASAJERO = "pasajero";

    private final TokenSesionServicio tokenSesionServicio;
    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final PasajeroRepositorio pasajeroRepositorio;
    private final ViajeAsientoServicio viajeAsientoServicio;
    private final PasajerosSesionCache cache;

    public PasajerosSesionServicio(TokenSesionServicio tokenSesionServicio,
                                   ViajeAsientoRepositorio viajeAsientoRepositorio,
                                   PasajeroRepositorio pasajeroRepositorio,
                                   ViajeAsientoServicio viajeAsientoServicio,
                                   PasajerosSesionCache cache) {
        this.tokenSesionServicio = tokenSesionServicio;
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.pasajeroRepositorio = pasajeroRepositorio;
        this.viajeAsientoServicio = viajeAsientoServicio;
        this.cache = cache;
    }

    /**
     * @throws com.transportes.viajes.excepciones.SesionExpiradaException sesión vencida (-> 410)
     * @throws com.transportes.viajes.excepciones.SesionInvalidaException token inválido (-> 401)
     * @throws AsientoNoDisponibleException sin asientos vigentes (-> 409)
     */
    @Transactional(readOnly = true)
    public ResultadoPasajerosDTO guardar(Long idViaje, GuardarPasajerosRequest request) {
        SesionReserva sesion = tokenSesionServicio.validar(request.tokenSesion(), idViaje);
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
        validarContraSesion(idViajeInt, asientosPropios, pasajeros, errores);

        if (!errores.isEmpty()) {
            cache.eliminar(sesion.idSesion()); // datos inválidos: no queda nada guardado de esta sesión
            return ResultadoPasajerosDTO.conErrores(errores);
        }
        cache.guardar(sesion.idSesion(), sesion.fechaExpiracion(), pasajeros);
        return ResultadoPasajerosDTO.ok();
    }

    /**
     * Pago aprobado: crea/actualiza los pasajeros de la caché en PostgreSQL y ocupa los asientos, todo en
     * una transacción (si algo falla no se guarda nada). Solo después se vacía la caché.
     *
     * @throws AsientoNoDisponibleException sin datos de pasajeros (vencieron o no se continuó al pago) (-> 409)
     */
    public List<Integer> confirmarCompra(Long idViaje, String tokenSesion) {
        SesionReserva sesion = tokenSesionServicio.validar(tokenSesion, idViaje);
        List<PasajeroAsientoRequest> pasajeros = cache.obtener(sesion.idSesion())
                .orElseThrow(() -> new AsientoNoDisponibleException(
                        "Los datos de los pasajeros vencieron. Vuelve a ingresarlos para continuar al pago."));
        List<Integer> confirmados = viajeAsientoServicio.confirmarSesion(idViaje, tokenSesion, pasajeros);
        cache.eliminar(sesion.idSesion());
        return confirmados;
    }

    private void validarContraSesion(Integer idViaje, Set<Integer> asientosPropios,
                                     List<PasajeroAsientoRequest> pasajeros, List<ErrorPasajeroDTO> errores) {
        Set<Integer> atendidos = new HashSet<>();
        for (PasajeroAsientoRequest p : pasajeros) {
            if (p.idAsiento() == null || !asientosPropios.contains(p.idAsiento())) {
                errores.add(new ErrorPasajeroDTO(p.idAsiento(), CAMPO_PASAJERO,
                        "Este asiento ya no está reservado para ti."));
            } else if (!atendidos.add(p.idAsiento())) {
                errores.add(new ErrorPasajeroDTO(p.idAsiento(), CAMPO_PASAJERO,
                        "Este asiento tiene más de un pasajero."));
            } else if (p.numeroDocumento() != null && p.numeroDocumento().matches("\\d{8}")
                    && "DNI".equals(p.tipoDocumento())
                    && !tieneError(errores, p.idAsiento(), ValidadorPasajero.CAMPO_NUMERO_DOCUMENTO)
                    && pasajeroRepositorio.contarAsientosOcupadosDelDocumento(
                            idViaje, p.tipoDocumento(), p.numeroDocumento()) > 0) {
                errores.add(new ErrorPasajeroDTO(p.idAsiento(), ValidadorPasajero.CAMPO_NUMERO_DOCUMENTO,
                        "Este DNI ya tiene un pasaje en este viaje."));
            }
        }
        for (Integer idAsiento : asientosPropios) {
            if (!atendidos.contains(idAsiento)) {
                errores.add(new ErrorPasajeroDTO(idAsiento, CAMPO_PASAJERO,
                        "Faltan los datos del pasajero de este asiento."));
            }
        }
    }

    /** Solo los 8 primeros caracteres: suficiente para comparar tokens en el log sin exponerlos. */
    private static String resumir(String token) {
        return token == null ? "null" : token.substring(0, Math.min(8, token.length()));
    }

    private boolean tieneError(List<ErrorPasajeroDTO> errores, Integer idAsiento, String campo) {
        return errores.stream().anyMatch(e -> Objects.equals(e.idAsiento(), idAsiento) && campo.equals(e.campo()));
    }
}
