import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { NotificacionesProvider } from './context/NotificacionesContext.jsx'
import { RedProvider } from './context/RedContext.jsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <NotificacionesProvider>
        <RedProvider>
          <App />
        </RedProvider>
      </NotificacionesProvider>
    </BrowserRouter>
  </React.StrictMode>
)
