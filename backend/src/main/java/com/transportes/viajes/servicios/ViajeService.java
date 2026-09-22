package com.transportes.viajes.servicios;

import com.transportes.destinos.entidades.Agencia;
import com.transportes.destinos.entidades.Ruta;
import com.transportes.viajes.dto.TipoBusDTO;
import com.transportes.viajes.dto.ViajeResultadoDTO;
import com.transportes.viajes.entidades.Bus;
import com.transportes.viajes.entidades.ProgramacionViaje;
import com.transportes.viajes.entidades.TipoBus;
import com.transportes.viajes.entidades.Viaje;
import com.transportes.viajes.repositorios.ResumenAsientosProjection;
import com.transportes.viajes.repositorios.TipoBusRepository;
import com.transportes.viajes.repositorios.ViajeAsientoRepository;
import com.transportes.viajes.repositorios.ViajeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ViajeService {

    private static final DateTimeFormatter FORMATO_HORA = DateTimeFormatter.ofPattern("HH:mm");
    private static final String ESTADO_CANCELADO = "CANCELADO";
    private static final int UMBRAL_POCOS_ASIENTOS = 10;

    private final ViajeRepository viajeRepository;
    private final TipoBusRepository tipoBusRepository;
    private final ViajeAsientoRepository viajeAsientoRepository;

    public ViajeService(ViajeRepository viajeRepository,
                         TipoBusRepository tipoBusRepository,
                         ViajeAsientoRepository viajeAsientoRepository) {
        this.viajeRepository = viajeRepository;
        this.tipoBusRepository = tipoBusRepository;
        this.viajeAsientoRepository = viajeAsientoRepository;
    }

    /**
     * Busca viajes cuyo tipo de servicio (viaje -> programacion_viaje ->
     * tipo_bus -> nombre_tipo) coincida con CUALQUIERA de los nombres
     * recibidos (OR). Lista vacía o nula = "Todos".
     *
     * Se trae la lista completa de viajes UNA sola
     * vez, ya con sus relaciones resueltas (`buscarTodosConDetalles`,
     * ver ViajeRepository) y el filtro por tipo se aplica en memoria.
     */
    @Transactional(readOnly = true)
    public List<ViajeResultadoDTO> buscarPorTipoServicio(List<String> tiposServicio) {
        List<Viaje> todos = viajeRepository.buscarTodosConDetalles();

        List<Viaje> filtrados = (tiposServicio == null || tiposServicio.isEmpty())
                ? todos
                : todos.stream()
                    .filter(viaje -> tiposServicio.contains(viaje.getProgramacion().getTipoBus().getNombreTipo()))
                    .toList();

        if (filtrados.isEmpty()) return List.of();

        List<Integer> idsViaje = filtrados.stream().map(Viaje::getIdViaje).toList();

        // Una sola consulta agregada (GROUP BY) para TODOS los viajes
        // filtrados, en vez de una consulta de disponibilidad por viaje.
        Map<Integer, ResumenAsientosProjection> resumenPorViaje = viajeAsientoRepository
                .resumenPorViajes(idsViaje).stream()
                .collect(Collectors.toMap(ResumenAsientosProjection::getIdViaje, Function.identity()));

        return filtrados.stream()
                .map(viaje -> mapearADTO(viaje, resumenPorViaje.get(viaje.getIdViaje())))
                .toList();
    }

    /**
     * Lista los tipos de bus existentes en la BD (id + nombre_tipo), en
     * orden alfabético, para que el frontend construya los chips de
     * filtro dinámicamente.
     */
    @Transactional(readOnly = true)
    public List<TipoBusDTO> listarTiposDeBus() {
        return tipoBusRepository.findAllByOrderByNombreTipoAsc().stream()
                .map(tipoBus -> new TipoBusDTO(tipoBus.getIdTipoBus(), tipoBus.getNombreTipo()))
                .toList();
    }

    private ViajeResultadoDTO mapearADTO(Viaje viaje, ResumenAsientosProjection resumen) {
        ProgramacionViaje programacion = viaje.getProgramacion();
        Ruta ruta = programacion.getRuta();
        TipoBus tipoBus = programacion.getTipoBus();
        Bus bus = viaje.getBus();
        Agencia agenciaOrigen = ruta.getAgenciaOrigen();
        Agencia agenciaDestino = ruta.getAgenciaDestino();

        LocalTime horaSalida = viaje.getHoraSalida();
        Integer duracionMin = ruta.getDuracionEstimadaMin();

        Integer disponibles = resumen == null ? null : resumen.getDisponibles().intValue();
        BigDecimal precio = resumen == null
                ? null
                : (resumen.getPrecioDesdeDisponible() != null ? resumen.getPrecioDesdeDisponible() : resumen.getPrecioMinimo());

        return new ViajeResultadoDTO(
                String.valueOf(viaje.getIdViaje()),
                agenciaOrigen.getNombreAgencia(),
                textoUbicacion(agenciaOrigen),
                textoUbicacion(agenciaDestino),
                horaSalida.format(FORMATO_HORA),
                calcularHoraLlegada(horaSalida, duracionMin),
                calcularTextoDuracion(duracionMin),
                tipoBus.getNombreTipo(),
                listarServicios(tipoBus),
                disponibles,
                precio,
                calcularEstado(viaje, disponibles)
        );
    }

    private String calcularEstado(Viaje viaje, Integer disponibles) {
        if (ESTADO_CANCELADO.equalsIgnoreCase(viaje.getEstadoViaje())) return "agotado";
        if (disponibles == null) return "disponible"; // sin filas en viaje_asiento todavía
        if (disponibles == 0) return "agotado";
        if (disponibles < UMBRAL_POCOS_ASIENTOS) return "pocos-asientos";
        return "disponible";
    }

    private String textoUbicacion(Agencia agencia) {
        var ubicacion = agencia.getUbicacion();
        if (ubicacion == null) return agencia.getNombreAgencia();
        return ubicacion.getDepartamento() != null ? ubicacion.getDepartamento() : ubicacion.getNombre();
    }

    private String calcularHoraLlegada(LocalTime horaSalida, Integer duracionMin) {
        if (duracionMin == null) return "--:--";
        return horaSalida.plusMinutes(duracionMin).format(FORMATO_HORA);
    }

    private String calcularTextoDuracion(Integer duracionMin) {
        if (duracionMin == null) return "Duración no disponible";
        long horas = Math.round(duracionMin / 60.0);
        return horas + " h";
    }

    private List<String> listarServicios(TipoBus tipoBus) {
        if (tipoBus.getServicios() == null) return List.of();
        return tipoBus.getServicios().stream()
                .map(servicioBus -> servicioBus.getNombreServicio())
                .sorted(Comparator.naturalOrder())
                .toList();
    }
}
