import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/utilities.css';
import App from './App';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
