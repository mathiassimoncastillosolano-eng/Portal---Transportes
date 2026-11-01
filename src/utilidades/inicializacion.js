// Lógica pura del sistema de inicialización global (sin React ni DOM) para probarla con `npm test`.
//
// Interpreta la respuesta de GET /api/health/ready, calcula la espera entre reintentos y decide qué
// mensaje y qué etapa mostrar. Los mensajes reflejan SOLO lo que se ha comprobado: nunca se afirma
// que la base de datos responde si el backend no lo ha confirmado, y no hay porcentajes de progreso.

/** Estados globales del arranque. */
export const ESTADOS_INICIO = Object.freeze({
  INITIALIZING: 'INITIALIZING', // primera comprobación en curso
  WAITING: 'WAITING', // el backend aún no está preparado: se sigue comprobando
  READY: 'READY', // readiness confirmó disponibilidad
  ERROR: 'ERROR', // se agotó la espera: se ofrece reintento manual
})

/**
 * Resultado interpretado de una comprobación.
 * CONECTANDO   no hay respuesta de Spring Boot (Render despertando, 502/504, timeout, sin red).
 * INICIANDO    Spring Boot responde, pero aún no terminó de arrancar (503 · fase INICIANDO).
 * DEPENDENCIAS Spring Boot arrancó; la base de datos todavía no confirma (503 / 200 DEGRADED).
 * LISTO        200 · status READY.
 */
export const RESULTADOS = Object.freeze({
  CONECTANDO: 'CONECTANDO',
  INICIANDO: 'INICIANDO',
  DEPENDENCIAS: 'DEPENDENCIAS',
  LISTO: 'LISTO',
})

export const TIEMPOS_INICIO = Object.freeze({
  intervaloInicial: 2500, // 2,5 s entre comprobaciones al principio
  intentosSinBackoff: 4, // tras 4 intentos empieza el backoff progresivo
  factorBackoff: 1.5,
  intervaloMaximo: 10000,
  variacion: 0.2, // ±20 % aleatorio para que muchos clientes no se sincronicen
  timeoutSolicitud: 15000, // Render puede retener la petición mientras despierta el servicio
  umbralLento: 2500, // sin respuesta tras 2,5 s: probablemente Render está despertando
  // 4 min sin READY → ERROR con reintento manual. Render Free tarda ~1 min en despertar y Spring Boot
  // con JPA puede sumar 1-2 min más en una instancia pequeña: un límite menor daría falsos errores.
  limiteEspera: 240000,
  retrasoVisible: 400, // si READY llega antes, la pantalla nunca se pinta (sin parpadeo)
  despedida: 900, // "Todo está listo" visible antes de mostrar la aplicación (solo si hubo espera)
  despedidaReducida: 250, // con prefers-reduced-motion
})

/**
 * Traduce el código HTTP y el cuerpo (JSON o null) de /api/health/ready.
 * Solo un 200 con `status: "READY"` habilita la aplicación.
 */
export function clasificarRespuesta(status, cuerpo) {
  const esJson = cuerpo !== null && typeof cuerpo === 'object'
  const estado = esJson ? cuerpo.status : undefined

  if (status === 200 && estado === 'READY') return { tipo: RESULTADOS.LISTO, status }
  if (status === 200 && estado === 'DEGRADED') return { tipo: RESULTADOS.DEPENDENCIAS, status }

  if (status === 503 && estado === 'NOT_READY') {
    const tipo = cuerpo.fase === 'DEPENDENCIAS' ? RESULTADOS.DEPENDENCIAS : RESULTADOS.INICIANDO
    return { tipo, status }
  }

  // 404 con JSON = Spring Boot respondió pero no tiene el endpoint (backend desplegado sin esta
  // versión). Se deja pasar para no bloquear la plataforma por un orden de despliegue incorrecto;
  // el 404 de la propia Render no es JSON y se trata como "conectando".
  if (status === 404 && esJson) return { tipo: RESULTADOS.LISTO, status, compatibilidad: true }

  // Otro 5xx con JSON viene de la aplicación: arrancó pero algo interno no está listo.
  if (status >= 500 && esJson && status !== 502 && status !== 504) {
    return { tipo: RESULTADOS.DEPENDENCIAS, status }
  }

  // 502/503/504 sin JSON, páginas HTML intermedias, 429, etc.: Render todavía no entrega a Spring.
  return { tipo: RESULTADOS.CONECTANDO, status }
}

