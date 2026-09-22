/**
 * Definiciones de tipos compartidos (JSDoc) para todo el frontend.
 * No generan código en tiempo de ejecución: solo documentan la forma
 * de los datos simulados que circulan por la aplicación.
 */

/**
 * @typedef {Object} Usuario
 * @property {string} id
 * @property {string} nombres
 * @property {string} apellidos
 * @property {string} correo
 * @property {string} telefono
 * @property {string} contrasena
 */

/**
 * @typedef {Object} Destino
 * @property {string} id
 * @property {string} ciudad
 * @property {string} descripcion
 * @property {string} imagen
 * @property {number} desde
 */

/**
 * @typedef {Object} TipoServicio
 * @property {string} id
 * @property {string} nombre
 * @property {string} descripcion
 * @property {string} caracteristica
 * @property {string} imagen
 * @property {string} icono
 */

/**
 * @typedef {Object} ResultadoViaje
 * @property {string} id
 * @property {string} empresa
 * @property {string} origen
 * @property {string} destino
 * @property {string} horaSalida
 * @property {string} horaLlegada
 * @property {string} duracion
 * @property {string} tipoBus
 * @property {string[]} servicios
 * @property {number} asientosDisponibles
 * @property {number} precio
 * @property {'disponible'|'pocos-asientos'|'agotado'} estado
 */

/**
 * Forma de cada elemento devuelto por el backend real en
 * GET /api/viajes/tipo-servicio (ver `buscarViajesPorTipoServicio` en
 * `servicios/viajesServicio.js`). A diferencia de `ResultadoViaje`, esto
 * no es un mock: proviene de la base de datos.
 * @typedef {Object} ViajePorTipoServicio
 * @property {number} idViaje
 * @property {string} tipoServicio
 * @property {string} origen
 * @property {string} destino
 * @property {string} fechaSalida
 * @property {string} horaSalida
 * @property {string} estadoViaje
 * @property {string} placaBus
 * @property {string} numeroInternoBus
 */

/**
 * @typedef {Object} Pasaje
 * @property {string} codigo
 * @property {string} origen
 * @property {string} destino
 * @property {string} fecha
 * @property {string} hora
 * @property {string} empresa
 * @property {string} tipoBus
 * @property {string} asiento
 * @property {number} precio
 * @property {'confirmado'|'completado'|'cancelado'} estado
 */

/**
 * @typedef {Object} Asiento
 * @property {string} numero
 * @property {number} fila
 * @property {string} letra
 * @property {'izquierda'|'derecha'} lado
 * @property {'disponible'|'ocupado'} estado
 * @property {'estandar'|'preferencial'} tipo
 * @property {number} precioAdicional
 */

/**
 * @typedef {Object} DatosPasajero
 * @property {string} nombres
 * @property {string} apellidos
 * @property {string} dni
 * @property {string} fechaNacimiento
 * @property {string} celular
 */

export {}
