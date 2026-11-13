import {
  BarElement, CategoryScale, Chart, Legend, LinearScale, LineElement, LogarithmicScale, PointElement, Tooltip,
} from 'chart.js'

Chart.register(BarElement, CategoryScale, Legend, LinearScale, LogarithmicScale, LineElement, PointElement, Tooltip)

// Mismos valores que src/styles/tokens.css. Chart.js pinta en canvas y no lee variables CSS.
export const COLORES = { exacto: '#1e40af', genetico: '#60a5fa', neutro: '#94a3b8', negativo: '#b91c1c' }

Chart.defaults.font.family = "'Inter', system-ui, sans-serif"
Chart.defaults.color = '#475569'
Chart.defaults.borderColor = '#e2e8f0'

export const millones = (v) => `${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
