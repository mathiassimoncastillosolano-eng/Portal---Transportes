package com.transportes.compras.servicios;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.transportes.compras.dto.CompraDto;
import com.transportes.compras.dto.FilaCompra;
import com.transportes.compras.dto.ListaComprasDto;
import com.transportes.compras.dto.ResumenPerfilDto;
import com.transportes.compras.reglas.ConstructorCompras;
import com.transportes.compras.repositorios.CompraRepositorio;

/**
 * Casos de uso de "Mis pasajes", historial e indicadores del perfil. Recibe siempre el id del usuario autenticado
 * (extraído del JWT por el controlador) y delega el criterio de negocio en {@link ConstructorCompras}.
 */
@Service
public class CompraServicio {

    private final CompraRepositorio repositorio;
    private final Clock reloj;

    public CompraServicio(CompraRepositorio repositorio, Clock relojNegocio) {
        this.repositorio = repositorio;
        this.reloj = relojNegocio;
    }

    @Transactional(readOnly = true)
    public ResumenPerfilDto resumen(int idUsuario) {
        return ConstructorCompras.resumen(repositorio.filasResumen(idUsuario), ahora());
    }

    /** Vigentes primero y, después, el resto de las compras. */
    @Transactional(readOnly = true)
    public ListaComprasDto listar(int idUsuario) {
        List<CompraDto> compras = ConstructorCompras.agrupar(repositorio.filasDelUsuario(idUsuario), ahora());
        return new ListaComprasDto(
                ConstructorCompras.contarVigentes(compras), ConstructorCompras.ordenarParaPasajes(compras));
    }

    /** Compras que ya no están vigentes (realizadas, canceladas, reembolsadas o sin confirmar). */
    @Transactional(readOnly = true)
    public List<CompraDto> historial(int idUsuario) {
        return ConstructorCompras.paraHistorial(
                ConstructorCompras.agrupar(repositorio.filasDelUsuario(idUsuario), ahora()));
    }

    /**
     * @throws ResponseStatusException 404 si la compra no existe O no pertenece al usuario (misma respuesta en
     *                                 ambos casos para no revelar qué ventas existen)
     */
    @Transactional(readOnly = true)
    public CompraDto detalle(int idUsuario, int idVenta) {
        List<FilaCompra> filas = repositorio.filasDeCompra(idUsuario, idVenta);
        if (filas.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró la compra solicitada.");
        }
        return ConstructorCompras.agrupar(filas, ahora()).get(0);
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(reloj);
    }
}
