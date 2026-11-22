import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { BotonSecundario } from '../comunes/BotonSecundario'
import { CampoTexto } from '../comunes/CampoTexto'
import { LogoMarca } from '../comunes/LogoMarca'
import { ICONO_CANDADO, ICONO_CORREO, ICONO_TELEFONO } from '../autenticacion/iconosAutenticacion'
import { Contador } from '../reserva/Contador'
import { IndicadorProgreso } from '../reserva/IndicadorProgreso'
import { MapaAsientosBus } from '../reserva/MapaAsientosBus'
import { ResumenReserva } from '../reserva/ResumenReserva'
import { SelectorPiso } from '../reserva/SelectorPiso'
import { TicketPasajero } from '../reserva/TicketPasajero'
import { FiltrosResultados } from '../viajes/FiltrosResultados'
import { TarjetaResultadoViaje } from '../viajes/TarjetaResultadoViaje'
import { TarjetaPasaje } from '../perfil/TarjetaPasaje'
import { TarjetaTicket } from '../perfil/TarjetaTicket'
import { EstadoDisponibilidad } from '../comunes/EstadoDisponibilidad'
import { CONTACTO } from '../../datos/contacto'
import { ESTADOS_RESERVA } from '../../utilidades/estadoReserva'
import { formatearFechaCorta, formatearFechaLarga, formatearPrecio, iniciales } from '../../utilidades/formato'
import { estadoVisible, filtrarHistorial, FILTROS_HISTORIAL, textoAsientos, textoServicios, viajesActuales } from '../../utilidades/pasajesVista'
import {
  asientosDemo,
  CIUDADES_DEMO,
  COMPRA_CANCELADA_DEMO,
  COMPRA_DEMO,
  COMPRA_REALIZADA_DEMO,
  FECHA_VIAJE,
  RESULTADOS_DEMO,
  SERVICIOS_DEMO,
  USUARIO_DEMO,
} from './datosDemo'
import '../autenticacion/autenticacion.css'
import '../autenticacion/avisoAutenticacion.css'
import '../autenticacion/recuperarContrasena.css'
import '../comunes/modalBase.css'
import '../navegacion/barraNavegacion.css'
import '../navegacion/pieDePagina.css'
import '../perfil/tarjetaPerfil.css'
import '../perfil/tarjetaTicket.css'
import '../postergacion/postergacion.css'
import '../reserva/formularioPasajero.css'
import '../reserva/gestorPasajeros.css'
import '../reserva/pasarelaPago.css'
import '../viajes/buscadorViajes.css'
import '../viajes/selectorFecha.css'
import '../viajes/selectorUbicacion.css'
import '../../layouts/layoutPerfil.css'
import '../../paginas/perfil/paginaHistorial.css'
import '../../paginas/perfil/paginaMisPasajes.css'
import '../../paginas/perfil/paginaPerfil.css'
import '../../paginas/reserva/paginaReserva.css'
import '../../paginas/resultados/paginaResultados.css'

