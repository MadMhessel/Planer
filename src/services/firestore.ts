// src/services/firestore.ts
import { 
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  deleteDoc,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { InviteStatus, Project, Task, TaskPriority, TaskStatus, User, UserRole, Workspace, WorkspaceInvite, WorkspaceMember } from '../types';
import { logger } from '../utils/logger';

export const FirestoreService = {
  // --- Workspaces ---

  async createWorkspace(name: string, owner: User): Promise<Workspace> {
    const workspaceRef = doc(collection(db, 'workspaces'));
    const now = new Date().toISOString();

    const workspace: Workspace = {
      id: workspaceRef.id,
      name,
      description: '',
      createdAt: now,
      ownerId: owner.id,
      plan: 'FREE'
    };

    await setDoc(workspaceRef, workspace);

    const member: WorkspaceMember = {
      id: owner.id,
      userId: owner.id,
      email: owner.email,
      role: 'OWNER',
      joinedAt: now,
      invitedBy: owner.id,
      status: 'ACTIVE'
    };

    const memberRef = doc(collection(workspaceRef, 'members'), owner.id);
    await setDoc(memberRef, member);

    return workspace;
  },

  subscribeToWorkspaces(user: User, callback: (workspaces: Workspace[]) => void) {
    if (!user.email) {
      callback([]);
      return () => {};
    }

    const workspaceMap = new Map<string, Workspace>();
    let ownedUnsubscribe: (() => void) | null = null;
    let memberUnsubscribe: (() => void) | null = null;

    const updateCallback = async () => {
      // Собираем все workspaceId из map
      const allWorkspaceIds = Array.from(workspaceMap.keys());
      
      // Загружаем данные workspace для тех, которых еще нет
      for (const workspaceId of allWorkspaceIds) {
        if (!workspaceMap.has(workspaceId)) {
          const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
          if (workspaceDoc.exists()) {
            const w = workspaceDoc.data() as Workspace;
            workspaceMap.set(workspaceId, { ...w, id: workspaceId });
          }
        }
      }
      
      const workspaces: Workspace[] = Array.from(workspaceMap.values());
      callback(workspaces);
    };

    // Подписка на workspace, где пользователь владелец
    const ownedQuery = query(
      collection(db, 'workspaces'),
      where('ownerId', '==', user.id)
    );

    ownedUnsubscribe = onSnapshot(ownedQuery, (snapshot) => {
      snapshot.docs.forEach(docSnap => {
        const w = docSnap.data() as Workspace;
        workspaceMap.set(docSnap.id, { ...w, id: docSnap.id });
      });
      updateCallback();
    });

    // Подписка на members через collection group (более эффективно)
    // Это автоматически найдет все workspace, где пользователь является участником
    const memberQuery = query(
      collectionGroup(db, 'members'),
      where('userId', '==', user.id),
      where('status', '==', 'ACTIVE')
    );

    memberUnsubscribe = onSnapshot(memberQuery, async (snapshot) => {
      const workspaceIds = new Set<string>();
      
      snapshot.docs.forEach(memberDoc => {
        // Путь к member: workspaces/{workspaceId}/members/{memberId}
        const pathParts = memberDoc.ref.path.split('/');
        const workspaceIdIndex = pathParts.indexOf('workspaces');
        if (workspaceIdIndex !== -1 && workspaceIdIndex + 1 < pathParts.length) {
          const workspaceId = pathParts[workspaceIdIndex + 1];
          workspaceIds.add(workspaceId);
        }
      });

      // Загружаем workspace для каждого найденного workspaceId
      for (const workspaceId of workspaceIds) {
        if (!workspaceMap.has(workspaceId)) {
          const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
          if (workspaceDoc.exists()) {
            const w = workspaceDoc.data() as Workspace;
            workspaceMap.set(workspaceId, { ...w, id: workspaceId });
          }
        }
      }
      
      updateCallback();
    });

    return () => {
      ownedUnsubscribe?.();
      memberUnsubscribe?.();
    };
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const membersRef = collection(db, 'workspaces', workspaceId, 'members');
    const snapshot = await getDocs(membersRef);
    return snapshot.docs.map(docSnap => ({
      ...(docSnap.data() as WorkspaceMember),
      id: docSnap.id
    }));
  },

  subscribeToMembers(workspaceId: string, callback: (members: WorkspaceMember[]) => void) {
    const membersRef = collection(db, 'workspaces', workspaceId, 'members');
    return onSnapshot(membersRef, (snapshot) => {
      const members: WorkspaceMember[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as WorkspaceMember),
        id: docSnap.id
      }));
      callback(members);
    });
  },

  // --- Invites ---

  async createInvite(workspaceId: string, email: string, role: UserRole, invitedBy: string): Promise<WorkspaceInvite> {
    // создаём документ заранее и используем его id как token
    const inviteRef = doc(collection(db, 'workspaces', workspaceId, 'invites'));
    const token = inviteRef.id;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    const invite: WorkspaceInvite = {
      id: token,
      token,
      email: email.toLowerCase(),
      role,
      workspaceId,
      invitedBy,
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await setDoc(inviteRef, invite);

    return invite;
  },

  async revokeInvite(workspaceId: string, token: string) {
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) return;

    const invite = inviteSnap.data() as WorkspaceInvite;
    if (invite.status !== 'PENDING') return;

    await updateDoc(inviteRef, {
      status: 'REVOKED',
      revokedAt: serverTimestamp()
    } as any);
  },

  async getInvite(workspaceId: string, token: string): Promise<WorkspaceInvite | null> {
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) return null;
    return { ...(snap.data() as WorkspaceInvite), id: snap.id };
  },

  async acceptInvite(workspaceId: string, token: string, user: User): Promise<void> {
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', user.id);

    await runTransaction(db, async (transaction) => {
      // ВСЕ ЧТЕНИЯ ДОЛЖНЫ БЫТЬ ВЫПОЛНЕНЫ ПЕРВЫМИ, ДО ВСЕХ ЗАПИСЕЙ
      
      // 1. Читаем приглашение
      const inviteSnap = await transaction.get(inviteRef);
      if (!inviteSnap.exists()) {
        throw new Error('Приглашение не найдено');
      }

      const invite = inviteSnap.data() as WorkspaceInvite;
      if (invite.status !== 'PENDING') {
        throw new Error('Приглашение уже использовано или отозвано');
      }

      const now = new Date();
      if (new Date(invite.expiresAt) < now) {
        throw new Error('Срок действия приглашения истёк');
      }

      if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
        throw new Error('Это приглашение предназначено для другого пользователя');
      }

      // 2. Читаем member (если существует)
      const memberSnap = await transaction.get(memberRef);
      
      // 3. Читаем workspace (проверяем существование)
      const workspaceSnap = await transaction.get(workspaceRef);
      if (!workspaceSnap.exists()) {
        throw new Error('Рабочее пространство не найдено');
      }

      // ТЕПЕРЬ ВЫПОЛНЯЕМ ВСЕ ЗАПИСИ (после всех чтений)
      
      // 4. Создаем или обновляем member
      if (!memberSnap.exists()) {
        const newMember: WorkspaceMember = {
          id: user.id,
          userId: user.id,
          email: user.email,
          role: invite.role,
          joinedAt: now.toISOString(),
          invitedBy: invite.invitedBy,
          status: 'ACTIVE'
        };
        transaction.set(memberRef, newMember);
      } else {
        transaction.update(memberRef, {
          role: invite.role,
          status: 'ACTIVE',
          joinedAt: now.toISOString()
        } as any);
      }

      // 5. Обновляем статус приглашения
      transaction.update(inviteRef, {
        status: 'ACCEPTED',
        acceptedAt: serverTimestamp()
      } as any);
    });
  },

  async removeMember(workspaceId: string, memberId: string, actingUser: WorkspaceMember) {
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', memberId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) return;

    const member = memberSnap.data() as WorkspaceMember;

    if (member.role === 'OWNER') {
      throw new Error('Нельзя удалить владельца рабочей области');
    }

    if (actingUser.role === 'MEMBER' || actingUser.role === 'VIEWER') {
      throw new Error('Недостаточно прав для удаления участника');
    }

    await deleteDoc(memberRef);
  },

  subscribeToInvites(workspaceId: string, callback: (invites: WorkspaceInvite[]) => void) {
    const invitesRef = collection(db, 'workspaces', workspaceId, 'invites');
    return onSnapshot(invitesRef, (snapshot) => {
      const invites: WorkspaceInvite[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as WorkspaceInvite),
        id: docSnap.id
      }));
      callback(invites);
    });
  },

  // --- Tasks ---

  subscribeToTasks(workspaceId: string, callback: (tasks: Task[]) => void) {
    const q = query(
      collection(db, 'tasks'),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const tasks: Task[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Task),
        id: docSnap.id
      }));
      callback(tasks);
    });
  },

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    // Фильтруем undefined значения, так как Firestore их не принимает
    const taskData: any = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Копируем только определенные поля
    Object.keys(task).forEach(key => {
      const value = (task as any)[key];
      if (value !== undefined) {
        taskData[key] = value;
      }
    });

    const docRef = await addDoc(collection(db, 'tasks'), taskData);

    const docSnap = await getDoc(docRef);
    return {
      ...(docSnap.data() as Task),
      id: docSnap.id
    };
  },

  async updateTask(taskId: string, updates: Partial<Task>) {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    } as any);
  },

  async deleteTask(taskId: string) {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  },

  // --- Projects ---

  subscribeToProjects(workspaceId: string, callback: (projects: Project[]) => void) {
    const q = query(
      collection(db, 'projects'),
      where('workspaceId', '==', workspaceId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const projects: Project[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as Project),
        id: docSnap.id
      }));
      callback(projects);
    });
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    // Фильтруем undefined значения, так как Firestore их не принимает
    const projectData: any = {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Копируем только определенные поля
    Object.keys(project).forEach(key => {
      const value = (project as any)[key];
      if (value !== undefined && value !== null && value !== '') {
        projectData[key] = value;
      }
    });

    // Убеждаемся, что обязательные поля присутствуют
    if (!projectData.workspaceId) {
      throw new Error('workspaceId is required');
    }
    if (!projectData.name) {
      throw new Error('name is required');
    }
    if (!projectData.ownerId) {
      throw new Error('ownerId is required');
    }

    logger.info('Creating project', {
      workspaceId: projectData.workspaceId,
      name: projectData.name,
      ownerId: projectData.ownerId,
      hasDescription: !!projectData.description,
      hasColor: !!projectData.color
    });

    const docRef = await addDoc(collection(db, 'projects'), projectData);

    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      throw new Error('Failed to create project document');
    }
    
    return {
      ...(docSnap.data() as Project),
      id: docSnap.id
    };
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    const projectRef = doc(db, 'projects', projectId);
    
    // Фильтруем undefined значения, так как Firestore их не принимает
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    // Копируем только определенные поля
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    await updateDoc(projectRef, updateData);
  },

  async deleteProject(projectId: string) {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
  },

  // --- Users ---

  async getUserById(userId: string): Promise<User | null> {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return null;
    return {
      ...(snap.data() as User),
      id: snap.id
    };
  },

  async updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'email' | 'createdAt'>>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }
};
