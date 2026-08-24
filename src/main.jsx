import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import './index.css'

const missingEnv = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

if (missingEnv) {
  document.getElementById('root').innerHTML = `
    <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;padding:2rem;text-align:center;font-family:system-ui,sans-serif;">
      <div>
        <p style="font-size:3rem;margin:0 0 1rem;">⚠️</p>
        <h1 style="margin:0 0 0.5rem;">Falta configuración</h1>
        <p style="color:#666;">No se encontraron las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.</p>
      </div>
    </div>
  `
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <HashRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </React.StrictMode>,
  )
}
