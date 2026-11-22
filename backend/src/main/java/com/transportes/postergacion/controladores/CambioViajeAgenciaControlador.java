package com.transportes.postergacion.controladores;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.transportes.postergacion.dto.ConsultaPostergacionDto;
import com.transportes.postergacion.dto.CotizacionCambioDto;
import com.transportes.postergacion.dto.ElegibilidadCambioDto;
import com.transportes.postergacion.servicios.CambioViajeAgenciaServicio;

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
}
