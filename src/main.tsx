import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { PWAInstallPrompt } from './components/PWAInstallPrompt'
import { ToastProvider } from './components/ToastContainer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
        <PWAUpdatePrompt />
        <PWAInstallPrompt />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
