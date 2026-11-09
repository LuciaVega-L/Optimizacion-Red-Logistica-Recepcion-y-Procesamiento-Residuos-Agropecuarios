// Mensajes de error o información. tipo: 'error' | 'info' | 'ok' | 'alerta'
export default function Aviso({ tipo = 'info', titulo, mensajes = [], children }) {
  if (!children && !mensajes.length) return null
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {titulo && <strong>{titulo}</strong>}
      {mensajes.length > 0 && <ul>{mensajes.map((m) => <li key={m}>{m}</li>)}</ul>}
      {children}
    </div>
  )
}
