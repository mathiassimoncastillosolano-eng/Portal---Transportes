import logoNormal from '../../assets/logo/logo.png'
import logoClaro from '../../assets/logo/logo-claro.png'
import './logoMarca.css'

const PROPORCION = 1.575

export function LogoMarca({ variante = 'auto', alto = 44, className = '' }) {
  const medidas = { width: Math.round(alto * PROPORCION), height: alto }
  return (
    <span className={`logo-marca ${className}`.trim()} style={{ '--logo-alto': `${alto}px` }} aria-hidden="true">
      {variante === 'claro' ? (
        <img className="logo-marca__img logo-marca__img--fijo" src={logoClaro} alt="" {...medidas} />
      ) : (
        <>
          <img className="logo-marca__img logo-marca__img--tema-claro" src={logoNormal} alt="" {...medidas} />
          <img className="logo-marca__img logo-marca__img--tema-oscuro" src={logoClaro} alt="" {...medidas} />
        </>
      )}
    </span>
  )
}
