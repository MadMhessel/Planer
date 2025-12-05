import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Типы для конфигурации
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Тип для import.meta.env (Vite environment variables)
interface ImportMetaEnv {
  VITE_FIREBASE_API_KEY?: string;
  VITE_FIREBASE_AUTH_DOMAIN?: string;
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_STORAGE_BUCKET?: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  DEV?: boolean;
}

interface CustomImportMeta {
  env: ImportMetaEnv;
}

// Функция для загрузки конфигурации с сервера (runtime из Cloud Run)
async function loadFirebaseConfig(): Promise<FirebaseConfig> {
  // Сначала проверяем build-time переменные (для локальной разработки)
  const env = (import.meta as unknown as CustomImportMeta).env;
  const buildTimeConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID
  };

  // Если build-time конфигурация полная, используем её (локальная разработка)
  if (buildTimeConfig.apiKey && buildTimeConfig.projectId && buildTimeConfig.authDomain) {
    if (env.DEV) {
      console.log('✅ Using build-time Firebase configuration (local dev)');
    }
    return buildTimeConfig as FirebaseConfig;
  }

  // Иначе загружаем с сервера (runtime конфигурация из Cloud Run)
  if (env.DEV) {
    console.log('🔧 Loading Firebase configuration from server (Cloud Run)...');
  }
  try {
    const response = await fetch('/api/config/firebase');
    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
    }
    const config = await response.json();
    
    if (!config.apiKey || !config.projectId || !config.authDomain) {
      throw new Error('Incomplete Firebase configuration from server');
    }
    
    if (env.DEV) {
      console.log('✅ Firebase configuration loaded from server');
      console.log('📋 Config:', {
        hasApiKey: !!config.apiKey,
        hasAuthDomain: !!config.authDomain,
        hasProjectId: !!config.projectId,
        projectId: config.projectId
      });
    }
    
    return config as FirebaseConfig;
  } catch (error) {
    console.error('❌ Failed to load Firebase configuration:', error);
    throw new Error('Firebase configuration not available. Please check Cloud Run environment variables.');
  }
}

// Инициализация Firebase
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initPromise: Promise<void> | null = null;

// Функция инициализации (вызывается один раз)
async function initializeFirebase(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const firebaseConfig = await loadFirebaseConfig();
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      if ((import.meta as unknown as CustomImportMeta).env.DEV) {
        console.log('✅ Firebase initialized successfully');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase:', error);
      throw error;
    }
  })();

  return initPromise;
}

// КРИТИЧЕСКИ ВАЖНО: Не вызываем initializeFirebase() на верхнем уровне модуля,
// чтобы избежать ошибки "Cannot access 'It' before initialization" в production сборке.
// Вместо этого экспортируем функцию, которая будет вызвана явно в App.tsx.
// Это гарантирует правильный порядок инициализации модулей.
export function firebaseInit(): Promise<void> {
  return initializeFirebase();
}

// Экспортируем объекты (будут доступны после инициализации)
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Await firebaseInit() first.');
  }
  return auth;
}

export function getFirestoreInstance(): Firestore {
  if (!db) {
    throw new Error('Firestore not initialized. Await firebaseInit() first.');
  }
  return db;
}

// НЕ экспортируем auth и db напрямую, чтобы избежать ошибки
// "Cannot access 'It' before initialization" в production сборке.
// Все модули должны использовать getAuthInstance() и getFirestoreInstance().
// export { auth, db }; // УДАЛЕНО для предотвращения ошибки инициализации
// НЕ экспортируем app по умолчанию, так как он может быть null до инициализации
// export default app; // УДАЛЕНО для предотвращения ошибки инициализации
