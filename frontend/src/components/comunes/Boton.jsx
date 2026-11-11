// Botón reutilizable. variante: 'primario' | 'secundario' | 'fantasma' | 'peligro'
// cargando: deshabilita el botón y muestra un indicador mientras dura la acción.
export default function Boton({ variante = 'primario', cargando = false, disabled, className = '', children, ...props }) {
  return (
    <button type="button" className={`boton boton--${variante} ${className}`} disabled={disabled || cargando}
      aria-busy={cargando || undefined} {...props}>
      {cargando && <span className="boton__giro" aria-hidden="true" />}
      {children}
    </button>
  )
}
