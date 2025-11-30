import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  getDocs,
  setDoc,
  getDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Project, User, Workspace, Notification, SystemSettings } from '../types';

// --- Workspaces ---

export const subscribeToWorkspaces = (email: string, onUpdate: (workspaces: Workspace[]) => void) => {
  const q = query(
    collection(db, 'workspaces'), 
    where('allowedEmails', 'array-contains', email)
  );

  return onSnapshot(q, (snapshot) => {
    const workspaces = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workspace));
    onUpdate(workspaces);
  });
};

export const createWorkspace = async (name: string, owner: User) => {
  const wsData = {
    name,
    ownerId: owner.id,
    allowedEmails: [owner.email],
    createdAt: new Date().toISOString()
  };
  const docRef = await addDoc(collection(db, 'workspaces'), wsData);
  
  await setDoc(doc(db, `workspaces/${docRef.id}/members`, owner.id), {
    id: owner.id,
    name: owner.name,
    email: owner.email,
    role: 'OWNER',
    joinedAt: new Date().toISOString()
  });
  
  return docRef.id;
};

export const inviteUserToWorkspace = async (workspaceId: string, email: string) => {
  const wsRef = doc(db, 'workspaces', workspaceId);
  const wsDoc = await getDocs(query(collection(db, 'workspaces'), where('__name__', '==', workspaceId)));
  if (!wsDoc.empty) {
      const data = wsDoc.docs[0].data();
      const currentEmails = data.allowedEmails || [];
      if (!currentEmails.includes(email)) {
          await updateDoc(wsRef, {
              allowedEmails: [...currentEmails, email]
          });
      }
  }
};

// --- Members ---

export const subscribeToMembers = (workspaceId: string, onUpdate: (users: User[]) => void) => {
  const membersRef = collection(db, `workspaces/${workspaceId}/members`);
  return onSnapshot(membersRef, (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    onUpdate(users);
  });
};

export const joinWorkspace = async (workspaceId: string, user: User) => {
    const memberRef = doc(db, `workspaces/${workspaceId}/members`, user.id);
    await setDoc(memberRef, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'MEMBER',
        avatar: user.avatar || '',
        telegram: user.telegram || {},
        joinedAt: new Date().toISOString()
    }, { merge: true });
};

// --- Tasks ---

export const subscribeToTasks = (workspaceId: string, onUpdate: (tasks: Task[]) => void) => {
  const q = query(collection(db, `workspaces/${workspaceId}/tasks`));
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    onUpdate(tasks);
  });
};

export const addTask = async (workspaceId: string, task: Omit<Task, 'id'>) => {
  await addDoc(collection(db, `workspaces/${workspaceId}/tasks`), task);
};

export const updateTask = async (workspaceId: string, task: Task) => {
  const { id, ...data } = task;
  await updateDoc(doc(db, `workspaces/${workspaceId}/tasks`, id), data as any);
};

export const deleteTask = async (workspaceId: string, taskId: string) => {
  await deleteDoc(doc(db, `workspaces/${workspaceId}/tasks`, taskId));
};

// --- Projects ---

export const subscribeToProjects = (workspaceId: string, onUpdate: (projects: Project[]) => void) => {
  const q = query(collection(db, `workspaces/${workspaceId}/projects`));
  return onSnapshot(q, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    onUpdate(projects);
  });
};

export const addProject = async (workspaceId: string, project: Omit<Project, 'id'>) => {
  await addDoc(collection(db, `workspaces/${workspaceId}/projects`), project);
};

export const updateProject = async (workspaceId: string, project: Project) => {
  const { id, ...data } = project;
  await updateDoc(doc(db, `workspaces/${workspaceId}/projects`, id), data as any);
};

export const deleteProject = async (workspaceId: string, projectId: string) => {
  await deleteDoc(doc(db, `workspaces/${workspaceId}/projects`, projectId));
};

// --- Notifications & Settings ---

export const subscribeToNotifications = (userId: string, onUpdate: (notes: Notification[]) => void) => {
    const q = query(collection(db, `users/${userId}/notifications`), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        onUpdate(notes);
    });
};

export const addNotification = async (userId: string, notification: Omit<Notification, 'id'>) => {
    await addDoc(collection(db, `users/${userId}/notifications`), notification);
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
    await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { isRead: true });
};

export const markAllNotificationsRead = async (userId: string) => {
    const q = query(collection(db, `users/${userId}/notifications`), where('isRead', '==', false));
    const snapshot = await getDocs(q);
    const batchPromises = snapshot.docs.map(d => updateDoc(d.ref, { isRead: true }));
    await Promise.all(batchPromises);
};

// --- Global Settings ---

export const getSystemSettings = async (): Promise<SystemSettings> => {
    const docRef = doc(db, 'settings', 'global');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data() as SystemSettings;
    }
    return {};
};

export const saveSystemSettings = async (settings: SystemSettings) => {
    await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
};

export const updateUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, {
        id: user.id,
        name: user.name,
        email: user.email,
        telegram: user.telegram || {},
        avatar: user.avatar || ''
    }, { merge: true });
};