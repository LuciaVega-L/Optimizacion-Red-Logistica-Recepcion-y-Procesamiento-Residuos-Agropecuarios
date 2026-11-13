
export default function Boton({ variante = 'primario', cargando = false, disabled, className = '', children, ...props }) {
  return (
    <button type="button" className={`boton boton--${variante} ${className}`} disabled={disabled || cargando}
      aria-busy={cargando || undefined} {...props}>
      {cargando && <span className="boton__giro" aria-hidden="true" />}
      {children}
    </button>
  )
}
