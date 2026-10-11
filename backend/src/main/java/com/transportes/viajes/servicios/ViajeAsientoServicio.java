package com.transportes.viajes.servicios;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.buses.dto.AsientoFisicoDTO;
import com.transportes.buses.servicios.AsientoServicio;
import com.transportes.viajes.dto.AsientoDisponibilidadDTO;
import com.transportes.viajes.dto.BloqueoAsientoRequest;
import com.transportes.viajes.dto.BloqueoAsientoResponseDTO;
import com.transportes.viajes.dto.LiberarAsientoRequest;
import com.transportes.viajes.dto.MapaAsientosViajeDTO;
import com.transportes.viajes.dto.PasajeroAsientoRequest;
import com.transportes.viajes.dto.PisoMapaDTO;
import com.transportes.viajes.dto.SesionReservaResponseDTO;
import com.transportes.viajes.entidades.Pasajero;
import com.transportes.viajes.entidades.Viaje;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.eventos.AsientoCambiadoEvento;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.excepciones.SesionExpiradaException;
import com.transportes.viajes.excepciones.SesionInvalidaException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.PasajeroRepositorio;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.repositorios.ViajeRepositorio;
import com.transportes.viajes.servicios.TokenSesionServicio.SesionReserva;

@Service
public class ViajeAsientoServicio {

    private static final Logger log = LoggerFactory.getLogger(ViajeAsientoServicio.class);

    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final ViajeRepositorio viajeRepositorio;
    private final AsientoServicio asientoServicio;
    private final TokenSesionServicio tokenSesionServicio;
    private final PasajeroRepositorio pasajeroRepositorio;
    private final ApplicationEventPublisher publicador;

    @Value("${reserva.max-asientos:6}")
    private int maxAsientos;

    public ViajeAsientoServicio(ViajeAsientoRepositorio viajeAsientoRepositorio,
                                 ViajeRepositorio viajeRepositorio,
                                 AsientoServicio asientoServicio,
                                 TokenSesionServicio tokenSesionServicio,
                                 PasajeroRepositorio pasajeroRepositorio,
                                 ApplicationEventPublisher publicador) {
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.viajeRepositorio = viajeRepositorio;
        this.asientoServicio = asientoServicio;
        this.tokenSesionServicio = tokenSesionServicio;
        this.pasajeroRepositorio = pasajeroRepositorio;
        this.publicador = publicador;
    }

    public SesionReservaResponseDTO crearSesion(Long idViaje) {
        if (!viajeRepositorio.existsById(idViaje)) {
            throw new ViajeNoEncontradoException(idViaje);
        }
        SesionReserva s = tokenSesionServicio.crear(idViaje);
        return new SesionReservaResponseDTO(s.tokenSesion(), s.fechaExpiracion(), s.segundosRestantes());
    }

    @Transactional
    public MapaAsientosViajeDTO obtenerMapaAsientos(Long idViaje, String tokenSesion) {
        Viaje viaje = viajeRepositorio.findById(idViaje)
                .orElseThrow(() -> new ViajeNoEncontradoException(idViaje));

        Integer idViajeInt = Math.toIntExact(idViaje);
        Integer idBus = Math.toIntExact(viaje.getIdBus());

        liberarVencidos(idViajeInt);

        String idSesion = resolverIdSesion(tokenSesion, idViaje);

        List<ViajeAsiento> viajeAsientos = viajeAsientoRepositorio.findByIdViaje(idViajeInt);
        Map<Integer, AsientoFisicoDTO> asientosFisicosPorId = asientoServicio.mapaAsientosFisicosPorId(idBus);

        List<AsientoDisponibilidadDTO> asientosCompletos = viajeAsientos.stream()
                .map(va -> combinar(va, asientosFisicosPorId.get(va.getIdAsiento()), idSesion))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(AsientoDisponibilidadDTO::piso)
                        .thenComparing(AsientoDisponibilidadDTO::fila)
                        .thenComparing(AsientoDisponibilidadDTO::letra))
                .toList();

