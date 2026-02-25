import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './app/App';
import './index.css';
import 'leaflet/dist/leaflet.css';

// ✅ Vite-PWA helper (NOT workbox-window)
import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

// ✅ register service worker (enables caching/offline)
registerSW({ immediate: true });