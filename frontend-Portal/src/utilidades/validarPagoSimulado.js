import { soloDigitos, validarPagoYape } from './pagoSimulado.js'

function pasaLuhn(numero) {
  let suma = 0
  let doble = false
  for (let i = numero.length - 1; i >= 0; i -= 1) {
    let digito = Number(numero[i])
    if (doble) {
      digito *= 2
      if (digito > 9) digito -= 9
    }
    suma += digito
    doble = !doble
  }
  return suma % 10 === 0
}

function esAmex(numero) {
  return numero.length === 15 && (numero.startsWith('34') || numero.startsWith('37'))
}

function validarVencimiento(texto, ahora) {
  const coincide = /^(\d{2})\/(\d{2})$/.exec(String(texto ?? '').trim())
  if (!coincide) return 'Ingresa el vencimiento con formato MM/AA.'
  const mes = Number(coincide[1])
  const anio = 2000 + Number(coincide[2])
  if (mes < 1 || mes > 12) return 'El mes de vencimiento no es válido.'
  const mesActual = ahora.getFullYear() * 12 + ahora.getMonth()
  if (anio * 12 + (mes - 1) < mesActual) return 'La tarjeta está vencida.'
  return null
}

export function validarTarjetaSimulada(valores = {}, ahora = new Date()) {
  const errores = {}
  const numero = soloDigitos(valores.numero ?? '')

  if (!numero) errores.numero = 'Ingresa el número de tarjeta.'
  else if (numero.length < 13 || numero.length > 19 || !pasaLuhn(numero)) {
    errores.numero = 'El número de tarjeta no es válido.'
  }

  if (!String(valores.titular ?? '').trim()) errores.titular = 'Ingresa el nombre del titular.'

  const errorVencimiento = validarVencimiento(valores.vencimiento, ahora)
  if (errorVencimiento) errores.vencimiento = errorVencimiento

  const longitudCvv = esAmex(numero) ? 4 : 3
  const cvv = String(valores.cvv ?? '')
  if (!new RegExp(`^\\d{${longitudCvv}}$`).test(cvv)) {
    errores.cvv = `El CVV debe tener ${longitudCvv} dígitos.`
  }

  return errores
}

export function validarDatosPago(metodo, { tarjeta = {}, yape = {} } = {}, ahora = new Date()) {
  if (metodo === 'yape') return validarPagoYape(yape, { sandbox: true })
  return validarTarjetaSimulada(tarjeta, ahora)
}