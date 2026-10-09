import { useRef, useState } from 'react'
import { CampoTexto } from '../comunes/CampoTexto'
import './formularioPasajero.css'
import { consultarDni } from '../../servicios/dniServicio'
import {
  AVISO_MENORES,
  DATOS_PASAJERO_VACIOS,
  esMenorDeEdad,
  pasajeroEstaCompleto,
  validarPasajero,
} from '../../utilidades/validarPasajero'

// Se reexportan para no romper imports existentes (p. ej. PaginaReserva.jsx).
export { DATOS_PASAJERO_VACIOS, validarPasajero, pasajeroEstaCompleto }

const AVISO_BD = 'Pasajero registrado: sus nombres y apellidos no se pueden modificar. Solo puedes actualizar el celular.'
const AVISO_NO_ENCONTRADO = 'No encontramos este DNI. Completa los datos manualmente.'
const AVISO_ERROR_CONSULTA = 'No se pudo consultar el DNI. Completa los datos manualmente.'

/**
 * Formulario de pasajero totalmente controlado: no guarda estado propio de
 * los valores (vive en el componente padre, uno por asiento seleccionado),
 * así los datos nunca se pierden al cambiar entre tickets. Solo administra
 * qué campos ya fueron "tocados" para no mostrar errores antes de tiempo.
 * La validación real (para marcar el ticket como completo) ocurre siempre,
 * independientemente de si el campo fue tocado o no.
 *
 * Al completar el DNI se consulta al backend (primero la base de datos y, si no existe, ApiPeru):
 *  · pasajero registrado -> nombres, apellidos, fecha y celular de la BD; nombres y apellidos (y la
 *    fecha, si la BD la tiene) quedan bloqueados y solo se edita el celular;
 *  · pasajero nuevo -> se autocompletan nombres y apellidos y el resto se escribe a mano.
 * Consultar NO guarda nada: los datos solo se persisten cuando el pago simulado resulta aprobado.
 * `erroresExternos` son errores que no salen de este formulario (servidor o DNI repetido).
 */
