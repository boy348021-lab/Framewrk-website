import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

try {
  const storedTheme = window.localStorage.getItem('framewrk-theme');
  document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark';
} catch {
  // The app defaults to dark when storage is unavailable.
  document.documentElement.dataset.theme = 'dark';
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
