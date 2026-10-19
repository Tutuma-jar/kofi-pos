import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No se encontró el contenedor de React.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
