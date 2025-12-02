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
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing!');
  console.error('Required environment variables:');
  console.error('  VITE_FIREBASE_API_KEY:', firebaseConfig.apiKey ? '✓' : '✗');
  console.error('  VITE_FIREBASE_AUTH_DOMAIN:', firebaseConfig.authDomain ? '✓' : '✗');
  console.error('  VITE_FIREBASE_PROJECT_ID:', firebaseConfig.projectId ? '✓' : '✗');
  console.error('These variables must be set during Docker build with --build-arg');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
