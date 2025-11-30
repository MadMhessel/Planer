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
    const result = await signInWithPopup(auth, provider);
    const firebaseUser = result.user;

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
      return newUser;
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

  async logout() {
    await signOut(auth);
  }
};