export function FormularioPasajero({ valores, alCambiarCampo, erroresExternos }) {
  const [camposTocados, setCamposTocados] = useState({})
  const [consultandoDni, setConsultandoDni] = useState(false)
  const [avisoDni, setAvisoDni] = useState(null)
  // DNI de la consulta más reciente: una respuesta vieja no debe pisar un DNI más nuevo.
  const dniVigenteRef = useRef('')
  const datos = valores ?? DATOS_PASAJERO_VACIOS
  const errores = validarPasajero(datos)
  const externos = erroresExternos ?? {}
  const bloqueadoPorBd = datos.origenDni === 'BD'
  const fechaBloqueada = bloqueadoPorBd && Boolean(datos.fechaBloqueada)

  // Error local (solo si el campo fue tocado) o error externo (servidor o DNI repetido).
  function mensajeCampo(campo) {
    return (camposTocados[campo] ? errores[campo] : undefined) ?? externos[campo]
  }

  function marcarTocado(campo) {
    setCamposTocados((anterior) => ({ ...anterior, [campo]: true }))
  }

  function aplicarDatos(campos) {
    Object.entries(campos).forEach(([campo, valor]) => alCambiarCampo(campo, valor))
  }

  async function buscarDni(dni) {
    setConsultandoDni(true)
    try {
      const respuesta = await consultarDni(dni)
      if (dniVigenteRef.current !== dni) return
      if (respuesta.existente) {
        const celular = (respuesta.nroTelefono ?? '').replace(/\D/g, '').slice(-9)
        aplicarDatos({
          nombres: respuesta.nombres ?? '',
          apellidos: respuesta.apellidos ?? '',
          fechaNacimiento: respuesta.fechaNacimiento ?? '',
          fechaBloqueada: Boolean(respuesta.fechaNacimiento),
          celular: /^9\d{8}$/.test(celular) ? celular : '',
          origenDni: 'BD',
        })
        setAvisoDni(AVISO_BD)
      } else if (respuesta.origen === 'APIPERU') {
        aplicarDatos({ nombres: respuesta.nombres ?? '', apellidos: respuesta.apellidos ?? '', origenDni: 'APIPERU' })
        setAvisoDni(null)
      } else {
        alCambiarCampo('origenDni', 'MANUAL')
        setAvisoDni(AVISO_NO_ENCONTRADO)
      }
    } catch {
      if (dniVigenteRef.current !== dni) return
      alCambiarCampo('origenDni', 'MANUAL')
      setAvisoDni(AVISO_ERROR_CONSULTA)
    } finally {
      if (dniVigenteRef.current === dni) setConsultandoDni(false)
    }
  }

  function manejarDni(valor) {
    const dni = valor.replace(/\D/g, '').slice(0, 8)
    if (dni === datos.dni) return
    dniVigenteRef.current = dni
    setConsultandoDni(false)
    setAvisoDni(null)

    // Si el DNI cambia, los datos que vinieron de una consulta ya no corresponden a esta persona.
    if (datos.origenDni === 'BD' || datos.origenDni === 'APIPERU') {
      aplicarDatos({
        nombres: '',
        apellidos: '',
        ...(datos.origenDni === 'BD' ? { fechaNacimiento: '', celular: '', fechaBloqueada: false } : {}),
        origenDni: '',
      })
    }
    alCambiarCampo('dni', dni)
    if (dni.length === 8) buscarDni(dni)
  }

  return (
    <form className="formulario-pasajero" onSubmit={(evento) => evento.preventDefault()} noValidate>
      {externos.asiento && (
        <p className="formulario-pasajero__error-asiento" role="alert">
          {externos.asiento}
        </p>
      )}

      <div className="formulario-pasajero__fila">
        <div onBlur={() => marcarTocado('nombres')}>
          <CampoTexto
            etiqueta="Nombres"
            valor={datos.nombres}
            alCambiar={(valor) => alCambiarCampo('nombres', valor)}
            marcador="Ej. María Fernanda"
            requerido
            deshabilitado={bloqueadoPorBd}
            error={mensajeCampo('nombres')}
            autoComplete="given-name"
          />
        </div>
        <div onBlur={() => marcarTocado('apellidos')}>
          <CampoTexto
            etiqueta="Apellidos"
            valor={datos.apellidos}
            alCambiar={(valor) => alCambiarCampo('apellidos', valor)}
            marcador="Ej. Torres Quispe"
            requerido
            deshabilitado={bloqueadoPorBd}
            error={mensajeCampo('apellidos')}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="formulario-pasajero__fila">
        <div onBlur={() => marcarTocado('dni')}>
          <CampoTexto
            etiqueta="DNI"
            valor={datos.dni}
            alCambiar={manejarDni}
            marcador="8 dígitos"
            requerido
            modoEntrada="numeric"
            error={mensajeCampo('dni')}
            ayuda={consultandoDni ? 'Buscando datos del DNI…' : undefined}
            autoComplete="off"
          />
        </div>
        <div onBlur={() => marcarTocado('fechaNacimiento')}>
          <CampoTexto
            etiqueta="Fecha de nacimiento"
            tipo="date"
            valor={datos.fechaNacimiento}
            alCambiar={(valor) => alCambiarCampo('fechaNacimiento', valor)}
            requerido
            deshabilitado={fechaBloqueada}
            error={mensajeCampo('fechaNacimiento')}
          />
        </div>
      </div>

      {avisoDni && (
        <p className="formulario-pasajero__aviso" role="status">
          {avisoDni}
        </p>
      )}

      {esMenorDeEdad(datos.fechaNacimiento) && (
        <p className="formulario-pasajero__aviso" role="status">
          {AVISO_MENORES.join(' ')}
        </p>
      )}

      <div onBlur={() => marcarTocado('celular')}>
        <CampoTexto
          etiqueta="Celular"
          tipo="tel"
          valor={datos.celular}
          alCambiar={(valor) => alCambiarCampo('celular', valor.replace(/\D/g, '').slice(0, 9))}
          marcador="9XXXXXXXX"
          requerido
          error={mensajeCampo('celular')}
          autoComplete="tel-national"
        />
      </div>
    </form>
  )
}
