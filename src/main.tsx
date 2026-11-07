import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './index.css';
import './styles/utilities.css';
import App from './App';
import { RearDisplay } from './components/RearDisplay/RearDisplay';

const isRearHash = () => window.location.hash.replace(/^#\/?/, '') === 'rear';

function Root() {
  const [isRear, setIsRear] = useState(isRearHash);

  useEffect(() => {
    const handleHash = () => setIsRear(isRearHash());
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
