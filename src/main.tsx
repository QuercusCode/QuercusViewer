import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'

// React's ErrorBoundary only catches errors thrown during render/commit. An
// error thrown inside an async callback, event handler, or a rejected
// promise (e.g. a WebGL context loss callback, a PeerJS data handler, a
// fetch chain with no .catch) previously vanished with no trace at all.
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)
