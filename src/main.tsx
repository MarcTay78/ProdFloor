import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

// Dev-only handle for debugging and scripted checks in the browser console.
if (import.meta.env.DEV) Object.assign(window, { prodfloor: { useProjectStore, useUiStore } });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
