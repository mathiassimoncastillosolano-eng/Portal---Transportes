import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProveedorAutenticacion } from './contexto/ContextoAutenticacion'
import { ProveedorBusqueda } from './contexto/ContextoBusqueda'
import { ProveedorTema } from './contexto/ContextoTema'
import './estilos/globales.css'

ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorTema>
        <ProveedorAutenticacion>
          <ProveedorBusqueda>
            <App />
          </ProveedorBusqueda>
        </ProveedorAutenticacion>
      </ProveedorTema>
    </BrowserRouter>
  </React.StrictMode>
)
