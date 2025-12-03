import { 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';
import { NewUserData } from '../types/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from '../utils/logger';
import { getMoscowISOString } from '../utils/dateUtils';

const provider = new GoogleAuthProvider();

export const AuthService = {
  subscribeToAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          callback(null);
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
          // New user – create default profile
          // Firestore не принимает undefined, поэтому создаем объект без undefined полей
          const newUser: NewUserData = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email || '',
            role: 'MEMBER',
            isActive: true,
            createdAt: getMoscowISOString(),
            lastLoginAt: getMoscowISOString()
          };
          // Добавляем photoURL только если оно есть
          if (firebaseUser.photoURL) {
            newUser.photoURL = firebaseUser.photoURL;
          }

          await setDoc(userRef, newUser);
          callback(newUser as User);
        } else {
          const data = snapshot.data() as User;
          // Update lastLoginAt for existing user
          await updateDoc(userRef, {
            lastLoginAt: serverTimestamp()
          });
          callback({
            ...data,
            id: snapshot.id
          });
        }
      } catch (error) {
        logger.error('Error in subscribeToAuth', error instanceof Error ? error : undefined);
        // В случае ошибки все равно вызываем callback с null, чтобы не блокировать UI
        callback(null);
      }
    });
  },

  async loginWithGoogle(): Promise<User> {
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // Firestore не принимает undefined, поэтому создаем объект без undefined полей
      const newUser: any = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email || '',
        role: 'MEMBER',
        isActive: true,
        createdAt: getMoscowISOString(),
        lastLoginAt: getMoscowISOString()
      };
      // Добавляем photoURL только если оно есть
      if (firebaseUser.photoURL) {
        newUser.photoURL = firebaseUser.photoURL;
      }

      await setDoc(userRef, newUser);
      return newUser as User;
    } else {
      const data = snapshot.data() as User;
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      return {
        ...data,
        id: snapshot.id
      };
    }
  },

  async loginWithEmail(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

    const userRef = doc(db, 'users', firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // Firestore не принимает undefined, поэтому создаем объект без undefined полей
      const newUser: any = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email || '',
        role: 'MEMBER',
        isActive: true,
        createdAt: getMoscowISOString(),
        lastLoginAt: getMoscowISOString()
      };
      // Добавляем photoURL только если оно есть
      if (firebaseUser.photoURL) {
        newUser.photoURL = firebaseUser.photoURL;
      }

      await setDoc(userRef, newUser);
      return newUser as User;
    } else {
      const data = snapshot.data() as User;
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp()
      });
      return {
        ...data,
        id: snapshot.id
      };
    }
    } catch (error: any) {
      console.error('Login error:', error);
      // Преобразуем технические ошибки в понятные сообщения
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        throw new Error('Неверный email или пароль. Проверьте данные и попробуйте снова.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('Пользователь с таким email не найден. Зарегистрируйтесь или проверьте email.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Некорректный email адрес.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Слишком много попыток входа. Попробуйте позже или восстановите пароль.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Ошибка сети. Проверьте подключение к интернету.');
      } else {
        throw new Error(error.message || 'Ошибка при входе. Попробуйте снова.');
      }
    }
  },

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

    const userRef = doc(db, 'users', firebaseUser.uid);
      // Firestore не принимает undefined, поэтому создаем объект без undefined полей
      const newUser: NewUserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: displayName || firebaseUser.email || '',
        role: 'MEMBER',
        isActive: true,
        createdAt: getMoscowISOString(),
        lastLoginAt: getMoscowISOString()
      };
      // Добавляем photoURL только если оно есть
      if (firebaseUser.photoURL) {
        newUser.photoURL = firebaseUser.photoURL;
      }

      await setDoc(userRef, newUser);
      return newUser as User;
    } catch (error: any) {
      console.error('Registration error:', error);
      // Преобразуем технические ошибки в понятные сообщения
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email уже используется. Войдите или используйте другой email.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Некорректный email адрес.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Пароль слишком слабый. Используйте минимум 6 символов.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Ошибка сети. Проверьте подключение к интернету.');
      } else {
        throw new Error(error.message || 'Ошибка при регистрации. Попробуйте снова.');
      }
    }
  },

  async loginAsDemo(): Promise<User> {
    try {
      // Используем анонимную аутентификацию для демо-режима
      const result = await signInAnonymously(auth);
      const firebaseUser = result.user;

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        // Создаем демо-пользователя
        // Firestore не принимает undefined, поэтому создаем объект без undefined полей
        const demoUser: NewUserData = {
          id: firebaseUser.uid,
          email: 'demo@example.com',
          displayName: 'Демо пользователь',
          role: 'MEMBER',
          isActive: true,
          createdAt: getMoscowISOString(),
          lastLoginAt: getMoscowISOString()
        };
        // Добавляем photoURL только если оно есть (для анонимных пользователей его нет)
        if (firebaseUser.photoURL) {
          demoUser.photoURL = firebaseUser.photoURL;
        }

        await setDoc(userRef, demoUser);
        
        // Инициализируем демо-данные для нового пользователя
        try {
          const { initializeDemoData } = await import('./demoData');
          await initializeDemoData(demoUser as User);
        } catch (demoError) {
          // Не блокируем вход, если демо-данные не создались
          logger.warn('Не удалось создать демо-данные', { error: demoError });
        }
        
        return demoUser as User;
      } else {
        const data = snapshot.data() as User;
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp()
        });
        
        // Проверяем, есть ли у пользователя workspace, если нет - создаем демо-данные
        const { initializeDemoData } = await import('./demoData');
        try {
          const workspacesQuery = query(
            collection(db, 'workspaces'),
            where('ownerId', '==', firebaseUser.uid)
          );
          const workspacesSnapshot = await getDocs(workspacesQuery);
          
          if (workspacesSnapshot.empty) {
            // У пользователя нет workspace, создаем демо-данные
            logger.info('У демо-пользователя нет workspace, создаем демо-данные');
            await initializeDemoData({ ...data, id: snapshot.id } as User);
          }
        } catch (demoError) {
          logger.warn('Не удалось проверить/создать демо-данные', { error: demoError });
        }
        
        return {
          ...data,
          id: snapshot.id
        };
      }
    } catch (error) {
      logger.error('Demo login error', error instanceof Error ? error : undefined);
      throw new Error('Не удалось войти в демо-режим. Попробуйте снова.');
    }
  },

  async logout() {
    await signOut(auth);
  }
};
