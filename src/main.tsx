import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <PWAUpdatePrompt />
    </ErrorBoundary>
  </StrictMode>,
)
