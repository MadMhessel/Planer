import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "../index.css";

// Глобальная обработка необработанных ошибок
window.addEventListener('error', (event) => {
  console.error('❌ Unhandled error:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
});

// Логирование начала загрузки
console.log('🚀 Application starting...');
console.log('📍 Current URL:', window.location.href);
console.log('🌐 User Agent:', navigator.userAgent);

// Проверка наличия root элемента
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element (#root) not found in DOM');
}

console.log('✅ Root element found, rendering app...');

try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  throw error;
}
