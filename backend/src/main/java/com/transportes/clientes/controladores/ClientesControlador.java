package com.transportes.clientes.controladores;

import com.transportes.clientes.dto.ClienteDetalleDto;
import com.transportes.clientes.dto.IndicadoresClientesDto;
import com.transportes.clientes.dto.PaginaClientesDto;
import com.transportes.clientes.servicios.ClientesServicio;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controlador REST del panel de clientes del Sistema Empresarial (/api/clientes). Solo entran empleados con rol
 * AGENCIA o GERENTE (regla en ConfiguracionSeguridad).
 */
@RestController
@RequestMapping("/api/clientes")
public class ClientesControlador {

    private final ClientesServicio servicio;

    public ClientesControlador(ClientesServicio servicio) {
        this.servicio = servicio;
    }

    /**
     * GET /api/clientes: lista paginada de pasajeros. Permite buscar por texto, filtrar por actividad y ordenar.
     */
    @GetMapping
    public PaginaClientesDto listar(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String tipoDocumento,
            @RequestParam(required = false) String actividad,
            @RequestParam(required = false) String orden,
            @RequestParam(required = false) String direccion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "10") int tamano) {
        return servicio.listar(q, tipoDocumento, actividad, orden, direccion, pagina, tamano);
    }

    /** GET /api/clientes/indicadores: los totales de las tarjetas de arriba del panel. */
    @GetMapping("/indicadores")
    public IndicadoresClientesDto indicadores() {
        return servicio.indicadores();
    }

    /** GET /api/clientes/{idPasajero}: ficha del pasajero con su historial de viajes. */
    @GetMapping("/{idPasajero}")
    public ClienteDetalleDto detalle(@PathVariable int idPasajero) {
        return servicio.detalle(idPasajero);
    }
}
