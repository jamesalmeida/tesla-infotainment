import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './index.css';
import './styles/utilities.css';
import App from './App';
import { RearDisplay } from './components/RearDisplay/RearDisplay';
import { isRearHash } from './state/urlState';

function Root() {
  const [isRear, setIsRear] = useState(() => isRearHash(window.location.hash));

  useEffect(() => {
    const handleHash = () => setIsRear(isRearHash(window.location.hash));
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return isRear ? <RearDisplay /> : <App />;
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element in index.html');
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
