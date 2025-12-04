import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { logger } from './utils/logger';
import './index.css';

// Глобальная обработка ошибок
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', event.error instanceof Error ? event.error : undefined, {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', event.reason instanceof Error ? event.reason : undefined);
});

if (import.meta.env.DEV) {
  logger.info('Application starting', {
    url: window.location.href,
    userAgent: navigator.userAgent
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  logger.error('Root element not found');
  throw new Error('Root element not found');
}

// Проверяем, что React и ReactDOM инициализированы
if (!React || !ReactDOM) {
  logger.error('React or ReactDOM is not available');
  throw new Error('React or ReactDOM is not available');
}

try {
  // Отключен StrictMode из-за известной проблемы в React 19.2.0+
  // TODO: Включить обратно после обновления React или исправления проблемы
  // React.StrictMode вызывает ошибку "Cannot set properties of undefined (setting 'Activity')"
  // Это известный баг в React 19, связанный с внутренними механизмами отслеживания компонентов
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg, #fff)',
            color: 'var(--toast-color, #000)',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorBoundary>
  );
  
  if (import.meta.env.DEV) {
    logger.info('App rendered successfully');
  }
} catch (error) {
  logger.error('Failed to render app', error instanceof Error ? error : undefined);
  // Показываем пользователю понятное сообщение об ошибке
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: sans-serif;">
      <h1>Ошибка загрузки приложения</h1>
      <p>Пожалуйста, обновите страницу или обратитесь в поддержку.</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">
        Обновить страницу
      </button>
    </div>
  `;
}
