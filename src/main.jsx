import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { useVouchStore } from './store/useVouchStore.js'

function Root() {
  const ready = useVouchStore((s) => s.ready);
  const hydrate = useVouchStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-slate-400 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-brand-600 animate-spin" />
          Loading Vouch…
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