const sinAccion = () => {}
const campo = (e, nombre, previo = '') => e.campos?.[nombre] ?? previo
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function textoFecha() {
  return new Date(`T00:00:00`).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function Campo({ nombre, e, previo, ...resto }) {
  return (
    <div data-demo={`campo-${nombre}`}>
      <CampoTexto valor={campo(e, nombre, previo)} alCambiar={sinAccion} {...resto} />
    </div>
  )
}

function Ubicacion({ etiqueta, nombre, valor, abierto }) {
  return (
    <div className="selector-ubicacion">
      <span className="selector-ubicacion__etiqueta">{etiqueta}</span>
      <button type="button" data-demo={nombre} className="selector-ubicacion__control" tabIndex={-1}>
        <svg className="selector-ubicacion__icono" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="9.5" r="2.3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        <span className="selector-ubicacion__texto">{valor || 'Selecciona una ciudad'}</span>
      </button>
      {abierto && (
        <ul className="selector-ubicacion__lista" data-demo={`lista-${nombre}`}>
          {CIUDADES_DEMO.filter((ciudad) => (nombre === 'destino' ? ciudad !== 'Lima' : true)).map((ciudad) => (
            <li key={ciudad}>
              <button type="button" tabIndex={-1} className={`selector-ubicacion__opcion ${ciudad === valor ? 'selector-ubicacion__opcion--activa' : ''}`}>
                {ciudad}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Calendario() {
  const elegida = new Date(`${FECHA_VIAJE}T00:00:00`)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const primero = new Date(elegida.getFullYear(), elegida.getMonth(), 1)
  const total = new Date(elegida.getFullYear(), elegida.getMonth() + 1, 0).getDate()
  const celdas = [...Array((primero.getDay() + 6) % 7).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  return (
    <div className="selector-fecha__capa">
      <div className="selector-fecha__calendario">
        <div className="selector-fecha__cabecera">
          <span className="selector-fecha__nav">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="selector-fecha__titulo">
            <span className="selector-fecha__mes">{MESES[elegida.getMonth()]}</span>
            <span className="selector-fecha__anio">{elegida.getFullYear()}</span>
          </p>
          <span className="selector-fecha__nav">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="m6 3 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
        <div className="selector-fecha__cuerpo">
          <div className="selector-fecha__semana">
            {DIAS_SEMANA.map((dia) => (
              <span key={dia}>{dia}</span>
            ))}
          </div>
          <div className="selector-fecha__dias">
            {celdas.map((dia, indice) => {
              if (!dia) return <span key={`v${indice}`} className="selector-fecha__vacio" />
              const fecha = new Date(elegida.getFullYear(), elegida.getMonth(), dia)
              const pasado = fecha < hoy
              const seleccionado = dia === elegida.getDate()
              const esHoy = fecha.getTime() === hoy.getTime()
              return (
                <span
                  key={dia}
                  data-demo={seleccionado ? 'calendario' : undefined}
                  className={['selector-fecha__dia', seleccionado && 'selector-fecha__dia--seleccionado', esHoy && 'selector-fecha__dia--hoy', pasado && 'selector-fecha__dia--no-disponible']
                    .filter(Boolean)
                    .join(' ')}
                >
                  {dia}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function FormularioBuscador({ e }) {
  return (
    <form className="buscador-viajes" onSubmit={(evento) => evento.preventDefault()}>
      <div className="buscador-viajes__campos">
        <Ubicacion etiqueta="Origen" nombre="origen" valor={e.origen} abierto={e.abierto === 'origen'} />
        <button type="button" data-demo="intercambiar" className="buscador-viajes__intercambiar" tabIndex={-1} aria-label="Intercambiar origen y destino">
          <svg className="buscador-viajes__intercambiar-icono" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 4 3.5 7.5 7 11M3.5 7.5H18M17 13l3.5 3.5L17 20M20.5 16.5H6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Ubicacion etiqueta="Destino" nombre="destino" valor={e.destino} abierto={e.abierto === 'destino'} />
        <div className="buscador-viajes__separador" />
        <div className="selector-fecha">
          <span className="selector-fecha__etiqueta">Fecha</span>
          <button type="button" data-demo="fecha" className="selector-fecha__control" tabIndex={-1}>
            <svg className="selector-fecha__icono" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="4" y="5.5" width="16" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
              <path d="M4 9.5h16M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span className="selector-fecha__texto">{e.fecha ? textoFecha() : 'Selecciona una fecha'}</span>
            <svg className="selector-fecha__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {e.abierto === 'fecha' && <Calendario />}
        </div>
      </div>
      <div data-demo="boton-buscar">
        <BotonPrincipal tipo="button" ancho="100%">
          Buscar pasajes
        </BotonPrincipal>
      </div>
    </form>
  )
}

function Buscador({ e }) {
  return (
    <div className="demo-buscador">
      <FormularioBuscador e={e} />
    </div>
  )
}

function Navegacion({ e }) {
  const activo = e.activo ?? 'inicio'
  const enlace = (id, etiqueta) => (
    <span data-demo={`enlace-${id}`} className={`barra-navegacion__enlace ${activo === id ? 'barra-navegacion__enlace--activo' : ''}`}>
      {etiqueta}
    </span>
  )
  return (
    <div className="demo-navegacion">
      <header className="barra-navegacion barra-navegacion--con-fondo">
        <div className="contenedor barra-navegacion__interior">
          <span data-demo="marca" className="barra-navegacion__marca">
            <LogoMarca alto={44} className="barra-navegacion__logo" />
            <span className="barra-navegacion__nombre">RutaLibre</span>
          </span>
          <nav className="barra-navegacion__enlaces">
            {enlace('inicio', 'Inicio')}
            {enlace('destinos', 'Destinos')}
            {enlace('servicios', 'Servicios')}
            <span data-demo="enlace-ayuda" className="barra-navegacion__enlace barra-navegacion__enlace--boton">
              Ayuda
            </span>
          </nav>
          <div className="barra-navegacion__acciones">
            {e.sesion ? (
              <div className="barra-navegacion__perfil">
                <span data-demo="perfil" className="barra-navegacion__boton-perfil">
                  <span className="barra-navegacion__avatar">{iniciales(USUARIO_DEMO.nombres, USUARIO_DEMO.apellidos)}</span>
                  <span className="barra-navegacion__nombre-perfil">Mi perfil</span>
                  <svg className="barra-navegacion__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="m3.5 5.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {e.menuPerfil && (
                  <div className="barra-navegacion__menu-perfil" data-demo="menu-perfil">
                    <p className="barra-navegacion__menu-nombre">
                      {USUARIO_DEMO.nombres} {USUARIO_DEMO.apellidos}
                    </p>
                    <p className="barra-navegacion__menu-correo">{USUARIO_DEMO.correo}</p>
                    <hr className="barra-navegacion__menu-separador" />
                    <div className="barra-navegacion__menu-item">Mi perfil</div>
                    <div data-demo="menu-pasajes" className="barra-navegacion__menu-item">
                      Mis pasajes
                    </div>
                    <div data-demo="menu-historial" className="barra-navegacion__menu-item">
                      Historial de viajes
                    </div>
                    <div data-demo="menu-salir" className="barra-navegacion__menu-item barra-navegacion__menu-item--salir">
                      Cerrar sesión
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span data-demo="ingresar" className="barra-navegacion__boton-ingreso">
                Iniciar sesión
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="demo-navegacion__cuerpo">
        {activo === 'inicio' ? <FormularioBuscador e={{}} /> : <h1 className="demo-navegacion__titulo">{activo === 'destinos' ? 'Destinos' : 'Servicios'}</h1>}
      </div>
    </div>
  )
}

function Modal({ titulo, subtitulo, children }) {
  return (
    <div className="demo-auth">
      <div className="modal-base__fondo">
        <div className="modal-base__panel">
          <span className="modal-base__cerrar">×</span>
          <div className="modal-base__encabezado">
            <h2 className="modal-base__titulo">{titulo}</h2>
            {subtitulo && <p className="modal-base__subtitulo">{subtitulo}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function Auth({ e }) {
  const modo = e.modo ?? 'login'
  if (modo === 'registro') {
    return (
      <Modal titulo="Crear cuenta" subtitulo="Regístrate para comprar pasajes y guardar tus tickets.">
        <div className="formulario-autenticacion">
          <div className="formulario-autenticacion__fila">
            <Campo nombre="nombres" e={e} etiqueta="Nombres" requerido />
            <Campo nombre="apellidos" e={e} etiqueta="Apellidos" requerido />
          </div>
          <Campo nombre="correo" e={e} etiqueta="Correo electrónico" tipo="email" marcador="tucorreo@ejemplo.com" icono={ICONO_CORREO} requerido />
          <Campo nombre="telefono" e={e} etiqueta="Teléfono (opcional)" tipo="tel" icono={ICONO_TELEFONO} />
          <div className="formulario-autenticacion__fila">
            <Campo nombre="contrasena" e={e} etiqueta="Contraseña" tipo="password" icono={ICONO_CANDADO} requerido />
            <Campo nombre="contrasena2" e={e} etiqueta="Confirmar contraseña" tipo="password" icono={ICONO_CANDADO} requerido />
          </div>
          <div className="formulario-autenticacion__acciones" data-demo="boton-registro">
            <BotonPrincipal tipo="button" ancho="100%">
              Crear cuenta
            </BotonPrincipal>
          </div>
        </div>
      </Modal>
    )
  }
  if (modo === 'metodo') {
    return (
      <Modal titulo="Recuperar contraseña" subtitulo="Selecciona cómo deseas recuperar el acceso a tu cuenta.">
        <span className="recuperar__opcion" data-demo="opcion-correo">
          <span className="recuperar__opcion-icono">{ICONO_CORREO}</span>
          <span className="recuperar__opcion-titulo">Correo electrónico</span>
          <span className="recuperar__opcion-texto">Recibe un código de verificación en el correo asociado a tu cuenta.</span>
        </span>
      </Modal>
    )
  }
  if (modo === 'correo') {
    return (
      <Modal titulo="Verifica tu correo electrónico" subtitulo="Ingresa el correo con el que creaste tu cuenta y te enviaremos un código de verificación.">
        <div className="recuperar__formulario">
          <Campo nombre="correo" e={e} etiqueta="Correo electrónico" tipo="email" marcador="tucorreo@ejemplo.com" icono={ICONO_CORREO} />
          <div className="recuperar__acciones" data-demo="boton-enviar-codigo">
            <BotonPrincipal tipo="button" ancho="100%">
              Enviar código
            </BotonPrincipal>
          </div>
        </div>
      </Modal>
    )
  }
  return (
    <Modal titulo="Iniciar sesión" subtitulo="Ingresa a tu cuenta para ver tus pasajes y tickets.">
      <div className="formulario-autenticacion">
        <Campo nombre="correo" e={e} etiqueta="Correo electrónico" tipo="email" marcador="tucorreo@ejemplo.com" icono={ICONO_CORREO} requerido />
        <Campo
          nombre="contrasena"
          e={e}
          etiqueta="Contraseña"
          tipo="password"
          marcador=""
          icono={ICONO_CANDADO}
          alternarVisibilidad
          requerido
          accion={
            <span data-demo="olvido" className="formulario-autenticacion__enlace">
              ¿Olvidaste tu contraseña?
            </span>
          }
        />
        <div className="formulario-autenticacion__acciones" data-demo="boton-ingresar">
          <BotonPrincipal tipo="button" ancho="100%">
            Iniciar sesión
          </BotonPrincipal>
        </div>
      </div>
      <p className="formulario-autenticacion__pie">
        ¿No tienes una cuenta?{' '}
        <span data-demo="crear-cuenta-enlace" className="formulario-autenticacion__enlace">
          Crear cuenta
        </span>
      </p>
    </Modal>
  )
}

function Resultados({ e }) {
  const horario = e.horario ?? 'cualquiera'
  const servicios = e.servicios ?? []
  const lista = RESULTADOS_DEMO.filter(
    (r) => (horario === 'cualquiera' || r.franja === horario) && (servicios.length === 0 || servicios.includes(r.tipoBus)),
  )
  const masBarato = lista.length ? lista.reduce((menor, r) => (r.precio < menor.precio ? r : menor)).id : null
  const filtrado = horario !== 'cualquiera' || servicios.length > 0
  return (
    <section className="pagina-resultados demo-resultados">
      <div className="pagina-resultados__cuerpo">
        <div className="pagina-resultados__resumen" data-demo="cabecera">
          <span className="pagina-resultados__sobrelinea">Resultados de búsqueda</span>
          <div className="pagina-resultados__resumen-fila">
            <h1>
              Lima <span aria-hidden="true">→</span> Trujillo
            </h1>
            <span className="pagina-resultados__fecha">{formatearFechaLarga(FECHA_VIAJE)}</span>
          </div>
          <p className="pagina-resultados__conteo" data-demo="conteo">
            {lista.length} {lista.length === 1 ? 'viaje encontrado' : 'viajes encontrados'}
            {filtrado ? ' con estos filtros' : ''}
          </p>
        </div>
        <div className="pagina-resultados__grilla">
          <FiltrosResultados
            horario={horario}
            alCambiarHorario={sinAccion}
            serviciosDisponibles={SERVICIOS_DEMO}
            serviciosSeleccionados={new Set(servicios)}
            alAlternarServicio={sinAccion}
            hayFiltrosActivos={filtrado}
            alLimpiarFiltros={sinAccion}
          />
          <div className="resultados-busqueda__lista">
            {lista.map((resultado) => (
              <TarjetaResultadoViaje
                key={resultado.id}
                resultado={resultado}
                esMasEconomico={resultado.id === masBarato}
                alSeleccionar={sinAccion}
                estadoReserva={ESTADOS_RESERVA.DISPONIBLE}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MapaDemo({ piso, sel }) {
  return (
    <MapaAsientosBus asientos={asientosDemo(piso, sel)} filas={4} limiteAlcanzado={false} onSeleccionar={sinAccion} />
  )
}

function Asientos({ e }) {
  const piso = e.piso ?? 1
  const sel = e.sel ?? []
  const elegidos = asientosDemo(piso, sel).filter((asiento) => asiento.esMio)
  const cantidad = elegidos.length
  return (
    <div className="demo-reserva">
      <IndicadorProgreso pasoActual="asiento" />
      <div className="demo-reserva__cuerpo">
        <div className="demo-reserva__principal">
          <Contador expiraEn={Date.now() + 9 * 60 * 1000} />
          <SelectorPiso pisos={2} pisoActivo={piso} alCambiarPiso={sinAccion} mapaPorPiso={{ 1: {}, 2: {} }} />
          <MapaDemo piso={piso} sel={sel} />
        </div>
        <ResumenReserva
          resultado={RESULTADOS_DEMO[0]}
          fecha={FECHA_VIAJE}
          asientosSeleccionados={elegidos}
          mostrarPiso
          filasDetalle={
            cantidad > 0
              ? [
                  { etiqueta: 'Asientos seleccionados', valor: `${cantidad}` },
                  { etiqueta: 'Precio total', valor: formatearPrecio(45 * cantidad) },
                ]
              : [
                  { etiqueta: 'Servicio', valor: RESULTADOS_DEMO[0].tipoBus },
                  { etiqueta: 'Precio base', valor: formatearPrecio(RESULTADOS_DEMO[0].precio) },
                ]
          }
          textoBoton={cantidad > 0 ? 'Continuar con 1 pasajero ' : 'Selecciona un asiento'}
          onContinuar={sinAccion}
          deshabilitado={cantidad === 0}
        />
      </div>
    </div>
  )
}

function Pasajeros({ e }) {
  const listo = ['nombres', 'apellidos', 'dni', 'celular'].every((nombre) => campo(e, nombre))
  const nombre = `${campo(e, 'nombres')} ${campo(e, 'apellidos')}`.trim()
  return (
    <div className="demo-reserva">
      <IndicadorProgreso pasoActual="pasajero" />
      <div className="demo-reserva__cuerpo">
        <div className="demo-reserva__principal">
          <div data-demo="ticket">
            <TicketPasajero asiento={{ numero: 7, piso: 1 }} mostrarPiso={false} completo={listo} nombrePreview={nombre} activo onSeleccionar={sinAccion} onEliminar={sinAccion} />
          </div>
          <div className="formulario-pasajero">
            <div className="formulario-pasajero__fila">
              <Campo nombre="nombres" e={e} etiqueta="Nombres" marcador="Ej. María Fernanda" requerido />
              <Campo nombre="apellidos" e={e} etiqueta="Apellidos" marcador="Ej. Torres Quispe" requerido />
            </div>
            <div className="formulario-pasajero__fila">
              <Campo nombre="dni" e={e} etiqueta="DNI" marcador="8 dígitos" requerido />
              <Campo nombre="nacimiento" e={e} etiqueta="Fecha de nacimiento" requerido />
            </div>
            <Campo nombre="celular" e={e} etiqueta="Celular" tipo="tel" marcador="9XXXXXXXX" requerido />
          </div>
        </div>
        <div>
          <ResumenReserva
            resultado={RESULTADOS_DEMO[0]}
            fecha={FECHA_VIAJE}
            asientosSeleccionados={[{ numero: 7, piso: 1 }]}
            filasDetalle={[
              { etiqueta: 'Asiento activo', valor: 7 },
              { etiqueta: 'Servicio', valor: RESULTADOS_DEMO[0].tipoBus },
            ]}
            textoBoton={listo ? 'Continuar al pago ' : 'Completa los datos de todos los pasajeros'}
            onContinuar={sinAccion}
            deshabilitado={!listo}
          />
        </div>
      </div>
    </div>
  )
}

function Pago({ e }) {
  return (
    <div className="demo-reserva">
      <IndicadorProgreso pasoActual="pago" />
      <div className="demo-reserva__cuerpo">
        <div className="demo-reserva__principal">
          <div className="pasarela-pago">
            <div className="pasarela-pago__resumen" data-demo="pago-resumen">
              <svg width="22" height="18" viewBox="0 0 20 16" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="18" height="14" rx="2.4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M1 5.5h18" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <div>
                <p className="pasarela-pago__resumen-titulo">Paga con tarjeta o Yape</p>
                <p className="pasarela-pago__nota">
                  Total a pagar: <strong>{formatearPrecio(45)}</strong>. Al aceptar los términos se mostrará aquí el formulario seguro de Culqi.
                </p>
              </div>
            </div>
            <div className="pasarela-pago__terminos" data-demo="terminos">
              <input type="checkbox" checked={Boolean(e.terminos)} readOnly tabIndex={-1} />
              <label>
                He leído y acepto los <a>Términos y Condiciones</a> y la <a>Política de Cambios y Devoluciones</a>.
              </label>
            </div>
            <div className="pasarela-pago__culqi" data-demo="culqi">
              {e.terminos && <div className="demo-culqi">Formulario seguro de Culqi</div>}
            </div>
            <p className="pasarela-pago__seguridad" data-demo="seguridad">
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1 12 3v3.5C12 10 9.8 12 7 13 4.2 12 2 10 2 6.5V3l5-2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
              Pago procesado por Culqi. RutaLibre no ve ni guarda los datos de tu tarjeta.
            </p>
          </div>
        </div>
        <ResumenReserva
          resultado={RESULTADOS_DEMO[0]}
          fecha={FECHA_VIAJE}
          asientosSeleccionados={[{ numero: 7, piso: 1 }]}
          filasDetalle={[
            { etiqueta: 'Servicio', valor: RESULTADOS_DEMO[0].tipoBus },
            { etiqueta: 'Medio de pago', valor: 'Tarjeta o Yape (Culqi)' },
          ]}
          precioTotal={45}
          textoBoton={`Pagar ${formatearPrecio(45)}`}
          onContinuar={sinAccion}
          deshabilitado={!e.terminos}
          mensajeAyuda="Acepta los Términos y Condiciones y la Política de Cambios y Devoluciones para habilitar el pago."
        />
      </div>
    </div>
  )
}

function Pie() {
  return (
    <footer className="pie-de-pagina demo-pie">
      <div className="contenedor pie-de-pagina__interior">
        <div className="pie-de-pagina__columna pie-de-pagina__columna--marca">
          <div className="pie-de-pagina__marca">
            <LogoMarca variante="claro" alto={38} />
            <span className="pie-de-pagina__nombre">RutaLibre</span>
          </div>
          <p className="pie-de-pagina__descripcion">Conectamos el país con viajes cómodos, puntuales y seguros, todos los días del año.</p>
        </div>
        <div className="pie-de-pagina__columna">
          <h3 className="pie-de-pagina__titulo">Empresa</h3>
          <span className="pie-de-pagina__enlace">Inicio</span>
          <span className="pie-de-pagina__enlace">Servicios</span>
          <span className="pie-de-pagina__enlace">Ayuda</span>
          <span data-demo="enlace-reclamos" className="pie-de-pagina__enlace">
            Libro de Reclamaciones
          </span>
          <span className="pie-de-pagina__enlace">Términos y Condiciones</span>
          <span className="pie-de-pagina__enlace">Cambios y Devoluciones</span>
        </div>
        <div className="pie-de-pagina__columna">
          <h3 className="pie-de-pagina__titulo">Contacto</h3>
          <p className="pie-de-pagina__texto">{CONTACTO.razonSocial}</p>
          <p className="pie-de-pagina__texto">{CONTACTO.correo}</p>
          <p className="pie-de-pagina__texto">{CONTACTO.horarioAtencion}</p>
        </div>
      </div>
    </footer>
  )
}

function PerfilMarco({ e, activa, children }) {
  const nombres = USUARIO_DEMO.nombres
  const pestana = (id, etiqueta) => (
    <span className={`layout-perfil__pestana ${activa === id ? 'layout-perfil__pestana--activa' : ''}`}>{etiqueta}</span>
  )
  return (
    <section className="contenedor layout-perfil demo-perfil">
      <section className="tarjeta-perfil" data-demo="tarjeta">
        <div className="tarjeta-perfil__avatar">{iniciales(nombres, USUARIO_DEMO.apellidos)}</div>
        <div className="tarjeta-perfil__datos">
          <h2 className="tarjeta-perfil__nombre">
            {nombres} {USUARIO_DEMO.apellidos}
          </h2>
          <dl className="tarjeta-perfil__lista">
            <div className="tarjeta-perfil__item">
              <dt>Correo</dt>
              <dd>{USUARIO_DEMO.correo}</dd>
            </div>
            <div className="tarjeta-perfil__item">
              <dt>Teléfono</dt>
              <dd>{USUARIO_DEMO.telefono}</dd>
            </div>
          </dl>
        </div>
        {!e.editando && (
          <span data-demo="editar" className="tarjeta-perfil__boton-editar">
            Editar perfil
          </span>
        )}
      </section>
      {e.editando && (
        <section className="tarjeta-perfil__panel-edicion" data-demo="panel-edicion">
          <h3 className="tarjeta-perfil__panel-titulo">Editar perfil</h3>
          <p className="tarjeta-perfil__panel-texto">
            Solo puedes actualizar tus nombres, apellidos y teléfono. El correo no se puede modificar desde aquí.
          </p>
          <div className="demo-formulario">
            <Campo nombre="nombres" e={e} previo={nombres} etiqueta="Nombres" requerido />
            <Campo nombre="apellidos" e={e} previo={USUARIO_DEMO.apellidos} etiqueta="Apellidos" requerido />
            <Campo nombre="telefono" e={e} previo={USUARIO_DEMO.telefono} etiqueta="Teléfono" tipo="tel" />
            <div className="demo-formulario__acciones">
              <BotonSecundario tipo="button">Cancelar</BotonSecundario>
              <span data-demo="guardar">
                <BotonPrincipal tipo="button">Guardar cambios</BotonPrincipal>
              </span>
            </div>
          </div>
        </section>
      )}
      <nav className="layout-perfil__pestanas">
        {pestana('resumen', 'Resumen')}
        {pestana('pasajes', 'Mis pasajes')}
        {pestana('historial', 'Historial de viajes')}
      </nav>
      <div className="layout-perfil__contenido">{children}</div>
    </section>
  )
}

function Perfil({ e }) {
  const indicadores = [
    ['Pasajes en tu cuenta', 2],
    ['Viajes completados', 1],
    ['Tickets electrónicos', 2],
  ]
  return (
    <PerfilMarco e={e} activa="resumen">
      <div className="pagina-perfil">
        <div className="pagina-perfil__estadisticas" data-demo="estadisticas">
          {indicadores.map(([etiqueta, numero]) => (
            <div key={etiqueta} className="pagina-perfil__estadistica">
              <p className="pagina-perfil__numero">{numero}</p>
              <p className="pagina-perfil__etiqueta">{etiqueta}</p>
            </div>
          ))}
        </div>
        <div className="pagina-perfil__accesos" data-demo="accesos">
          <div className="pagina-perfil__acceso">
            <span className="pagina-perfil__acceso-titulo">Mis pasajes y tickets</span>
            <span className="pagina-perfil__acceso-texto">Tienes 1 compra vigente. Consulta tus boletos y asientos.</span>
          </div>
          <div className="pagina-perfil__acceso">
            <span className="pagina-perfil__acceso-titulo">Historial de viajes</span>
            <span className="pagina-perfil__acceso-texto">Revisa los viajes que ya realizaste con nosotros.</span>
          </div>
          <div className="pagina-perfil__acceso">
            <span className="pagina-perfil__acceso-titulo">Buscar un nuevo pasaje</span>
            <span className="pagina-perfil__acceso-texto">Explora rutas y compra tu próximo viaje.</span>
          </div>
        </div>
      </div>
    </PerfilMarco>
  )
}

function Pasajes({ e }) {
  return (
    <PerfilMarco e={e} activa="pasajes">
      <section className="pagina-mis-pasajes">
        <section className="pagina-mis-pasajes__seccion" data-demo="seccion-proximos">
          <h2 className="pagina-mis-pasajes__subtitulo">Próximos viajes</h2>
          <div className="pagina-mis-pasajes__lista" data-demo="tarjeta-pasaje">
            <TarjetaPasaje compra={COMPRA_DEMO} />
          </div>
        </section>
        <section className="pagina-mis-pasajes__seccion">
          <h2 className="pagina-mis-pasajes__subtitulo">Compras anteriores</h2>
          <div className="pagina-mis-pasajes__lista">
            <TarjetaPasaje compra={COMPRA_REALIZADA_DEMO} />
          </div>
        </section>
      </section>
    </PerfilMarco>
  )
}

function Detalle() {
  return (
    <PerfilMarco e={{}} activa="pasajes">
      <section className="pagina-mis-pasajes">
        <div className="pagina-mis-pasajes__detalle">
          <span className="pagina-mis-pasajes__volver">← Volver a mis pasajes</span>
          <TarjetaTicket
            compra={COMPRA_DEMO}
            onDescargar={sinAccion}
            descargando={false}
            errorPdf={null}
            accionBoleto={() => (
              <span data-demo="cambiar-viaje" className="pagina-mis-pasajes__postergar">
                Cambiar viaje
              </span>
            )}
          />
        </div>
      </section>
    </PerfilMarco>
  )
}

function Historial({ e }) {
  const filtro = e.filtro ?? 'todos'
  const filas = filtrarHistorial([COMPRA_DEMO, COMPRA_REALIZADA_DEMO, COMPRA_CANCELADA_DEMO], filtro)
  return (
    <PerfilMarco e={e} activa="historial">
      <section className="pagina-historial">
        <div className="pagina-historial__filtros" data-demo="filtros-historial" role="group">
          {FILTROS_HISTORIAL.map(({ id, etiqueta }) => (
            <span key={id} className={`pagina-historial__filtro${filtro === id ? ' pagina-historial__filtro--activo' : ''}`}>
              {etiqueta}
            </span>
          ))}
        </div>
        <ul className="pagina-historial__lista">
          {filas.map((compra, indice) => {
            const viajes = viajesActuales(compra)
            const primero = viajes[0]
            const estado = estadoVisible(compra)
            return (
              <li key={compra.idVenta} className="pagina-historial__fila" data-demo={indice === 0 ? 'fila-historial' : undefined}>
                <span className="pagina-historial__dia">
                  {formatearFechaCorta(primero.fechaSalida)}
                  <small>{primero.horaSalida}</small>
                </span>
                <span className="pagina-historial__ruta">
                  <span className="pagina-historial__ciudad">{primero.origen}</span>
                  <span className="pagina-historial__flecha" aria-hidden="true">
                    →
                  </span>
                  <span className="pagina-historial__ciudad">{primero.destino}</span>
                </span>
                <span className="pagina-historial__servicio">
                  {textoServicios(viajes)}
                  <small>Asientos: {textoAsientos(compra)}</small>
                </span>
                <span className="pagina-historial__precio">{formatearPrecio(compra.totalPagado ?? compra.total, compra.moneda)}</span>
                <EstadoDisponibilidad estado={estado.clave} etiqueta={estado.etiqueta} />
                <span data-demo={indice === 0 ? 'ver-detalle-historial' : undefined} className="pagina-historial__detalle">
                  Ver detalle
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </PerfilMarco>
  )
}

const TITULOS_CAMBIO = {
  viaje: '¿A dónde y cuándo quieres viajar?',
  asiento: 'Elige tu nuevo asiento',
  tarifa: 'Diferencia tarifaria',
  pago: 'Paga la diferencia',
  resultado: 'Este sería tu nuevo viaje',
}

function Cambio({ e }) {
  const paso = e.paso ?? 'viaje'
  return (
    <div className="demo-cambio">
      <h2 className="postergacion-paso__titulo" data-demo="cambio-titulo">
        {TITULOS_CAMBIO[paso]}
      </h2>
      {paso === 'viaje' && <FormularioBuscador e={{ origen: 'Lima', destino: 'Trujillo', fecha: true }} />}
      {paso === 'asiento' && <MapaDemo piso={1} sel={['3-derecha']} />}
      {['tarifa', 'pago', 'resultado'].includes(paso) && (
        <ResumenReserva
          resultado={RESULTADOS_DEMO[1]}
          fecha={FECHA_VIAJE}
          asientosSeleccionados={[{ numero: 12, piso: 1 }]}
          filasDetalle={[]}
          textoBoton=""
          mostrarBoton={false}
        />
      )}
      <div className="demo-cambio__acciones">
        <BotonSecundario>Cancelar cambio</BotonSecundario>
      </div>
    </div>
  )
}

export const PANTALLAS = {
  navegacion: Navegacion,
  auth: Auth,
  buscador: Buscador,
  resultados: Resultados,
  asientos: Asientos,
  pasajeros: Pasajeros,
  pago: Pago,
  pie: Pie,
  perfil: Perfil,
  pasajes: Pasajes,
  detalle: Detalle,
  historial: Historial,
  cambio: Cambio,
}

export const SELECTORES = {
  resultados: {
    filtros: '.filtros-resultados',
    franjas: '.filtros-resultados__franjas',
    'servicios-filtro': '.filtros-resultados__grupo:last-of-type',
    limpiar: '.filtros-resultados__limpiar',
    'tarjeta-1': '.tarjeta-resultado-viaje',
    'servicios-tarjeta': '.tarjeta-resultado-viaje__servicios',
    disponibilidad: '.tarjeta-resultado-viaje__pie-principal .estado-disponibilidad',
    precio: '.tarjeta-resultado-viaje__precio-columna',
    insignia: '.tarjeta-resultado-viaje__insignia',
    'boton-1': '.tarjeta-resultado-viaje__lateral button',
  },
  asientos: {
    progreso: '.indicador-progreso',
    contador: '.contador-reserva',
    'selector-piso': '.selector-piso',
    leyenda: '.mapa-asientos__leyenda',
    resumen: '.resumen-reserva',
    continuar: '.resumen-reserva > button:last-child',
  },
  pasajeros: {
    continuar: '.resumen-reserva > button:last-child',
  },
  pasajes: {
    'ver-detalle': '.tarjeta-pasaje__ver-boleto',
  },
  detalle: {
    ticket: '.tarjeta-ticket',
    boletos: '.tarjeta-ticket__boletos',
    total: '.tarjeta-ticket__total',
    descargar: '.tarjeta-ticket__acciones',
  },
}
