// Point d'entrée de l'application
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import { AppRouter } from './router';
import { ToastProvider } from '@/components/ui/Toast';
import { ActiveSessionProvider } from '@/contexts/ActiveSessionContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Importe le DebugPanel
import { DebugPanel } from '@/components/debug/DebugPanel';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ActiveSessionProvider>
            <AppRouter />
            {import.meta.env.DEV && <DebugPanel />}
          </ActiveSessionProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