        return construirMapaPorPiso(asientosCompletos);
    }

    @Transactional
    public BloqueoAsientoResponseDTO bloquearAsiento(Long idViaje, Integer idAsiento, BloqueoAsientoRequest request) {
        SesionReserva sesion = tokenSesionServicio.validar(request.tokenSesion(), idViaje);
        Integer idViajeInt = Math.toIntExact(idViaje);

        viajeAsientoRepositorio.bloquearSesion(sesion.idSesion());

        liberarVencidos(idViajeInt);

        long actuales = viajeAsientoRepositorio.contarBloqueadosPorSesion(idViajeInt, sesion.idSesion());
        if (actuales >= maxAsientos) {
            throw new AsientoNoDisponibleException(
                    "Solo puedes seleccionar hasta " + maxAsientos + " asientos por reserva.");
        }

        int filas = viajeAsientoRepositorio.bloquearAsientoSiDisponible(
                idViajeInt, idAsiento, sesion.fechaExpiracion(), sesion.idSesion());

        if (filas == 0) {
            throw new AsientoNoDisponibleException(
                    "El asiento ya no está disponible. Actualiza el mapa e intenta con otro.");
        }

        publicador.publishEvent(new AsientoCambiadoEvento(idViaje, idAsiento, "bloqueado"));

        AsientoFisicoDTO fisico = asientoServicio.obtenerPorId(idAsiento);
        return new BloqueoAsientoResponseDTO(fisico.numero(), "bloqueado", sesion.fechaExpiracion());
    }

    @Transactional
    public void liberarAsiento(Long idViaje, Integer idAsiento, LiberarAsientoRequest request) {
        SesionReserva sesion = tokenSesionServicio.validar(request.tokenSesion(), idViaje);
        int filas = viajeAsientoRepositorio.liberarAsientoSiPropio(
                Math.toIntExact(idViaje), idAsiento, sesion.idSesion());

        if (filas == 0) {
            throw new AsientoNoDisponibleException(
                    "No se pudo liberar el asiento: ya no está bloqueado por esta sesión, o ya expiró.");
        }

        publicador.publishEvent(new AsientoCambiadoEvento(idViaje, idAsiento, "disponible"));
    }

    /** Asiento vendido dentro de la transacción de registro de la compra. */
    public record AsientoOcupado(Integer idAsiento, Integer idViajeAsiento, Integer idPasajero,
                                 BigDecimal precio, String numero, short piso) {
    }

    /**
     * GANCHO PARA PAGOS: lo invoca SOLO el registro de una compra cuyo pago Mercado Pago ya fue verificado
     * en el backend ({@code RegistroCompraServicio}). No usa el JWT de la sesión (puede haber vencido mientras
     * se procesaba el pago): la operación de pago guarda el id de sesión que figura en token_bloqueo.
     *
     * <p>Debe ejecutarse dentro de la transacción del registro (MANDATORY): crea o actualiza los pasajeros y pasa
     * a OCUPADO cada asiento que SIGUE bloqueado por esa sesión. Si alguno ya no lo está (lo liberó el job y otro
     * cliente lo tomó), lanza excepción y se revierte TODO: todo o nada.</p>
     *
     * @param pasajeros exactamente uno por cada asiento bloqueado de la sesión
     * @throws AsientoNoDisponibleException si no hay asientos, faltan pasajeros o alguno ya no pertenece a la sesión
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<AsientoOcupado> ocuparAsientosDeSesion(Long idViaje, String idSesion, List<PasajeroAsientoRequest> pasajeros) {
        Integer idViajeInt = Math.toIntExact(idViaje);
        viajeAsientoRepositorio.bloquearSesion(idSesion);

        List<ViajeAsiento> bloqueados = viajeAsientoRepositorio
                .findByIdViajeAndTokenBloqueoAndEstadoViajeAsiento(idViajeInt, idSesion, "BLOQUEADO_TEMPORAL");
        if (bloqueados.isEmpty()) {
            throw new AsientoNoDisponibleException("Los asientos de esta reserva ya no están disponibles.");
        }
        if (pasajeros == null || pasajeros.size() != bloqueados.size()) {
            throw new AsientoNoDisponibleException("Los asientos reservados no coinciden con los pasajeros.");
        }
        Map<Integer, PasajeroAsientoRequest> pasajeroPorAsiento = new HashMap<>();
        for (PasajeroAsientoRequest p : pasajeros) {
            if (p.idAsiento() == null || pasajeroPorAsiento.put(p.idAsiento(), p) != null) {
                throw new AsientoNoDisponibleException("Los datos de los pasajeros no son válidos.");
            }
        }

        List<AsientoOcupado> ocupados = new java.util.ArrayList<>();
        for (ViajeAsiento va : bloqueados.stream().sorted(Comparator.comparing(ViajeAsiento::getIdAsiento)).toList()) {
            PasajeroAsientoRequest p = pasajeroPorAsiento.get(va.getIdAsiento());
            if (p == null) {
                throw new AsientoNoDisponibleException("El asiento " + va.getIdAsiento() + " no tiene pasajero.");
            }
            Integer idPasajero = buscarOCrearPasajero(p);
            int filas = viajeAsientoRepositorio.ocuparAsientoDeSesion(va.getIdViajeAsiento(), idSesion, idPasajero);
            if (filas == 0) {
                throw new AsientoNoDisponibleException("El asiento " + va.getIdAsiento() + " ya no está disponible.");
            }
            AsientoFisicoDTO fisico = asientoServicio.obtenerPorId(va.getIdAsiento());
            ocupados.add(new AsientoOcupado(va.getIdAsiento(), va.getIdViajeAsiento(), idPasajero, va.getPrecio(),
                    fisico == null ? String.valueOf(va.getIdAsiento()) : fisico.numero(),
                    fisico == null ? 1 : fisico.piso()));
        }
        for (AsientoOcupado o : ocupados) {
            publicador.publishEvent(new AsientoCambiadoEvento(idViaje, o.idAsiento(), "ocupado"));
        }
        return ocupados;
    }

    /**
     * Mantiene bloqueados los asientos de la sesión mientras Mercado Pago procesa el pago, para que el job de
     * liberación no los suelte a mitad del cobro. Solo afecta asientos todavía vigentes de esa sesión.
     *
     * @return cantidad de asientos extendidos
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public int extenderBloqueoSesion(Long idViaje, String idSesion, LocalDateTime nuevaExpiracion) {
        return viajeAsientoRepositorio.extenderBloqueoSesion(
                Math.toIntExact(idViaje), idSesion, nuevaExpiracion, LocalDateTime.now());
    }

    /** Libera bloqueos vencidos (todos los viajes) y emite un evento por asiento. Lo usa el job. */
    @Transactional
    public int liberarVencidosGlobal() {
        return liberarVencidos(null);
    }

    private int liberarVencidos(Integer idViaje) {
        LocalDateTime ahora = LocalDateTime.now();
        List<ViajeAsiento> vencidos = (idViaje == null)
                ? viajeAsientoRepositorio.buscarBloqueosVencidos(ahora)
                : viajeAsientoRepositorio.buscarBloqueosVencidosDeViaje(idViaje, ahora);
        if (vencidos.isEmpty()) {
            return 0;
        }
        List<Integer> ids = vencidos.stream().map(ViajeAsiento::getIdViajeAsiento).toList();
        List<AsientoCambiadoEvento> eventos = vencidos.stream()
                .map(va -> new AsientoCambiadoEvento(va.getIdViaje().longValue(), va.getIdAsiento(), "disponible"))
                .toList();

        int filas = viajeAsientoRepositorio.liberarPorIds(ids, ahora);
        eventos.forEach(publicador::publishEvent);
        return filas;
    }

    /**
     * Pasajero existente: solo se actualizan los datos permitidos (celular y, si faltaba, la fecha de
     * nacimiento); nombres y apellidos nunca se sobrescriben. Pasajero nuevo: se crea con todos los datos.
     * El candado por documento evita que dos compras simultáneas creen el mismo pasajero dos veces.
     */
    private Integer buscarOCrearPasajero(PasajeroAsientoRequest p) {
        viajeAsientoRepositorio.bloquearSesion("pasajero:" + p.tipoDocumento() + ":" + p.numeroDocumento());
        return pasajeroRepositorio.findByTipoDocumentoAndNumeroDocumento(p.tipoDocumento(), p.numeroDocumento())
                .map(existente -> {
                    existente.setNroTelefono(p.nroTelefono());
                    if (existente.getFechaNacimiento() == null) {
                        existente.setFechaNacimiento(p.fechaNacimiento());
                    }
                    return pasajeroRepositorio.save(existente).getIdPasajero();
                })
                .orElseGet(() -> {
                    Pasajero nuevo = new Pasajero();
                    nuevo.setTipoDocumento(p.tipoDocumento());
                    nuevo.setNumeroDocumento(p.numeroDocumento());
                    nuevo.setNombres(p.nombres());
                    nuevo.setApellidos(p.apellidos());
                    nuevo.setFechaNacimiento(p.fechaNacimiento());
                    nuevo.setNroTelefono(p.nroTelefono());
                    nuevo.setFechaCreacion(LocalDateTime.now());
                    return pasajeroRepositorio.save(nuevo).getIdPasajero();
                });
    }

    private String resolverIdSesion(String tokenSesion, Long idViaje) {
        if (tokenSesion == null || tokenSesion.isBlank()) {
            return null;
        }
        try {
            return tokenSesionServicio.validar(tokenSesion, idViaje).idSesion();
        } catch (SesionExpiradaException | SesionInvalidaException e) {
            return null;
        }
    }

    private AsientoDisponibilidadDTO combinar(ViajeAsiento va, AsientoFisicoDTO fisico, String idSesion) {
        if (fisico == null) {
            log.warn("viaje_asiento id={} referencia un id_asiento={} sin datos físicos válidos",
                    va.getIdViajeAsiento(), va.getIdAsiento());
            return null;
        }
        String estado = mapearEstado(va.getEstadoViajeAsiento());
        boolean esMio = "bloqueado".equals(estado)
                && idSesion != null
                && idSesion.equals(va.getTokenBloqueo());
        return new AsientoDisponibilidadDTO(
                va.getIdAsiento(), fisico.numero(), fisico.fila(), fisico.letra(), fisico.lado(), fisico.piso(),
                estado, va.getPrecio(), esMio
        );
    }

    private String mapearEstado(String estadoBd) {
        if ("DISPONIBLE".equals(estadoBd)) return "disponible";
        if ("BLOQUEADO_TEMPORAL".equals(estadoBd)) return "bloqueado";
        return "ocupado";
    }

    private MapaAsientosViajeDTO construirMapaPorPiso(List<AsientoDisponibilidadDTO> asientos) {
        Map<Short, List<AsientoDisponibilidadDTO>> porPiso = asientos.stream()
                .collect(Collectors.groupingBy(AsientoDisponibilidadDTO::piso,
                        LinkedHashMap::new, Collectors.toList()));

        Map<String, PisoMapaDTO> mapaPorPiso = new LinkedHashMap<>();
        for (Map.Entry<Short, List<AsientoDisponibilidadDTO>> entrada : porPiso.entrySet()) {
            short piso = entrada.getKey();
            List<AsientoDisponibilidadDTO> asientosPiso = entrada.getValue();

            int filaMin = asientosPiso.stream().mapToInt(AsientoDisponibilidadDTO::fila).min().orElse(0);
            int filaMax = asientosPiso.stream().mapToInt(AsientoDisponibilidadDTO::fila).max().orElse(0);
            int filas = filaMax - filaMin + 1;

            List<Integer> asientosPorLado = calcularAsientosPorLado(asientosPiso, filaMin);

            mapaPorPiso.put(String.valueOf(piso),
                    new PisoMapaDTO(piso, filas, asientosPorLado, "Piso " + piso, asientosPiso));
        }

        return new MapaAsientosViajeDTO(porPiso.size(), mapaPorPiso);
    }

    private List<Integer> calcularAsientosPorLado(List<AsientoDisponibilidadDTO> asientosPiso, int filaReferencia) {
        long izquierda = asientosPiso.stream()
                .filter(a -> a.fila() == filaReferencia && "izquierda".equals(a.lado())).count();
        long derecha = asientosPiso.stream()
                .filter(a -> a.fila() == filaReferencia && "derecha".equals(a.lado())).count();
        return List.of((int) izquierda, (int) derecha);
    }
}