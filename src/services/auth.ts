import { 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { User, UserRole } from '../types';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

const provider = new GoogleAuthProvider();

export const AuthService = {
  subscribeToAuth(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        // New user – create default profile
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        await setDoc(userRef, newUser);
        callback(newUser);
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
    });
  },

  async loginWithGoogle(): Promise<User> {
    try {
      console.log('🔐 Начало аутентификации через Google...');
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      console.log('✅ Аутентификация успешна:', firebaseUser.email);

      const userRef = doc(db, 'users', firebaseUser.uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        const newUser: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
          role: 'MEMBER',
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        };

        await setDoc(userRef, newUser);
        console.log('✅ Создан новый пользователь:', newUser.email);
        return newUser;
      } else {
        const data = snapshot.data() as User;
        await updateDoc(userRef, {
          lastLoginAt: serverTimestamp()
        });
        console.log('✅ Пользователь найден:', data.email);
        return {
          ...data,
          id: snapshot.id
        };
      }
    } catch (error: any) {
      console.error('❌ Ошибка аутентификации:', error);
      
      // Обработка специфичных ошибок Firebase
      if (error.code === 'auth/popup-blocked') {
        throw new Error('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для этого сайта.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Окно аутентификации было закрыто. Попробуйте снова.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Домен не авторизован в Firebase. Обратитесь к администратору.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Метод аутентификации не включен в Firebase Console.');
      } else {
        throw new Error(error.message || 'Ошибка при входе через Google. Попробуйте снова.');
      }
    }
  },

  async logout() {
    await signOut(auth);
  }
};
