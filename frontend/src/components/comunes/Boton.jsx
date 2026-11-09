// Botón reutilizable. variante: 'primario' | 'secundario' | 'peligro'
export default function Boton({ variante = 'primario', children, ...props }) {
  return <button className={`boton boton--${variante}`} {...props}>{children}</button>
}
