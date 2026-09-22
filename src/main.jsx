import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProveedorAutenticacion } from './contexto/ContextoAutenticacion'
import { ProveedorBusqueda } from './contexto/ContextoBusqueda'
import './estilos/globales.css'

ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorAutenticacion>
        <ProveedorBusqueda>
          <App />
        </ProveedorBusqueda>
      </ProveedorAutenticacion>
    </BrowserRouter>
  </React.StrictMode>
)