/**
 * Milisegundos hasta el siguiente intento. `intento` es el número de comprobaciones ya fallidas
 * (1 tras la primera). `aleatorio` ∈ [0, 1) — se inyecta para poder probarlo.
 */
export function calcularEspera(intento, aleatorio = Math.random(), tiempos = TIEMPOS_INICIO) {
  const pasosBackoff = Math.max(0, intento - tiempos.intentosSinBackoff)
  const base = Math.min(
    tiempos.intervaloMaximo,
    tiempos.intervaloInicial * Math.pow(tiempos.factorBackoff, pasosBackoff),
  )
  const variacion = (aleatorio * 2 - 1) * tiempos.variacion
  return Math.round(base * (1 + variacion))
}

/** ¿Se agotó la espera automática? */
export function esperaAgotada(transcurrido, tiempos = TIEMPOS_INICIO) {
  return transcurrido >= tiempos.limiteEspera
}

/**
 * Etapa visual alcanzada (nodos de la ruta: Conexión · Servicios · Sistemas).
 * Devuelve cuántas etapas están confirmadas (0-3) y cuál está activa (-1 si ninguna).
 */
export function etapaDe(tipo) {
  switch (tipo) {
    case RESULTADOS.INICIANDO:
      return { completadas: 1, activa: 1 }
    case RESULTADOS.DEPENDENCIAS:
      return { completadas: 2, activa: 2 }
    case RESULTADOS.LISTO:
      return { completadas: 3, activa: -1 }
    default:
      return { completadas: 0, activa: 0 }
  }
}

const MENSAJES = Object.freeze({
  preparando: {
    titulo: 'Preparando tu próximo viaje',
    detalle: 'Estamos comprobando que todo esté en orden.',
  },
  conectando: {
    titulo: 'Estableciendo conexión con RutaLibre',
    detalle: 'Nuestro servidor se está activando. Esta primera carga puede tardar un poco más de lo habitual.',
  },
  iniciando: {
    titulo: 'Inicializando nuestros servicios',
    detalle: 'La conexión está establecida. Estamos poniendo en marcha la plataforma.',
  },
  comprobando: {
    titulo: 'Comprobando nuestros sistemas',
    detalle: 'Verificamos que la información de viajes esté disponible antes de recibirte.',
  },
  listo: {
    titulo: 'Todo está listo. ¡Buen viaje!',
    detalle: 'Bienvenido a RutaLibre.',
  },
  sinInternet: {
    titulo: 'Sin conexión a internet',
    detalle: 'Continuaremos automáticamente en cuanto vuelvas a estar en línea.',
  },
  error: {
    titulo: 'No pudimos conectar con RutaLibre',
    detalle: 'Nuestros servicios están tardando más de lo esperado. Tu sesión y tus datos se conservan.',
  },
})

/**
 * Mensaje para el estado actual.
 * @param {{ estado: string, tipo?: string|null, lento?: boolean, sinInternet?: boolean }} datos
 */
export function describirEstado({ estado, tipo = null, lento = false, sinInternet = false }) {
  if (estado === ESTADOS_INICIO.READY) return { clave: 'listo', ...MENSAJES.listo }
  if (estado === ESTADOS_INICIO.ERROR) return { clave: 'error', ...MENSAJES.error }
  if (sinInternet) return { clave: 'sinInternet', ...MENSAJES.sinInternet }

  switch (tipo) {
    case RESULTADOS.INICIANDO:
      return { clave: 'iniciando', ...MENSAJES.iniciando }
    case RESULTADOS.DEPENDENCIAS:
      return { clave: 'comprobando', ...MENSAJES.comprobando }
    case RESULTADOS.CONECTANDO:
      return { clave: 'conectando', ...MENSAJES.conectando }
    default:
      return lento ? { clave: 'conectando', ...MENSAJES.conectando } : { clave: 'preparando', ...MENSAJES.preparando }
  }
}
