import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/app-layout.css'
import './styles/campaign-manager-cockpit.css'
import './styles/cop-health-strip.css'
import App from './App.tsx'
import AppErrorBoundary from './components/AppErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
