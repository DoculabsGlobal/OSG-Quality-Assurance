import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LS } from './constants/config';

// Theme CSS
import './theme/variables.css';
import './theme/global.css';
import './theme/animations.css';

// Initialize theme from localStorage before first render
if (localStorage.getItem(LS.MODE) === 'moonlit') {
  document.documentElement.setAttribute('data-mode', 'moonlit');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
