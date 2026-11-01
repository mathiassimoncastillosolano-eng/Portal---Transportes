import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ProveedorAutenticacion } from './contexto/ContextoAutenticacion'
import { ProveedorBusqueda } from './contexto/ContextoBusqueda'
import { ProveedorInicializacion } from './contexto/ContextoInicializacion'
import { ProveedorTema } from './contexto/ContextoTema'
import './estilos/globales.css'

// ProveedorInicializacion envuelve todo lo que habla con el backend (autenticación incluida):
// nada de eso se monta hasta que GET /api/health/ready confirma READY. Queda dentro de
// BrowserRouter para conservar la URL solicitada.
ReactDOM.createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorTema>
        <ProveedorInicializacion>
          <ProveedorAutenticacion>
            <ProveedorBusqueda>
              <App />
            </ProveedorBusqueda>
          </ProveedorAutenticacion>
        </ProveedorInicializacion>
      </ProveedorTema>
    </BrowserRouter>
  </React.StrictMode>
)
