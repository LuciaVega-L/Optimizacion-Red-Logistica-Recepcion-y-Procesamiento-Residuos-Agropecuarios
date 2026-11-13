// Logo de EcoResiduos: una hoja cuya nervadura es una ruta con nodos (residuo agrícola + red logística).
// Es decorativo: el nombre siempre va en texto al lado.
export default function Logo({ tamano = 32 }) {
  return (
    <svg className="logo" width={tamano} height={tamano} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="8" fill="#15803d" />
      <path d="M7 25C7 14 14 7 25.5 6.5C25.5 18 18.5 25 7 25Z" fill="#ffffff" />
      <path d="M7 25L12.5 19.5L16 18L19.5 12.5" fill="none" stroke="#15803d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12.5" cy="19.5" r="1.9" fill="#15803d" />
      <circle cx="16" cy="18" r="1.4" fill="#15803d" />
      <circle cx="19.5" cy="12.5" r="1.9" fill="#15803d" />
    </svg>
  )
}
