import { useEffect, useReducer, useRef, useState } from 'react'
import { ModalBase } from '../comunes/ModalBase'
import { CampoTexto } from '../comunes/CampoTexto'
import { BotonPrincipal } from '../comunes/BotonPrincipal'
import { AvisoAutenticacion } from './AvisoAutenticacion'
import { CampoCodigo } from './CampoCodigo'
import { ICONO_CANDADO, ICONO_CORREO } from './iconosAutenticacion'
import {
  completarRecuperacionContrasena,
  reenviarCodigoRecuperacion,
  solicitarCodigoRecuperacion,
  verificarCodigoRecuperacion,
} from '../../servicios/autenticacionServicio'
import {
  ESTADO_INICIAL,
  LONGITUD_CODIGO,
  PASOS,
  erroresContrasenaNueva,
  evaluarContrasenaNueva,
  ocultarCorreo,
  reducirRecuperacion,
  validarCorreoRecuperacion,
} from '../../utilidades/recuperacionContrasena'
import './autenticacion.css'
import './recuperarContrasena.css'

const TEXTOS = {
  [PASOS.METODO]: { titulo: 'Recuperar contraseña', subtitulo: 'Selecciona cómo deseas recuperar el acceso a tu cuenta.' },
  [PASOS.CORREO]: { titulo: 'Verifica tu correo electrónico', subtitulo: 'Ingresa el correo con el que creaste tu cuenta y te enviaremos un código de verificación.' },
  [PASOS.CODIGO]: { titulo: 'Introduce tu código' },
  [PASOS.NUEVA]: { titulo: 'Crear nueva contraseña', subtitulo: 'Elige una contraseña nueva para tu cuenta.' },
  [PASOS.EXITO]: { titulo: '¡Contraseña actualizada!' },
}

const ICONO_ATRAS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Evita envíos duplicados aunque el usuario pulse dos veces antes de que React pinte `cargando`. */
function useEnvioUnico() {
  const [cargando, setCargando] = useState(false)
  const enCurso = useRef(false)
  async function ejecutar(tarea) {
    if (enCurso.current) return
    enCurso.current = true
    setCargando(true)
    try {
      await tarea()
    } finally {
      enCurso.current = false
      setCargando(false)
    }
  }
  return { cargando, ejecutar }
}

