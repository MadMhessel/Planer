import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper to access Vite environment variables without TypeScript errors
const env = (import.meta as any).env;

// These environment variables must be set in your build environment (Client-side)
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Проверка что все переменные заданы (для отладки)
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain;

if (!isConfigValid) {
  console.error('❌ Firebase configuration is missing!');
  console.error('Required environment variables:');
  console.error('  VITE_FIREBASE_API_KEY:', firebaseConfig.apiKey ? '✓' : '✗');
  console.error('  VITE_FIREBASE_AUTH_DOMAIN:', firebaseConfig.authDomain ? '✓' : '✗');
  console.error('  VITE_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? '✓' : '✗');
  console.error('These variables must be set during Docker build with --build-arg');
  console.error('Current URL:', typeof window !== 'undefined' ? window.location.href : 'SSR');
}

let app: any;
let auth: any;
let db: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  if (isConfigValid) {
    console.log('✅ Firebase initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  // В продакшене это должно быть обработано лучше
  // Пока выбрасываем ошибку, чтобы ErrorBoundary мог её поймать
  throw new Error('Firebase initialization failed. Please check your configuration.');
}

export { auth, db };
export default app;
