import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerAll } from './core/registry';
import { allEntries } from './core/algorithms';
import './styles/global.css';

registerAll(allEntries);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
