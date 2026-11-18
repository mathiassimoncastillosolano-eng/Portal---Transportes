package com.transportes.usuarios.controladores;

import com.transportes.usuarios.dto.RegistroUsuarioRequest;
import com.transportes.usuarios.dto.RegistroUsuarioResponse;
import com.transportes.usuarios.servicios.RegistroUsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Recibe las peticiones de registro de cuentas. */
@RestController
@RequestMapping("/api/usuarios")
public class RegistroUsuarioController {

    private final RegistroUsuarioService registroUsuarioService;

    public RegistroUsuarioController(
            RegistroUsuarioService registroUsuarioService) {
        this.registroUsuarioService = registroUsuarioService;
    }

    /** Valida los datos con @Valid y responde 201 con la cuenta creada. */
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public RegistroUsuarioResponse registrar(
            @Valid @RequestBody RegistroUsuarioRequest solicitud) {

        return registroUsuarioService.registrar(solicitud);
    }
}