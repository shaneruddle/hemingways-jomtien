import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Workbox } from 'workbox-window';
import App from './App.tsx';
import './index.css';

// Register Service Worker
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  const wb = new Workbox('/sw.js');
  wb.register().catch(err => console.error('Service Worker registration failed:', err));
}
// Service worker disabled in dev to avoid conflict with Firestore real-time streams

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
