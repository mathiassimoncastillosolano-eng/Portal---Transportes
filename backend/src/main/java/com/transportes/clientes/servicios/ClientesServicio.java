package com.transportes.clientes.servicios;

import com.transportes.clientes.dto.ClienteDetalleDto;
import com.transportes.clientes.dto.IndicadoresClientesDto;
import com.transportes.clientes.dto.PaginaClientesDto;
import com.transportes.clientes.dto.ViajeHistorialDto;
import com.transportes.clientes.repositorios.ClientesRepositorio;
import com.transportes.clientes.repositorios.ClientesRepositorio.DatosPasajero;
import com.transportes.clientes.repositorios.ClientesRepositorio.FilaHistorial;
import com.transportes.clientes.repositorios.ClientesRepositorio.FiltroClientes;
import com.transportes.compras.reglas.ConstructorCompras;
import com.transportes.compras.reglas.ReglasCompra;
import com.transportes.compras.reglas.ReglasCompra.EstadoCompra;
import com.transportes.compras.reglas.ReglasCompra.FaseViaje;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Lógica del panel de clientes: valida filtros y paginación y arma el historial con las mismas reglas de "Mis
 * pasajes" (ReglasCompra).
 */
@Service
public class ClientesServicio {

    private static final int TAMANO_MAXIMO = 50;
    private static final int TERMINOS_MAXIMOS = 6;
    private static final Set<String> ORDENES = Set.of("nombre", "documento", "viajes", "ultimo", "proximo");
    private static final Set<String> ACTIVIDADES = Set.of("todos", "proximos", "realizados", "sin-viajes");
    private static final DateTimeFormatter HORA = DateTimeFormatter.ofPattern("HH:mm");

    private final ClientesRepositorio repositorio;
    private final Clock reloj;

    public ClientesServicio(ClientesRepositorio repositorio, Clock relojNegocio) {
        this.repositorio = repositorio;
        this.reloj = relojNegocio;
    }

    /** Valida página (máx. 50 por página), actividad y orden; si algo no es válido responde 400. */
    @Transactional(readOnly = true)
    public PaginaClientesDto listar(String q, String tipoDocumento, String actividad, String orden, String direccion,
            int pagina, int tamano) {
        if (pagina < 0 || tamano < 1 || tamano > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginación no válida.");
        }
        String actividadNormalizada = actividad == null || actividad.isBlank() ? "todos" : actividad.trim();
        String ordenNormalizado = orden == null || orden.isBlank() ? "nombre" : orden.trim();
        if (!ACTIVIDADES.contains(actividadNormalizada) || !ORDENES.contains(ordenNormalizado)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Filtro u orden no válido.");
        }
        boolean ascendente = !"desc".equalsIgnoreCase(direccion);
        FiltroClientes filtro = new FiltroClientes(terminos(q), tipoDocumento, actividadNormalizada,
                ordenNormalizado, ascendente, tamano, pagina * tamano);
        LocalDateTime ahora = LocalDateTime.now(reloj);
        return new PaginaClientesDto(repositorio.listar(filtro, ahora), repositorio.contar(filtro, ahora), pagina,
                tamano);
    }

    /** Totales calculados con la hora de Perú. */
    @Transactional(readOnly = true)
    public IndicadoresClientesDto indicadores() {
        return repositorio.indicadores(LocalDateTime.now(reloj));
    }

    /** Datos del pasajero + historial de pasajes. 404 si no existe. */
    @Transactional(readOnly = true)
    public ClienteDetalleDto detalle(int idPasajero) {
        LocalDateTime ahora = LocalDateTime.now(reloj);
        DatosPasajero pasajero = repositorio.buscarPasajero(idPasajero, ahora)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pasajero no encontrado."));
        List<ViajeHistorialDto> historial = new ArrayList<>();
        for (FilaHistorial fila : repositorio.historial(idPasajero)) {
            historial.add(aHistorial(fila, pasajero, ahora));
        }
        return new ClienteDetalleDto(pasajero.idPasajero(), pasajero.tipoDocumento(), pasajero.numeroDocumento(),
                pasajero.nombres(), pasajero.apellidos(), pasajero.telefono(), pasajero.fechaNacimiento(),
                pasajero.fechaRegistro(), pasajero.viajes(), pasajero.primerViaje(), pasajero.ultimoViaje(),
                pasajero.proximoViaje(), historial);
    }

    private static ViajeHistorialDto aHistorial(FilaHistorial fila, DatosPasajero pasajero, LocalDateTime ahora) {
        EstadoCompra estado = ReglasCompra.estadoCompra(fila.estadoVenta(), fila.estadoPago(), fila.estadoOperacion());
        FaseViaje fase = ReglasCompra.faseViaje(fila.estadoViaje(), fila.fechaSalida(), fila.horaSalida(), ahora);
        String horaLlegada = null;
        LocalDate fechaLlegada = null;
        if (fila.fechaSalida() != null && fila.horaSalida() != null && fila.duracionMin() != null) {
            LocalDateTime llegada = fila.fechaSalida().atTime(fila.horaSalida()).plusMinutes(fila.duracionMin());
            horaLlegada = llegada.format(HORA);
            fechaLlegada = llegada.toLocalDate();
        }
        String comprobante = fila.serie() != null && fila.numero() != null ? fila.serie() + "-" + fila.numero() : null;
        return new ViajeHistorialDto(
                fila.idPasaje(), ConstructorCompras.numeroBoleto(fila.idPasaje()), fila.idVenta(),
                ConstructorCompras.codigoCompra(fila.idVenta()), comprobante, fila.origen(), fila.destino(),
                fila.fechaSalida(), fila.horaSalida() == null ? null : fila.horaSalida().format(HORA),
                horaLlegada, fechaLlegada, fila.asiento(), fila.piso(), fila.tipoBus(), fila.precio(),
                fila.moneda() == null ? ConstructorCompras.MONEDA_POR_DEFECTO : fila.moneda(), estado.name(),
                fase.name(), ReglasCompra.documentoDisponible(estado, fase),
                (pasajero.nombres() + " " + pasajero.apellidos()).trim(),
                pasajero.tipoDocumento() + " " + pasajero.numeroDocumento());
    }

    private static List<String> terminos(String q) {
        if (q == null || q.isBlank()) {
            return List.of();
        }
        String normalizado = Normalizer.normalize(q.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        List<String> terminos = new ArrayList<>();
        for (String parte : normalizado.split("\\s+")) {
            if (!parte.isBlank() && terminos.size() < TERMINOS_MAXIMOS) {
                terminos.add(parte);
            }
        }
        return terminos;
    }
}
