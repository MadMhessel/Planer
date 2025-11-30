import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from '../types';

export const AuthService = {
  subscribeToAuth: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch custom user data from Firestore 'users' collection to get extended fields like Telegram
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        let customData = {};
        if (docSnap.exists()) {
            customData = docSnap.data();
        }

        const user: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email || '',
            avatar: firebaseUser.photoURL || '',
            role: 'MEMBER',
            ...customData
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  },

  login: async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  },

  register: async (name: string, email: string, pass: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
        await updateProfile(cred.user, { displayName: name });
        // Create user profile doc
        await setDoc(doc(db, 'users', cred.user.uid), {
            id: cred.user.uid,
            name: name,
            email: email,
            createdAt: new Date().toISOString(),
            role: email.toLowerCase() === 'crazymhessel@gmail.com' ? 'OWNER' : 'MEMBER'
        });
    }
  },

  logout: async () => {
    await signOut(auth);
  }
};