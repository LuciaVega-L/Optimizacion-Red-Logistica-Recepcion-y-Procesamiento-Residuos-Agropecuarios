
import Icono from './Icono.jsx'

const ICONOS = { error: 'error', info: 'info', ok: 'ok', alerta: 'alerta' }

export default function Aviso({ tipo = 'info', titulo, mensajes = [], onReintentar, children }) {
  if (!children && !mensajes.length) return null
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <Icono nombre={ICONOS[tipo]} className="aviso__icono" />
      <div className="aviso__cuerpo">
        {titulo && <strong>{titulo}</strong>}
        {mensajes.length === 1 && !titulo ? <p className="aviso__unico">{mensajes[0]}</p>
          : mensajes.length > 0 && <ul>{mensajes.map((m) => <li key={m}>{m}</li>)}</ul>}
        {children}
      </div>
      {onReintentar && (
        <button type="button" className="boton boton--secundario boton--mini aviso__accion" onClick={onReintentar}>
          <Icono nombre="reintentar" tamano={16} />Reintentar
        </button>
      )}
    </div>
  )
}
