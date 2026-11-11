import type { Pasajero } from '@/types/pasajero'
import { crearPrng, elegir, entero, pad } from './semilla'

const NOMBRES = [
  'Luis', 'Carlos', 'José', 'Miguel', 'Jorge', 'Juan', 'Pedro', 'Diego', 'Andrés', 'Renzo',
  'Fernando', 'Ricardo', 'Alonso', 'Sergio', 'Héctor', 'Marco', 'Víctor', 'Édgar', 'Percy', 'Walter',
  'María', 'Rosa', 'Carmen', 'Ana', 'Lucía', 'Sofía', 'Karen', 'Milagros', 'Patricia', 'Gabriela',
  'Elena', 'Julia', 'Paola', 'Daniela', 'Flor', 'Yesenia', 'Nataly', 'Rocío', 'Claudia', 'Verónica',
]

const APELLIDOS = [
  'Quispe', 'Huamán', 'Flores', 'Rodríguez', 'García', 'Mamani', 'Rojas', 'Sánchez', 'Torres', 'Ramírez',
  'Chávez', 'Vásquez', 'Castillo', 'Gutiérrez', 'Díaz', 'Mendoza', 'Ccori', 'Condori', 'Salazar', 'Paredes',
  'Vargas', 'Cárdenas', 'Cabrera', 'Ríos', 'Delgado', 'Espinoza', 'Ponce', 'Herrera', 'Cruz', 'Ortiz',
  'Medina', 'Aguilar', 'Palomino', 'Lozano', 'Valdivia', 'Acosta', 'Zegarra', 'Bustamante', 'Ayala', 'Calderón',
]

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function generar(total: number): Pasajero[] {
  const rng = crearPrng(7301)
  const usados = new Set<string>()
  const lista: Pasajero[] = []

  while (lista.length < total) {
    const suerte = rng()
    let tipoDocumento: Pasajero['tipoDocumento'] = 'DNI'
    let numeroDocumento = String(entero(rng, 10_000_000, 79_999_999))
    if (suerte > 0.98) {
      tipoDocumento = 'PASAPORTE'
      numeroDocumento = `PE${pad(entero(rng, 0, 9_999_999), 7)}`
    } else if (suerte > 0.93) {
      tipoDocumento = 'CE'
      numeroDocumento = String(entero(rng, 100_000_000, 999_999_999))
    }
    if (usados.has(numeroDocumento)) continue
    usados.add(numeroDocumento)

    const nombres = rng() > 0.7 ? `${elegir(rng, NOMBRES)} ${elegir(rng, NOMBRES)}` : elegir(rng, NOMBRES)
    const apellidos = `${elegir(rng, APELLIDOS)} ${elegir(rng, APELLIDOS)}`
    const n = lista.length + 1
    const email =
      rng() > 0.55
        ? `${sinTildes(nombres.split(' ')[0])}.${sinTildes(apellidos.split(' ')[0])}${entero(rng, 1, 99)}@gmail.com`
        : undefined

    lista.push({
      id: `pj-${n}`,
      tipoDocumento,
      numeroDocumento,
      nombres,
      apellidos,
      telefono: String(entero(rng, 900_000_000, 999_999_999)),
      email,
    })
  }
  return lista
}

/** Pool de pasajeros frecuentes; los pasajes lo reutilizan. */
export const pasajerosMock: Pasajero[] = generar(1400)
