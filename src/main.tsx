import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    registration?.update()
    // Revisa actualizaciones al volver a la app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        void registration?.update()
      }
    })
  },
  onNeedRefresh() {
    // Fuerza la versión nueva para no quedar con el botón viejo de cámara
    window.location.reload()
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
