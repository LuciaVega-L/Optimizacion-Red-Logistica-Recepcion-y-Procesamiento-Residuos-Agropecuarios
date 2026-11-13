export default function Plegable({ titulo, abierto = false, children }) {
  return (
    <details className="plegable" open={abierto}>
      <summary className="plegable__titulo">{titulo}</summary>
      <div className="plegable__cuerpo">{children}</div>
    </details>
  )
}
