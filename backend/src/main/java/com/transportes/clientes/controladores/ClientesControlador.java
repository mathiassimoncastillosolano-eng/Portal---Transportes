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

/** Recibe las peticiones del panel de clientes del Sistema Empresarial. */
@RestController
@RequestMapping("/api/clientes")
public class ClientesControlador {

    private final ClientesServicio servicio;

    public ClientesControlador(ClientesServicio servicio) {
        this.servicio = servicio;
    }

    /** Devuelve la lista de pasajeros por páginas, con búsqueda, filtro y orden. */
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

    /** Devuelve los totales que se muestran arriba del panel. */
    @GetMapping("/indicadores")
    public IndicadoresClientesDto indicadores() {
        return servicio.indicadores();
    }

    /** Devuelve los datos de un pasajero y su historial de viajes. */
    @GetMapping("/{idPasajero}")
    public ClienteDetalleDto detalle(@PathVariable int idPasajero) {
        return servicio.detalle(idPasajero);
    }
}
