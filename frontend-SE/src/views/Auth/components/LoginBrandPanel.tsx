import { BrandLogo } from '@/components/brand/BrandLogo'

/**
 * Panel visual del login (45–55% del ancho en desktop, oculto en móvil salvo
 * el lockup compacto que monta `LoginView`). Todo el motivo es SVG propio
 * —líneas de ruta, paraderos, halos de profundidad— construido sobre la
 * marca (`ink` profundo + acento `accent`), sin imágenes externas.
 *
 * Un único momento animado al montar (el trazo de la ruta se dibuja) más una
 * deriva ambiental muy sutil en los halos; todo respeta
 * `prefers-reduced-motion` a través de la regla global en `index.css`.
 */
export function LoginBrandPanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,var(--color-ink-950)_0%,var(--color-ink-900)_55%,var(--color-primary-600)_130%)] px-12 py-10 text-white lg:flex xl:px-16 xl:py-12">
      {/* Halos de profundidad */}
      <div
        aria-hidden="true"
        className="motion-safe:animate-float-slow pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-accent-500/20 blur-[90px]"
      />
      <div
        aria-hidden="true"
        className="motion-safe:animate-float-slower pointer-events-none absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-route-400/20 blur-[110px]"
      />

      {/* Motivo de ruta: una línea que serpentea entre "paraderos" */}
      <svg
        aria-hidden="true"
        viewBox="0 0 560 640"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.55]"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M -40 120 C 90 60, 150 210, 280 180 S 460 40, 600 110"
          fill="none"
          stroke="var(--color-accent-400)"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          strokeLinecap="round"
          opacity="0.5"
        />
        <path
          d="M -40 420 C 110 360, 170 520, 300 480 S 480 340, 600 430"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          strokeLinecap="round"
          opacity="0.22"
        />
        <path
          d="M -30 260 C 100 190, 190 340, 310 300 C 400 270, 430 150, 560 190"
          fill="none"
          stroke="var(--color-accent-400)"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="motion-safe:animate-draw-path"
          style={{ ['--path-length' as string]: 900, strokeDasharray: 900 }}
        />
        {[
          { cx: -30, cy: 260 },
          { cx: 190, cy: 300 },
          { cx: 310, cy: 300 },
          { cx: 560, cy: 190 },
        ].map((p, i) => (
          <circle
            key={`${p.cx}-${p.cy}`}
            cx={p.cx}
            cy={p.cy}
            r={5}
            fill="var(--color-accent-400)"
            className="animate-scale-in"
            style={{ animationDelay: `${600 + i * 220}ms` }}
          />
        ))}
      </svg>

      {/* Marca */}
      <div className="relative z-10">
        <BrandLogo subtitle="Sistema Empresarial" />
      </div>

      {/* Mensaje principal */}
      <div className="relative z-10 max-w-md">
        <p
          className="text-[30px] font-medium leading-[1.25] tracking-tight text-white xl:text-[34px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Gestión empresarial para una operación más inteligente.
        </p>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-300">
          Ventas de pasajes, ocupación y desempeño de tus agencias en un mismo lugar, en
          tiempo real.
        </p>
      </div>

      {/* Pie */}
      <div className="relative z-10 flex items-center justify-between text-xs text-ink-400">
        <span>© {new Date().getFullYear()} RutaLibre</span>
        <span>Sistema Empresarial · MVP</span>
      </div>
    </div>
  )
}
