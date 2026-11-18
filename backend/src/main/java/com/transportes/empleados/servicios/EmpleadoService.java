package com.transportes.empleados.servicios;

import com.transportes.empleados.entidades.Empleado;
import com.transportes.empleados.repositorios.EmpleadoRepository;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de los empleados: quién puede entrar al Sistema Empresarial, con qué rol y en qué sede trabaja. Lo usan
 * el login empresarial y el filtro JWT.
 */
@Service
public class EmpleadoService {

    /** Rol que se da a las cuentas que no están en la tabla empleado. */
    public static final String ROL_CLIENTE = "CLIENTE";
    private static final String TODAS_LAS_SEDES = "Todas las sedes";

    private final EmpleadoRepository empleadoRepository;

    public EmpleadoService(EmpleadoRepository empleadoRepository) {
        this.empleadoRepository = empleadoRepository;
    }

    /** Devuelve el empleado de esa cuenta solo si existe y está activo. */
    @Transactional(readOnly = true)
    public Optional<Empleado> buscarEmpleadoActivo(Integer idUsuario) {
        return empleadoRepository.findByIdUsuario(idUsuario)
                .filter(Empleado::estaActivo);
    }

    /** Rol de la cuenta: AGENCIA, GERENTE o, si no es empleado, CLIENTE. */
    @Transactional(readOnly = true)
    public String obtenerRol(Integer idUsuario) {
        return buscarEmpleadoActivo(idUsuario)
                .map(empleado -> empleado.getRol().name())
                .orElse(ROL_CLIENTE);
    }

    /** Nombre de la sede del empleado. El gerente no tiene sede propia. */
    @Transactional(readOnly = true)
    public String obtenerNombreSede(Empleado empleado) {
        if (empleado.getIdAgencia() == null) {
            return TODAS_LAS_SEDES;
        }
        return empleadoRepository.buscarNombreAgencia(empleado.getIdAgencia())
                .orElse("Sede " + empleado.getIdAgencia());
    }
}
