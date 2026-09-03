import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept benign Google Maps SDK prototyping notice for DEMO_MAP_ID.
// When utilizing DEMO_MAP_ID for AdvancedMarkerElement prototyping without a Cloud Console Map ID,
// the Google Maps JavaScript SDK internally attempts to fetch Cloud styling and outputs a non-fatal
// log to console.error before gracefully falling back to standard vector map rendering.
// Route it to console.warn to maintain developer awareness without triggering uncaught error overlays.
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const message = typeof args[0] === 'string' ? args[0] : '';
  if (message.includes('Unable to fetch configuration for mapId')) {
    console.warn(...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Unable to fetch configuration for mapId')) {
    event.preventDefault();
    event.stopPropagation();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
