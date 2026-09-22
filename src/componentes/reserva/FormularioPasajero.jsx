import { useState } from 'react'
import { CampoTexto } from '../comunes/CampoTexto'
import './formularioPasajero.css'

export const DATOS_PASAJERO_VACIOS = { nombres: '', apellidos: '', dni: '', fechaNacimiento: '', celular: '' }

/**
 * Validación real de los datos de un pasajero. Se exporta para que
 * cualquier componente (el ticket, el resumen, la página de reserva)
 * pueda calcular si un pasajero está completo sin duplicar las reglas.
 * @param {import('../../tipos').DatosPasajero} valores
 */
export function validarPasajero(valores) {
  const datos = valores ?? DATOS_PASAJERO_VACIOS
  const errores = {}

  if (!datos.nombres?.trim()) errores.nombres = 'Ingresa los nombres.'
  else if (datos.nombres.trim().length < 2) errores.nombres = 'Ingresa un nombre válido.'

  if (!datos.apellidos?.trim()) errores.apellidos = 'Ingresa los apellidos.'
  else if (datos.apellidos.trim().length < 2) errores.apellidos = 'Ingresa un apellido válido.'

  if (!datos.dni?.trim()) errores.dni = 'Ingresa el DNI.'
  else if (!/^\d{8}$/.test(datos.dni.trim())) errores.dni = 'El DNI debe tener 8 dígitos.'

  if (!datos.fechaNacimiento) errores.fechaNacimiento = 'Selecciona la fecha de nacimiento.'
  else {
    const edadMinimaFecha = new Date()
    edadMinimaFecha.setFullYear(edadMinimaFecha.getFullYear() - 16)
    if (new Date(datos.fechaNacimiento) > edadMinimaFecha) {
      errores.fechaNacimiento = 'Debe tener al menos 16 años.'
    }
  }

  if (!datos.celular?.trim()) errores.celular = 'Ingresa el celular.'
  else if (!/^9\d{8}$/.test(datos.celular.trim())) errores.celular = 'Ingresa un celular válido (9 dígitos).'

  return errores
}

export function pasajeroEstaCompleto(valores) {
  return Object.keys(validarPasajero(valores)).length === 0
}

/**
 * Formulario de pasajero totalmente controlado: no guarda estado propio de
 * los valores (vive en el componente padre, uno por asiento seleccionado),
 * así los datos nunca se pierden al cambiar entre tickets. Solo administra
 * qué campos ya fueron "tocados" para no mostrar errores antes de tiempo.
 * La validación real (para marcar el ticket como completo) ocurre siempre,
 * independientemente de si el campo fue tocado o no.
 */
export function FormularioPasajero({ valores, alCambiarCampo }) {
  const [camposTocados, setCamposTocados] = useState({})
  const datos = valores ?? DATOS_PASAJERO_VACIOS
  const errores = validarPasajero(datos)

  function marcarTocado(campo) {
    setCamposTocados((anterior) => ({ ...anterior, [campo]: true }))
  }

  return (
    <form className="formulario-pasajero" onSubmit={(evento) => evento.preventDefault()} noValidate>
      <div className="formulario-pasajero__fila">
        <div onBlur={() => marcarTocado('nombres')}>
          <CampoTexto
            etiqueta="Nombres"
            valor={datos.nombres}
            alCambiar={(valor) => alCambiarCampo('nombres', valor)}
            marcador="Ej. María Fernanda"
            requerido
            error={camposTocados.nombres ? errores.nombres : undefined}
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
            error={camposTocados.apellidos ? errores.apellidos : undefined}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="formulario-pasajero__fila">
        <div onBlur={() => marcarTocado('dni')}>
          <CampoTexto
            etiqueta="DNI"
            valor={datos.dni}
            alCambiar={(valor) => alCambiarCampo('dni', valor.replace(/\D/g, '').slice(0, 8))}
            marcador="8 dígitos"
            requerido
            error={camposTocados.dni ? errores.dni : undefined}
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
            error={camposTocados.fechaNacimiento ? errores.fechaNacimiento : undefined}
          />
        </div>
      </div>

      <div onBlur={() => marcarTocado('celular')}>
        <CampoTexto
          etiqueta="Celular"
          tipo="tel"
          valor={datos.celular}
          alCambiar={(valor) => alCambiarCampo('celular', valor.replace(/\D/g, '').slice(0, 9))}
          marcador="9XXXXXXXX"
          requerido
          error={camposTocados.celular ? errores.celular : undefined}
          autoComplete="tel-national"
        />
      </div>
    </form>
  )
}
