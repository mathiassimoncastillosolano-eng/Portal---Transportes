import { soloDigitos } from './pagoSimulado.js'

const MAX_TITULAR = 26

function esAmex(digitos) {
  return digitos.startsWith('34') || digitos.startsWith('37')
}

export function limitarCampoPago(metodo, campo, valor, actuales = {}) {
  const texto = String(valor ?? '')

  if (metodo === 'tarjeta') {
    if (campo === 'numero') {
      const digitos = soloDigitos(texto)
      return digitos.slice(0, esAmex(digitos) ? 15 : 16)
    }
    if (campo === 'titular') return texto.slice(0, MAX_TITULAR)
    if (campo === 'vencimiento') {
      const digitos = soloDigitos(texto).slice(0, 4)
      return digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos
    }
    if (campo === 'cvv') {
      const maximo = esAmex(soloDigitos(actuales.numero ?? '')) ? 4 : 3
      return soloDigitos(texto).slice(0, maximo)
    }
  }

  if (metodo === 'yape') {
    if (campo === 'celular') return soloDigitos(texto).slice(0, 9)
    if (campo === 'codigoAprobacion') return soloDigitos(texto).slice(0, 6)
  }

  return texto
}