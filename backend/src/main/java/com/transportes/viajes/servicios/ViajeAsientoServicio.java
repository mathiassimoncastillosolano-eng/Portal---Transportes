package com.transportes.viajes.servicios;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.transportes.buses.dto.AsientoFisicoDTO;
import com.transportes.buses.servicios.AsientoServicio;
import com.transportes.viajes.dto.AsientoDisponibilidadDTO;
import com.transportes.viajes.dto.BloqueoAsientoRequest;
import com.transportes.viajes.dto.BloqueoAsientoResponseDTO;
import com.transportes.viajes.dto.LiberarAsientoRequest;
import com.transportes.viajes.dto.MapaAsientosViajeDTO;
import com.transportes.viajes.dto.PisoMapaDTO;
import com.transportes.viajes.entidades.Pasajero;
import com.transportes.viajes.entidades.Viaje;
import com.transportes.viajes.entidades.ViajeAsiento;
import com.transportes.viajes.excepciones.AsientoNoDisponibleException;
import com.transportes.viajes.excepciones.ViajeNoEncontradoException;
import com.transportes.viajes.repositorios.PasajeroRepositorio;
import com.transportes.viajes.repositorios.ViajeAsientoRepositorio;
import com.transportes.viajes.repositorios.ViajeRepositorio;

@Service
public class ViajeAsientoServicio {

    private static final Logger log = LoggerFactory.getLogger(ViajeAsientoServicio.class);

    private final ViajeAsientoRepositorio viajeAsientoRepositorio;
    private final ViajeRepositorio viajeRepositorio;
    private final AsientoServicio asientoServicio;
    private final PasajeroRepositorio pasajeroRepositorio;

    @Value("${reserva.bloqueo-minutos:1}")
    private int bloqueoMinutos;

    public ViajeAsientoServicio(ViajeAsientoRepositorio viajeAsientoRepositorio,
                                 ViajeRepositorio viajeRepositorio,
                                 AsientoServicio asientoServicio,
                                 PasajeroRepositorio pasajeroRepositorio) {
        this.viajeAsientoRepositorio = viajeAsientoRepositorio;
        this.viajeRepositorio = viajeRepositorio;
        this.asientoServicio = asientoServicio;
        this.pasajeroRepositorio = pasajeroRepositorio;
    }

    @Transactional
    public MapaAsientosViajeDTO obtenerMapaAsientos(Long idViaje) {
        Viaje viaje = viajeRepositorio.findById(idViaje)
                .orElseThrow(() -> new ViajeNoEncontradoException(idViaje));

        Integer idViajeInt = Math.toIntExact(idViaje);
        Integer idBus = Math.toIntExact(viaje.getIdBus());

        viajeAsientoRepositorio.liberarBloqueosVencidos(idViajeInt);

        List<ViajeAsiento> viajeAsientos = viajeAsientoRepositorio.findByIdViaje(idViajeInt);
        Map<Integer, AsientoFisicoDTO> asientosFisicosPorId = asientoServicio.mapaAsientosFisicosPorId(idBus);

        List<AsientoDisponibilidadDTO> asientosCompletos = viajeAsientos.stream()
                .map(va -> combinar(va, asientosFisicosPorId.get(va.getIdAsiento())))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(AsientoDisponibilidadDTO::piso)
                        .thenComparing(AsientoDisponibilidadDTO::fila)
                        .thenComparing(AsientoDisponibilidadDTO::letra))
                .toList();

        return construirMapaPorPiso(asientosCompletos);
    }

    @Transactional
    public BloqueoAsientoResponseDTO bloquearAsiento(Long idViaje, Integer idAsiento, BloqueoAsientoRequest request) {
        Integer idViajeInt = Math.toIntExact(idViaje);
        Integer idPasajero = buscarOCrearPasajero(request);
        LocalDateTime expiracion = LocalDateTime.now().plusMinutes(bloqueoMinutos);

        int filasActualizadas = viajeAsientoRepositorio.bloquearAsientoSiDisponible(
                idViajeInt, idAsiento, expiracion, request.tokenBloqueo(), idPasajero);

        if (filasActualizadas == 0) {
            throw new AsientoNoDisponibleException(
                    "El asiento ya no está disponible. Actualiza el mapa e intenta con otro.");
        }

        AsientoFisicoDTO fisico = asientoServicio.obtenerPorId(idAsiento);
        return new BloqueoAsientoResponseDTO(fisico.numero(), "bloqueado", expiracion);
    }

    @Transactional
    public void liberarAsiento(Long idViaje, Integer idAsiento, LiberarAsientoRequest request) {
        Integer idViajeInt = Math.toIntExact(idViaje);
        int filasActualizadas = viajeAsientoRepositorio.liberarAsientoSiPropio(
                idViajeInt, idAsiento, request.tokenBloqueo());

        if (filasActualizadas == 0) {
            throw new AsientoNoDisponibleException(
                    "No se pudo liberar el asiento: ya no está bloqueado por esta sesión, o ya expiró.");
        }
    }

    private Integer buscarOCrearPasajero(BloqueoAsientoRequest request) {
        return pasajeroRepositorio.findByTipoDocumentoAndNumeroDocumento(
                        request.tipoDocumento(), request.numeroDocumento())
                .map(Pasajero::getIdPasajero)
                .orElseGet(() -> {
                    Pasajero nuevo = new Pasajero();
                    nuevo.setTipoDocumento(request.tipoDocumento());
                    nuevo.setNumeroDocumento(request.numeroDocumento());
                    nuevo.setNombres(request.nombres());
                    nuevo.setApellidos(request.apellidos());
                    nuevo.setFechaNacimiento(request.fechaNacimiento());
                    nuevo.setFechaCreacion(LocalDateTime.now());
                    return pasajeroRepositorio.save(nuevo).getIdPasajero();
                });
    }

    private AsientoDisponibilidadDTO combinar(ViajeAsiento va, AsientoFisicoDTO fisico) {
        if (fisico == null) {
            log.warn("viaje_asiento id={} referencia un id_asiento={} sin datos físicos válidos",
                    va.getIdViajeAsiento(), va.getIdAsiento());
            return null;
        }
        return new AsientoDisponibilidadDTO(
                va.getIdAsiento(), fisico.numero(), fisico.fila(), fisico.letra(), fisico.lado(), fisico.piso(),
                mapearEstado(va.getEstadoViajeAsiento()), va.getPrecio()
        );
    }

    private String mapearEstado(String estadoBd) {
        return "DISPONIBLE".equals(estadoBd) ? "disponible" : "ocupado";
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