import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import './paginaAyuda.css'

function IconoBuscar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.6-3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function IconoBoleto() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9.5a2 2 0 0 0 0-3.9V5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v.6a2 2 0 0 0 0 3.9v1a2 2 0 0 1 0 3.9V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-.6a2 2 0 0 1 0-3.9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 4.5v15" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2.4" />
    </svg>
  )
}

function IconoCalendario() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.8h17M8 3v3.6M16 3v3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13.4h2.2M8 16.8h2.2M12.9 13.4h2.2M12.9 16.8h2.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconoTarjeta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 14.3h4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconoPasajero() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 20c1-3.7 4-5.8 7.2-5.8s6.2 2.1 7.2 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconoCambio() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoMaleta() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="8" width="18" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 8V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 13h18" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconoMapa() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s7-6.1 7-11.4A7 7 0 0 0 5 9.6C5 14.9 12 21 12 21Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="9.6" r="2.3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function IconoTelefono() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.6 3.5h3l1.4 4.3-2.3 1.7a12.6 12.6 0 0 0 5.8 5.8l1.7-2.3 4.3 1.4v3a1.6 1.6 0 0 1-1.7 1.6A16.4 16.4 0 0 1 5 5.2a1.6 1.6 0 0 1 1.6-1.7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function IconoCorreo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoReloj() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconoTodas() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

const CATEGORIAS = [
  { id: 'compra', etiqueta: 'Compra de pasajes', Icono: IconoBoleto },
  { id: 'reservas', etiqueta: 'Reservas', Icono: IconoCalendario },
  { id: 'pagos', etiqueta: 'Pagos', Icono: IconoTarjeta },
  { id: 'pasajeros', etiqueta: 'Pasajeros', Icono: IconoPasajero },
  { id: 'cambios', etiqueta: 'Cambios y cancelaciones', Icono: IconoCambio },
  { id: 'equipaje', etiqueta: 'Equipaje', Icono: IconoMaleta },
  { id: 'destinos', etiqueta: 'Destinos', Icono: IconoMapa },
]

const PREGUNTAS_FRECUENTES = [
  {
    id: 'compra-1',
    categoria: 'compra',
    pregunta: '¿Con cuánta anticipación puedo comprar mi pasaje?',
    respuesta:
      'Puedes reservar tu pasaje hasta con 90 días de anticipación. Te recomendamos comprar con al menos 48 horas antes de tu viaje para asegurar disponibilidad y mejor precio.',
  },
  {
    id: 'compra-2',
    categoria: 'compra',
    pregunta: '¿Puedo comprar más de un pasaje en una sola compra?',
    respuesta:
      'Sí. Al elegir tus asientos puedes seleccionar hasta 6 asientos en una misma compra; cada uno genera su propio ticket con los datos del pasajero correspondiente.',
  },
  {
    id: 'reservas-1',
    categoria: 'reservas',
    pregunta: '¿Cómo elijo mi asiento al reservar?',
    respuesta:
      'Después de elegir un servicio, accederás al mapa del bus. Si el servicio tiene más de un piso podrás alternar entre ellos, y verás claramente qué asientos están disponibles, ocupados o ya seleccionados.',
  },
  {
    id: 'reservas-2',
    categoria: 'reservas',
    pregunta: '¿Puedo cambiar la fecha de mi viaje?',
    respuesta:
      'Sí. Desde la sección "Mis pasajes" de tu perfil podrás gestionar cambios de fecha según las políticas de cada empresa asociada.',
  },
  {
    id: 'pagos-1',
    categoria: 'pagos',
    pregunta: '¿Qué métodos de pago aceptan?',
    respuesta:
      'Aceptamos tarjetas de crédito y débito Visa, Mastercard y American Express. El monto se calcula automáticamente según los asientos y pasajeros que elijas.',
  },
  {
    id: 'pagos-2',
    categoria: 'pagos',
    pregunta: '¿Es seguro pagar en RutaLibre?',
    respuesta:
      'Sí, la información de pago viaja cifrada y nunca se almacena en nuestros servidores. En este portal de demostración, además, ningún cobro es real.',
  },
  {
    id: 'pasajeros-1',
    categoria: 'pasajeros',
    pregunta: '¿Cada pasajero necesita sus propios datos?',
    respuesta:
      'Sí. Cada asiento que selecciones genera una tarjeta de pasajero independiente con su propio formulario (nombres, documento y contacto), y puedes completarlas en el orden que prefieras.',
  },
  {
    id: 'pasajeros-2',
    categoria: 'pasajeros',
    pregunta: '¿Cómo presento mi ticket el día del viaje?',
    respuesta:
      'Basta con mostrar el código de tu ticket, disponible en la sección "Mis pasajes" de tu perfil, junto con tu documento de identidad.',
  },
  {
    id: 'cambios-1',
    categoria: 'cambios',
    pregunta: '¿Puedo cancelar mi compra?',
    respuesta:
      'Cada empresa asociada define su propia política de cancelación y reembolso. Puedes revisarla desde el detalle de tu pasaje en "Mis pasajes" antes de confirmar cualquier cambio.',
  },
  {
    id: 'cambios-2',
    categoria: 'cambios',
    pregunta: '¿Qué pasa si mi bus se retrasa?',
    respuesta:
      'Nuestras empresas asociadas informan cualquier variación de horario directamente a tu correo y por notificación en tu perfil.',
  },
  {
    id: 'equipaje-1',
    categoria: 'equipaje',
    pregunta: '¿Cuánto equipaje puedo llevar?',
    respuesta:
      'En general se permite una maleta de bodega de hasta 20 kg y un bolso de mano por pasajero. Los servicios Prime y Ultra suelen incluir un kilaje adicional; revisa el detalle del servicio antes de viajar.',
  },
  {
    id: 'equipaje-2',
    categoria: 'equipaje',
    pregunta: '¿Puedo llevar equipaje especial o de gran tamaño?',
    respuesta:
      'Sí, pero debe coordinarse con anticipación con la empresa del viaje, ya que puede tener un costo adicional según el peso y las dimensiones.',
  },
  {
    id: 'destinos-1',
    categoria: 'destinos',
    pregunta: '¿A qué ciudades viaja RutaLibre?',
    respuesta:
      'Contamos con más de 40 rutas activas a nivel nacional. Puedes ver el listado completo, con salidas diarias, en la sección "Destinos" del portal.',
  },
  {
    id: 'destinos-2',
    categoria: 'destinos',
    pregunta: '¿Qué tipos de servicio hay disponibles por ruta?',
    respuesta:
      'La disponibilidad de Económico, Semi Cama, Bus Cama, Prime y Ultra varía según la ruta y el horario; el buscador te mostrará solo los servicios activos para tu búsqueda.',
  },
]

