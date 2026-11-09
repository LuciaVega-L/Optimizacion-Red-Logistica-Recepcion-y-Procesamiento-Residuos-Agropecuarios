import {
  BarElement, CategoryScale, Chart, Legend, LinearScale, LineElement, LogarithmicScale, PointElement, Tooltip,
} from 'chart.js'

Chart.register(BarElement, CategoryScale, Legend, LinearScale, LogarithmicScale, LineElement, PointElement, Tooltip)

export const COLORES = { exacto: '#2e7d32', genetico: '#ef6c00', neutro: '#90a4ae', negativo: '#c62828' }

export const millones = (v) => `${(v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