function BotonAtras({ alPulsar, deshabilitado, children }) {
  return (
    <button type="button" className="recuperar__atras" onClick={alPulsar} disabled={deshabilitado}>
      {ICONO_ATRAS}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- paso 1: método

function PasoMetodo({ alElegir }) {
  return (
    <button type="button" className="recuperar__opcion" onClick={alElegir}>
      <span className="recuperar__opcion-icono" aria-hidden="true">{ICONO_CORREO}</span>
      <span>
        <span className="recuperar__opcion-titulo">Correo electrónico</span>
        {' '}
        <span className="recuperar__opcion-texto">Recibe un código de verificación en el correo asociado a tu cuenta.</span>
      </span>
    </button>
  )
}

// ---------------------------------------------------------------- paso 2: correo

function PasoCorreo({ correoInicial, aviso, alEnviado, alVolver }) {
  const [correo, setCorreo] = useState(correoInicial)
  const [errorCampo, setErrorCampo] = useState('')
  const [error, setError] = useState('')
  const { cargando, ejecutar } = useEnvioUnico()

  function enviar(evento) {
    evento.preventDefault()
    setError('')
    const mensaje = validarCorreoRecuperacion(correo)
    setErrorCampo(mensaje)
    if (mensaje) return
    ejecutar(async () => {
      try {
        const respuesta = await solicitarCodigoRecuperacion(correo)
        alEnviado(correo.trim().toLowerCase(), respuesta?.reenvioEnSegundos)
      } catch (err) {
        setError(err.message ?? 'No se pudo enviar el código.')
      }
    })
  }

  return (
    <>
      <BotonAtras alPulsar={alVolver} deshabilitado={cargando}>Volver</BotonAtras>
      <form className="recuperar__formulario" onSubmit={enviar} noValidate>
        <CampoTexto
          etiqueta="Correo electrónico"
          tipo="email"
          valor={correo}
          alCambiar={setCorreo}
          marcador="tucorreo@ejemplo.com"
          requerido
          autoComplete="email"
          icono={ICONO_CORREO}
          error={errorCampo}
          deshabilitado={cargando}
          autoEnfocar
        />
        <AvisoAutenticacion tono="error">{error}</AvisoAutenticacion>
        <AvisoAutenticacion tono="exito">{aviso}</AvisoAutenticacion>
        <div className="recuperar__acciones">
          <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
            {cargando ? 'Enviando…' : 'Enviar código'}
          </BotonPrincipal>
        </div>
      </form>
    </>
  )
}

// ---------------------------------------------------------------- paso 3: código

function PasoCodigo({ correo, reenvioInicial, alVerificado, alCambiarCorreo }) {
  const [codigo, setCodigo] = useState('')
  const [errorCampo, setErrorCampo] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [segundos, setSegundos] = useState(reenvioInicial)
  const verificacion = useEnvioUnico()
  const reenvio = useEnvioUnico()
  const ocupado = verificacion.cargando || reenvio.cargando

  useEffect(() => {
    if (segundos <= 0) return undefined
    const id = setTimeout(() => setSegundos((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [segundos])

  function verificar(evento) {
    evento.preventDefault()
    setError('')
    setInfo('')
    if (codigo.length !== LONGITUD_CODIGO) {
      setErrorCampo(`Ingresa los ${LONGITUD_CODIGO} dígitos del código.`)
      return
    }
    setErrorCampo('')
    verificacion.ejecutar(async () => {
      try {
        const respuesta = await verificarCodigoRecuperacion(correo, codigo)
        alVerificado(respuesta?.pruebaRecuperacion)
      } catch (err) {
        setError(err.message ?? 'No se pudo verificar el código.')
        setCodigo('')
      }
    })
  }

  function reenviar() {
    setError('')
    setInfo('')
    reenvio.ejecutar(async () => {
      try {
        const respuesta = await reenviarCodigoRecuperacion(correo)
        setCodigo('')
        setSegundos(respuesta?.reenvioEnSegundos ?? 60)
        setInfo('Si la cuenta existe, te enviamos un código nuevo. El anterior ya no es válido.')
      } catch (err) {
        setError(err.message ?? 'No se pudo reenviar el código.')
      }
    })
  }

  return (
    <>
      <BotonAtras alPulsar={alCambiarCorreo} deshabilitado={ocupado}>Cambiar correo</BotonAtras>
      <p className="modal-base__subtitulo" style={{ marginTop: 0, marginBottom: 'var(--espacio-4)' }}>
        Si <strong>{ocultarCorreo(correo)}</strong> corresponde a una cuenta de RutaLibre, te enviamos un código de{' '}
        {LONGITUD_CODIGO} dígitos. Revisa también la carpeta de spam.
      </p>
      <form className="recuperar__formulario" onSubmit={verificar} noValidate>
        <CampoCodigo valor={codigo} alCambiar={setCodigo} error={errorCampo} deshabilitado={ocupado} autoEnfocar />
        <AvisoAutenticacion tono="error">{error}</AvisoAutenticacion>
        <AvisoAutenticacion tono="exito">{info}</AvisoAutenticacion>
        <div className="recuperar__acciones">
          <BotonPrincipal tipo="submit" deshabilitado={ocupado} cargando={verificacion.cargando} ancho="100%">
            {verificacion.cargando ? 'Verificando…' : 'Verificar código'}
          </BotonPrincipal>
          <div className="recuperar__reenvio">
            <button type="button" className="recuperar__enlace" onClick={reenviar} disabled={ocupado || segundos > 0}>
              {reenvio.cargando ? 'Reenviando…' : 'Reenviar código'}
            </button>
            {segundos > 0 && <span aria-live="off">Podrás pedir otro en {segundos} s</span>}
          </div>
        </div>
      </form>
    </>
  )
}

// ---------------------------------------------------------------- paso 4: nueva contraseña

function PasoNueva({ prueba, alCompletar, alVerificacionPerdida }) {
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const { cargando, ejecutar } = useEnvioUnico()
  const { requisitos } = evaluarContrasenaNueva(contrasena, confirmacion)

  function enviar(evento) {
    evento.preventDefault()
    setError('')
    const nuevos = erroresContrasenaNueva(contrasena, confirmacion)
    setErrores(nuevos)
    if (Object.keys(nuevos).length > 0) return
    ejecutar(async () => {
      try {
        await completarRecuperacionContrasena(prueba, contrasena, confirmacion)
        setContrasena('')
        setConfirmacion('')
        alCompletar()
      } catch (err) {
        if (err.status === 410) {
          alVerificacionPerdida(err.message)
        } else {
          setError(err.detalles?.length ? err.detalles.join(' ') : (err.message ?? 'No se pudo cambiar la contraseña.'))
        }
      }
    })
  }

  return (
    <form className="recuperar__formulario" onSubmit={enviar} noValidate>
      <CampoTexto
        etiqueta="Nueva contraseña"
        tipo="password"
        valor={contrasena}
        alCambiar={setContrasena}
        marcador="••••••••"
        requerido
        autoComplete="new-password"
        icono={ICONO_CANDADO}
        alternarVisibilidad
        error={errores.contrasena}
        deshabilitado={cargando}
        autoEnfocar
      />
      <CampoTexto
        etiqueta="Confirmar nueva contraseña"
        tipo="password"
        valor={confirmacion}
        alCambiar={setConfirmacion}
        marcador="••••••••"
        requerido
        autoComplete="new-password"
        icono={ICONO_CANDADO}
        alternarVisibilidad
        error={errores.confirmacion}
        deshabilitado={cargando}
      />

      <ul className="recuperar__requisitos" aria-label="Requisitos de la contraseña">
        {requisitos.map((r) => (
          <li key={r.id} className={`recuperar__requisito${r.cumple ? ' recuperar__requisito--cumplido' : ''}`}>
            <span className="recuperar__requisito-marca" aria-hidden="true">{r.cumple ? '✓' : ''}</span>
            <span>{r.texto}</span>
            <span className="recuperar__solo-lectores">{r.cumple ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        ))}
      </ul>

      <AvisoAutenticacion tono="error">{error}</AvisoAutenticacion>
      <div className="recuperar__acciones">
        <BotonPrincipal tipo="submit" deshabilitado={cargando} cargando={cargando} ancho="100%">
          {cargando ? 'Guardando…' : 'Cambiar contraseña'}
        </BotonPrincipal>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------- paso 5: éxito

function PasoExito({ alVolverAIniciarSesion }) {
  return (
    <div className="formulario-autenticacion__exito">
      <span className="formulario-autenticacion__exito-icono" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M5 12.6l4.2 4.2L19 7.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="formulario-autenticacion__exito-texto" role="status">
        Tu contraseña se cambió correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
      </p>
      <BotonPrincipal onClick={alVolverAIniciarSesion} ancho="100%">
        Volver a iniciar sesión
      </BotonPrincipal>
    </div>
  )
}

// ---------------------------------------------------------------- contenedor

/**
 * Flujo de recuperación en modal (5 pasos). Un solo ModalBase a la vez: al cerrarse (o al
 * volver al inicio de sesión) el estado se reinicia y los pasos se desmontan, con lo que los
 * campos sensibles (código, contraseñas) y la prueba de verificación se descartan.
 */
export function ModalRecuperarContrasena({ abierto, alCerrar, alVolverAIniciarSesion, correoInicial = '' }) {
  const [estado, despachar] = useReducer(reducirRecuperacion, ESTADO_INICIAL)

  useEffect(() => {
    if (!abierto) despachar({ tipo: 'REINICIAR' })
  }, [abierto])

  const textos = TEXTOS[estado.paso]
  const sensible = estado.paso === PASOS.CODIGO || estado.paso === PASOS.NUEVA

  return (
    <ModalBase
      titulo={textos.titulo}
      subtitulo={textos.subtitulo}
      abierto={abierto}
      alCerrar={alCerrar}
      cerrarAlPulsarFondo={!sensible}
    >
      {estado.paso === PASOS.METODO && <PasoMetodo alElegir={() => despachar({ tipo: 'ELEGIR_METODO' })} />}
      {estado.paso === PASOS.CORREO && (
        <PasoCorreo
          correoInicial={estado.correo || correoInicial}
          aviso={estado.aviso}
          alEnviado={(correo, reenvioEn) => despachar({ tipo: 'CODIGO_ENVIADO', correo, reenvioEn })}
          alVolver={() => despachar({ tipo: 'VOLVER' })}
        />
      )}
      {estado.paso === PASOS.CODIGO && (
        <PasoCodigo
          correo={estado.correo}
          reenvioInicial={estado.reenvioEn}
          alVerificado={(prueba) => despachar({ tipo: 'CODIGO_VERIFICADO', prueba })}
          alCambiarCorreo={() => despachar({ tipo: 'VOLVER' })}
        />
      )}
      {estado.paso === PASOS.NUEVA && (
        <PasoNueva
          prueba={estado.prueba}
          alCompletar={() => despachar({ tipo: 'CONTRASENA_CAMBIADA' })}
          alVerificacionPerdida={(aviso) => despachar({ tipo: 'VERIFICACION_PERDIDA', aviso })}
        />
      )}
      {estado.paso === PASOS.EXITO && <PasoExito alVolverAIniciarSesion={() => alVolverAIniciarSesion(estado.correo)} />}
    </ModalBase>
  )
}