const ACCESOS_RAPIDOS = [
  { etiqueta: 'Buscar un viaje', ruta: '/' },
  { etiqueta: 'Mis pasajes', ruta: '/perfil/pasajes' },
  { etiqueta: 'Ver destinos', ruta: '/destinos' },
]

export function PaginaAyuda() {
  const [termino, setTermino] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [abiertas, setAbiertas] = useState(() => new Set())

  const terminoNormalizado = termino.trim().toLowerCase()
  const hayBusqueda = terminoNormalizado.length > 0

  const preguntasFiltradas = useMemo(() => {
    if (hayBusqueda) {
      return PREGUNTAS_FRECUENTES.filter((item) =>
        `${item.pregunta} ${item.respuesta}`.toLowerCase().includes(terminoNormalizado),
      )
    }
    if (categoriaActiva !== 'todas') {
      return PREGUNTAS_FRECUENTES.filter((item) => item.categoria === categoriaActiva)
    }
    return PREGUNTAS_FRECUENTES
  }, [hayBusqueda, terminoNormalizado, categoriaActiva])

  const grupos = useMemo(() => {
    if (hayBusqueda || categoriaActiva !== 'todas') {
      return [{ id: categoriaActiva, preguntas: preguntasFiltradas }]
    }
    return CATEGORIAS.map((categoria) => ({
      ...categoria,
      preguntas: preguntasFiltradas.filter((item) => item.categoria === categoria.id),
    }))
  }, [hayBusqueda, categoriaActiva, preguntasFiltradas])

  function alternarPregunta(id) {
    setAbiertas((anterior) => {
      const copia = new Set(anterior)
      if (copia.has(id)) copia.delete(id)
      else copia.add(id)
      return copia
    })
  }

  function elegirCategoria(id) {
    setTermino('')
    setCategoriaActiva((actual) => (actual === id ? 'todas' : id))
  }

  return (
    <>
      <section className="ayuda-hero">
        <div className="contenedor ayuda-hero__contenido">
          <span className="insignia ayuda-hero__insignia">Centro de ayuda</span>
          <h1 className="ayuda-hero__titulo">¿Cómo podemos ayudarte?</h1>
          <p className="ayuda-hero__subtitulo">
            Busca entre las preguntas más frecuentes sobre compras, reservas, pagos y viajes.
          </p>

          <label className="ayuda-hero__buscador">
            <IconoBuscar />
            <input
              type="search"
              value={termino}
              onChange={(evento) => setTermino(evento.target.value)}
              placeholder="Escribe tu duda, por ejemplo: “cambiar fecha”"
              aria-label="Buscar en el centro de ayuda"
            />
          </label>

          <div className="ayuda-hero__accesos">
            {ACCESOS_RAPIDOS.map((acceso) => (
              <NavLink key={acceso.ruta} to={acceso.ruta} className="ayuda-hero__acceso">
                {acceso.etiqueta}
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion contenedor pagina-ayuda">
        {!hayBusqueda && (
          <div className="ayuda-categorias" role="group" aria-label="Filtrar preguntas por categoría">
            <button
              type="button"
              className={`ayuda-categoria ${categoriaActiva === 'todas' ? 'ayuda-categoria--activa' : ''}`}
              aria-pressed={categoriaActiva === 'todas'}
              onClick={() => setCategoriaActiva('todas')}
            >
              <span className="ayuda-categoria__icono" aria-hidden="true">
                <IconoTodas />
              </span>
              Todas
            </button>
            {CATEGORIAS.map(({ id, etiqueta, Icono }) => (
              <button
                key={id}
                type="button"
                className={`ayuda-categoria ${categoriaActiva === id ? 'ayuda-categoria--activa' : ''}`}
                aria-pressed={categoriaActiva === id}
                onClick={() => elegirCategoria(id)}
              >
                <span className="ayuda-categoria__icono" aria-hidden="true">
                  <Icono />
                </span>
                {etiqueta}
              </button>
            ))}
          </div>
        )}

        {hayBusqueda && (
          <p className="ayuda-resultado-busqueda" role="status">
            {preguntasFiltradas.length === 0
              ? `Sin resultados para “${termino}”`
              : `${preguntasFiltradas.length} resultado${preguntasFiltradas.length === 1 ? '' : 's'} para “${termino}”`}
          </p>
        )}

        {preguntasFiltradas.length === 0 ? (
          <div className="ayuda-vacio">
            <h2>No encontramos preguntas para esta búsqueda.</h2>
            <p>Prueba con otras palabras o revisa las categorías, o escríbenos directamente.</p>
          </div>
        ) : (
          <div className="ayuda-grupos">
            {grupos.map((grupo) =>
              grupo.preguntas.length === 0 ? null : (
                <div className="ayuda-grupo" key={grupo.id}>
                  {!hayBusqueda && categoriaActiva === 'todas' && (
                    <h2 className="ayuda-grupo__titulo">
                      <span className="ayuda-grupo__icono" aria-hidden="true"><grupo.Icono /></span>
                      {grupo.etiqueta}
                    </h2>
                  )}
                  <div className="pagina-ayuda__lista">
                    {grupo.preguntas.map((item) => {
                      const abierta = abiertas.has(item.id)
                      return (
                        <div key={item.id} className="pagina-ayuda__item">
                          <button
                            type="button"
                            className="pagina-ayuda__pregunta"
                            onClick={() => alternarPregunta(item.id)}
                            aria-expanded={abierta}
                          >
                            {item.pregunta}
                            <span className={`pagina-ayuda__icono ${abierta ? 'pagina-ayuda__icono--abierto' : ''}`}>+</span>
                          </button>
                          {abierta && <p className="pagina-ayuda__respuesta animar-aparicion">{item.respuesta}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <div className="pagina-ayuda__contacto">
          <h2>¿No encontraste lo que buscabas?</h2>
          <p>Nuestro equipo está disponible para ayudarte con tu compra o tu viaje.</p>
          <div className="pagina-ayuda__contacto-lista">
            <a className="pagina-ayuda__contacto-item" href="mailto:ayuda@rutalibre.pe">
              <IconoCorreo />
              ayuda@rutalibre.pe
            </a>
            <a className="pagina-ayuda__contacto-item" href="tel:+015550192">
              <IconoTelefono />
              (01) 555 0192
            </a>
            <span className="pagina-ayuda__contacto-item pagina-ayuda__contacto-item--estatico">
              <IconoReloj />
              Disponible las 24 horas
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
