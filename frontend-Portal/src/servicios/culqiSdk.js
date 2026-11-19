const URL_CHECKOUT = 'https://js.culqi.com/checkout-js'
const URL_3DS = 'https://3ds.culqi.com'
const ORIGEN_3DS = 'https://3ds.culqi.com'

const scripts = new Map()

function cargarScript(url, global) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador'))
  if (window[global]) return Promise.resolve(window[global])
  if (scripts.has(url)) return scripts.get(url)
  const promesa = new Promise((resolver, rechazar) => {
    const script = document.createElement('script')
    const fallo = () => {
      scripts.delete(url)
      script.remove()
      rechazar(new Error('No se pudo cargar Culqi. Revisa tu conexión e inténtalo de nuevo.'))
    }
    script.src = url
    script.async = true
    script.addEventListener('load', () => (window[global] ? resolver(window[global]) : fallo()))
    script.addEventListener('error', fallo)
    document.body.appendChild(script)
  })
  scripts.set(url, promesa)
  return promesa
}

export function enCentimos(monto) {
  return Math.round(Number(monto) * 100)
}

export async function abrirCheckout({ publicKey, monto, titulo }) {
  if (!publicKey) throw new Error('Los pagos no están disponibles en este momento. Inténtalo más tarde.')
  const CulqiCheckout = await cargarScript(URL_CHECKOUT, 'CulqiCheckout')
  return new Promise((resolver, rechazar) => {
    let resuelto = false
    const checkout = new CulqiCheckout(publicKey, {
      settings: { title: titulo, currency: 'PEN', amount: enCentimos(monto) },
      options: {
        lang: 'es',
        modal: true,
        installments: false,
        paymentMethods: { tarjeta: true, yape: true, bancaMovil: false, agente: false, billetera: false, cuotealo: false },
      },
    })
    checkout.culqi = function () {
      if (resuelto) return
      if (checkout.token) {
        resuelto = true
        const token = { id: checkout.token.id, email: checkout.token.email ?? '' }
        checkout.close()
        resolver(token)
      } else if (checkout.error) {
        resuelto = true
        const mensaje = checkout.error.user_message || checkout.error.merchant_message
        checkout.close()
        rechazar(new Error(mensaje || 'No se pudo validar el medio de pago. Inténtalo de nuevo.'))
      }
    }
    checkout.closeCheckout = function () {
      if (resuelto) return
      resuelto = true
      rechazar(new Error('Cerraste la ventana de pago antes de completarlo.'))
    }
    checkout.open()
  })
}

export async function autenticar3ds({ publicKey, tokenId, monto, correo }) {
  const Culqi3DS = await cargarScript(URL_3DS, 'Culqi3DS')
  return new Promise((resolver, rechazar) => {
    let terminado = false
    function alMensaje(evento) {
      if (evento.origin !== ORIGEN_3DS) return
      const { parameters3DS, error } = evento.data ?? {}
      if (!parameters3DS && !error) return
      terminar()
      if (parameters3DS) resolver(parameters3DS)
      else rechazar(new Error('Tu banco no pudo verificar la tarjeta. Inténtalo con otro medio de pago.'))
    }
    function terminar() {
      if (terminado) return
      terminado = true
      window.removeEventListener('message', alMensaje)
      try {
        Culqi3DS.reset()
      } catch {
        terminado = true
      }
    }
    Culqi3DS.publicKey = publicKey
    Culqi3DS.settings = {
      charge: { totalAmount: enCentimos(monto), currency: 'PEN', returnUrl: window.location.href },
      card: { email: correo },
    }
    Culqi3DS.options = {
      showModal: true,
      showLoading: true,
      showIcon: true,
      closeModalAction: () => {
        terminar()
        rechazar(new Error('Cancelaste la verificación de tu banco.'))
      },
    }
    window.addEventListener('message', alMensaje)
    Culqi3DS.initAuthentication(tokenId)
  })
}
