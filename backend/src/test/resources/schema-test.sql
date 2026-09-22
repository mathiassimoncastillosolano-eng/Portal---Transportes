CREATE TABLE IF NOT EXISTS usuario (
 id_usuario integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombres varchar(100) NOT NULL,
 apellidos varchar(100) NOT NULL,
 correo varchar(150) NOT NULL,
 contrasena_hash varchar(255) NOT NULL,
 nro_telefono varchar(20),
 activo boolean NOT NULL DEFAULT true,
 fecha_creacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 fecha_actualizacion timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT uq_usuario_correo UNIQUE (correo)
);
CREATE TABLE IF NOT EXISTS ubicacion (
 id_ubicacion integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
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
