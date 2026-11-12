package com.transportes.reclamos.controladores;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.reclamos.dto.ConstanciaReclamoDto;
import com.transportes.reclamos.dto.ProveedorDto;
import com.transportes.reclamos.dto.RegistrarReclamoRequest;
import com.transportes.reclamos.dto.RegistroReclamoRespuesta;
import com.transportes.reclamos.servicios.DatosProveedor;
import com.transportes.reclamos.servicios.ReclamoServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/reclamos")
public class ReclamoControlador {

    public static final String ENCABEZADO_TOKEN = "X-Token-Consulta";

    private final ReclamoServicio servicio;
    private final DatosProveedor proveedor;

    public ReclamoControlador(ReclamoServicio servicio, DatosProveedor proveedor) {
        this.servicio = servicio;
        this.proveedor = proveedor;
    }

    @GetMapping("/proveedor")
    public ProveedorDto proveedor() {
        return proveedor.obtener();
    }

    @PostMapping
    public ResponseEntity<RegistroReclamoRespuesta> registrar(
            @Valid @RequestBody RegistrarReclamoRequest datos,
            @AuthenticationPrincipal UsuarioAutenticado usuario,
            HttpServletRequest request) {
        Integer idUsuario = usuario == null ? null : usuario.idUsuario();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicio.registrar(datos, idUsuario, request.getRemoteAddr()));
    }

    @GetMapping("/{codigo}")
    public ConstanciaReclamoDto consultar(
            @PathVariable String codigo,
            @RequestHeader(value = ENCABEZADO_TOKEN, required = false) String token) {
        return servicio.consultar(codigo, token);
    }
}
