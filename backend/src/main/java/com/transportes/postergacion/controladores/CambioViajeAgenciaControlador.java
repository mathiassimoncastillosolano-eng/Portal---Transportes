package com.transportes.postergacion.controladores;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.postergacion.dto.ConfirmacionPostergacionDto;
import com.transportes.postergacion.dto.ConfirmarCambioAgenciaRequest;
import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.CotizacionCambioDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.servicios.CambioViajeAgenciaServicio;
import com.transportes.security.servicios.UsuarioAutenticado;

import jakarta.validation.Valid;

/** Cambio de viajes desde el Sistema Empresarial. Solo rol AGENCIA (regla en ConfiguracionSeguridad). */
@RestController
@RequestMapping("/api/pasajes/{idPasaje}/cambio-viaje")
public class CambioViajeAgenciaControlador {

    private final CambioViajeAgenciaServicio cambios;

    public CambioViajeAgenciaControlador(CambioViajeAgenciaServicio cambios) {
        this.cambios = cambios;
    }

    @GetMapping("/elegibilidad")
    public ElegibilidadCambioDto elegibilidad(@PathVariable int idPasaje) {
        return cambios.consultarElegibilidad(idPasaje);
    }

    @GetMapping("/viajes")
    public ConsultaPostergacionDto viajes(@PathVariable int idPasaje,
                                         @RequestParam String origen,
                                         @RequestParam String destino,
                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return cambios.consultarViajes(idPasaje, origen, destino, fecha);
    }

    @GetMapping("/cotizacion")
    public CotizacionCambioDto cotizacion(@PathVariable int idPasaje,
                                          @RequestParam long idViajeNuevo,
                                          @RequestParam int idAsiento) {
        return cambios.cotizar(idPasaje, idViajeNuevo, idAsiento);
    }

    @PostMapping("/confirmar")
    public ConfirmacionPostergacionDto confirmar(@AuthenticationPrincipal UsuarioAutenticado agente,
                                                 @PathVariable int idPasaje,
                                                 @Valid @RequestBody ConfirmarCambioAgenciaRequest solicitud) {
        return cambios.confirmarSinCobro(idUsuarioDe(agente), idPasaje, solicitud);
    }

    private static int idUsuarioDe(UsuarioAutenticado agente) {
        if (agente == null || agente.idUsuario() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Su sesión terminó. Inicie sesión nuevamente.");
        }
        return agente.idUsuario();
    }
}
