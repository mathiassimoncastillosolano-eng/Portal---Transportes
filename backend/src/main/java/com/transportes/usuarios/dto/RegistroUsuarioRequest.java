package com.transportes.usuarios.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import java.util.Locale;

@Getter
@Setter
public class RegistroUsuarioRequest {

    @NotBlank(message = "Los nombres son obligatorios")
    @Size(max = 100, message = "Los nombres admiten hasta 100 caracteres")
    private String nombres;

    @NotBlank(message = "Los apellidos son obligatorios")
    @Size(max = 100, message = "Los apellidos admiten hasta 100 caracteres")
    private String apellidos;

    @NotBlank(message = "El correo es obligatorio")
    @Email(message = "El correo debe tener un formato válido")
    @Size(max = 150, message = "El correo admite hasta 150 caracteres")
    private String correo;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
    private String contrasena;

    @Size(max = 20, message = "El teléfono admite hasta 20 caracteres")
    private String nroTelefono;

    // Normalizar antes de @Valid y de la consulta evita diferencias por espacios/mayusculas.
    public void setCorreo(String correo) {
        this.correo = correo == null ? null : correo.strip().toLowerCase(Locale.ROOT);
    }
}
