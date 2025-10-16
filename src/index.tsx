import ReactDOM from 'react-dom/client';
import './index.css';
// Fix: Import and render the main App component instead of the Main component.
import App from './App';

// Global error handlers for mobile debugging (development only)
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    console.error('[Global Error Handler] JavaScript Error:', event.error);
    console.error('[Global Error Handler] Message:', event.message);
    console.error('[Global Error Handler] Source:', event.filename);
    console.error('[Global Error Handler] Line:', event.lineno);
    
    // Show alert on mobile for debugging
    if (event.error) {
      const errorMsg = `JS Error: ${event.message}\nFile: ${event.filename}:${event.lineno}`;
      setTimeout(() => {
        alert(`Debug - ${errorMsg}`);
      }, 100);
    }
  });

  // Handle unhandled promise rejections (common with HMR issues)
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Global Promise Rejection]:', event.reason);
    
    // Show alert on mobile for debugging
    const errorMsg = `Unhandled Promise: ${event.reason?.message || event.reason}`;
    setTimeout(() => {
      alert(`Debug - ${errorMsg}`);
    }, 100);
    
    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  });

  // Catch React 18 errors specifically
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    
    // Filter out Chrome extension errors (not our problem)
    if (message.includes('runtime.lastError') || message.includes('message port closed')) {
      return; // Silently ignore extension errors
    }
    
    // Log to original console
    originalConsoleError.apply(console, args);
    
    // Check for common React/Vite errors
    if (message.includes('RefreshReg') || message.includes('plugin-react-swc') || message.includes('HMR')) {
      console.warn('[Mobile Debug] Detected HMR/React refresh error - this is expected on mobile browsers');
      
      setTimeout(() => {
        alert('Debug: Detected Vite HMR error on mobile - this is normal and doesn\'t affect functionality');
      }, 100);
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
