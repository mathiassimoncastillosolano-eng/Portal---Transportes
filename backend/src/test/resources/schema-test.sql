CREATE TABLE IF NOT EXISTS usuario (
 id_usuario integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombres varchar(100) NOT NULL,
 apellidos varchar(100) NOT NULL,
 correo varchar(150) NOT NULL,
 contrasena_hash varchar(255),
 nro_telefono varchar(20),
 google_id varchar(255),
 activo boolean NOT NULL DEFAULT true,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_actualizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_usuario_correo UNIQUE (correo),
 CONSTRAINT uq_usuario_google_id UNIQUE (google_id)
);
CREATE TABLE IF NOT EXISTS ubicacion (
 id_ubicacion bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre varchar(255) NOT NULL, distrito varchar(255), provincia varchar(255),
 departamento varchar(255), url_imagen varchar(255), activa boolean NOT NULL,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tipo_bus (
 id_tipo_bus integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre_tipo varchar(50) NOT NULL, descripcion varchar(200),
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 url_imagen varchar(255), descripcion_reclinacion varchar(60)
);
CREATE TABLE IF NOT EXISTS password_reset_tokens (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 id_usuario integer NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
 token_hash varchar(64) NOT NULL UNIQUE,
 fecha_expiracion timestamp NOT NULL,
 fecha_uso timestamp,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 intentos integer NOT NULL DEFAULT 0,
 fecha_verificacion timestamp
);
CREATE TABLE IF NOT EXISTS reclamo (
 id_reclamo integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 codigo varchar(20) NOT NULL UNIQUE,
 clave_idempotencia uuid UNIQUE,
 fecha_registro timestamp NOT NULL,
 tipo_requerimiento varchar(10) NOT NULL,
 estado varchar(20) NOT NULL,
 nombres_completos varchar(200) NOT NULL,
 tipo_documento varchar(20) NOT NULL,
 numero_documento varchar(20) NOT NULL,
 domicilio varchar(250) NOT NULL,
 telefono varchar(20) NOT NULL,
 correo varchar(150) NOT NULL,
 id_usuario integer,
 id_pasaje integer,
 id_viaje bigint,
 servicio_involucrado varchar(100) NOT NULL,
 codigo_pasaje varchar(30),
 codigo_viaje varchar(30),
 origen varchar(100),
 destino varchar(100),
 fecha_servicio date,
 numero_asiento varchar(10),
 descripcion_servicio varchar(300) NOT NULL,
 fecha_incidente date NOT NULL,
 monto_reclamado numeric(10,2),
 moneda varchar(3) NOT NULL,
 detalle_hechos varchar(2000) NOT NULL,
 pedido_consumidor varchar(1000) NOT NULL,
 medio_respuesta varchar(20) NOT NULL,
 correo_respuesta varchar(150),
 direccion_respuesta varchar(250),
 declaracion_veracidad boolean NOT NULL,
 autoriza_tratamiento_datos boolean NOT NULL,
 fecha_limite_respuesta date NOT NULL,
 fecha_atencion timestamp,
 respuesta_empresa varchar(4000),
 medidas_adoptadas varchar(2000),
 fecha_creacion timestamp NOT NULL,
 fecha_actualizacion timestamp NOT NULL
);
