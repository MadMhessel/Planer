// src/services/firestore.ts
import { 
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  deleteField,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { Project, Task, User, UserRole, Workspace, WorkspaceInvite, WorkspaceMember } from '../types';
import { logger } from '../utils/logger';
import { getMoscowISOString } from '../utils/dateUtils';
import { taskRepository } from '../infrastructure/firestore/TaskRepository';
import { projectRepository } from '../infrastructure/firestore/ProjectRepository';
import { workspaceRepository } from '../infrastructure/firestore/WorkspaceRepository';
import { memberRepository } from '../infrastructure/firestore/MemberRepository';

export const FirestoreService = {
  // --- Workspaces ---
  // ВНИМАНИЕ: Методы для работы с workspace теперь делегируются в WorkspaceRepository
  // Эти методы оставлены для обратной совместимости со старым кодом
  // Новый код должен использовать workspaceRepository напрямую

  async createWorkspace(name: string, owner: User): Promise<Workspace> {
    return workspaceRepository.createWorkspace(name, owner);
  },

  subscribeToWorkspaces(user: User, callback: (workspaces: Workspace[]) => void) {
    return workspaceRepository.subscribeToWorkspaces(user, callback);
  },

  // --- Members ---
  // ВНИМАНИЕ: Методы для работы с members теперь делегируются в MemberRepository
  // Эти методы оставлены для обратной совместимости со старым кодом
  // Новый код должен использовать memberRepository напрямую

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return memberRepository.getWorkspaceMembers(workspaceId);
  },

  subscribeToMembers(workspaceId: string, callback: (members: WorkspaceMember[]) => void) {
    return memberRepository.subscribeToMembers(workspaceId, callback);
  },

  async removeMember(workspaceId: string, memberId: string, actingUser: WorkspaceMember): Promise<void> {
    return memberRepository.removeMember(workspaceId, memberId, actingUser);
  },

  // --- Invites ---
  // ВНИМАНИЕ: Методы для работы с invites теперь делегируются в MemberRepository
  // Эти методы оставлены для обратной совместимости со старым кодом
  // Новый код должен использовать memberRepository напрямую

  async createInvite(workspaceId: string, email: string, role: UserRole, invitedBy: string): Promise<WorkspaceInvite> {
    return memberRepository.createInvite(workspaceId, email, role, invitedBy);
  },

  async revokeInvite(workspaceId: string, token: string): Promise<void> {
    return memberRepository.revokeInvite(workspaceId, token);
  },

  async getInvite(workspaceId: string, token: string): Promise<WorkspaceInvite | null> {
    return memberRepository.getInvite(workspaceId, token);
  },

  async acceptInvite(workspaceId: string, token: string, user: User): Promise<void> {
    return memberRepository.acceptInvite(workspaceId, token, user);
  },

  subscribeToInvites(workspaceId: string, callback: (invites: WorkspaceInvite[]) => void) {
    return memberRepository.subscribeToInvites(workspaceId, callback);
  },

  // --- Tasks ---
  // ВНИМАНИЕ: Методы для работы с задачами теперь делегируются в TaskRepository
  // Эти методы оставлены для обратной совместимости со старым кодом
  // Новый код должен использовать taskRepository напрямую

  subscribeToTasks(workspaceId: string, callback: (tasks: Task[]) => void) {
    return taskRepository.subscribeToTasks(workspaceId, callback);
  },

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    return taskRepository.createTask(task);
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return taskRepository.updateTask(taskId, updates);
  },

  async deleteTask(taskId: string): Promise<void> {
    return taskRepository.deleteTask(taskId);
  },

  // --- Projects ---
  // ВНИМАНИЕ: Методы для работы с проектами теперь делегируются в ProjectRepository
  // Эти методы оставлены для обратной совместимости со старым кодом
  // Новый код должен использовать projectRepository напрямую

  subscribeToProjects(workspaceId: string, callback: (projects: Project[]) => void) {
    return projectRepository.subscribeToProjects(workspaceId, callback);
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    return projectRepository.createProject(project);
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    return projectRepository.updateProject(projectId, updates);
  },

  async deleteProject(projectId: string): Promise<void> {
    return projectRepository.deleteProject(projectId);
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
      updatedAt: getMoscowISOString()
    });
  },

  /**
   * Синхронизирует telegramChatId из User во все WorkspaceMember этого пользователя
   */
  async syncTelegramChatIdToMembers(userId: string, telegramChatId?: string, userEmail?: string): Promise<void> {
    try {
      logger.info('[syncTelegramChatIdToMembers] Starting sync', {
        userId,
        userEmail,
        telegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty',
        telegramChatIdLength: telegramChatId?.length || 0
      });
      
      // Используем collection group query для поиска всех members с этим userId
      const membersQuery = query(
        collectionGroup(db, 'members'),
        where('userId', '==', userId)
      );
      
      let snapshot = await getDocs(membersQuery);
      logger.info('[syncTelegramChatIdToMembers] Found members', {
        userId,
        membersFound: snapshot.docs.length,
        memberPaths: snapshot.docs.map(d => d.ref.path)
      });
      
      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach((memberDoc) => {
        const memberRef = memberDoc.ref;
        const memberData = memberDoc.data();
        const updateData: any = {};
        
        logger.debug('[syncTelegramChatIdToMembers] Processing member', {
          memberPath: memberRef.path,
          currentTelegramChatId: memberData.telegramChatId ? `${memberData.telegramChatId.substring(0, 5)}...` : 'none',
          newTelegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty'
        });
        
        if (telegramChatId) {
          updateData.telegramChatId = telegramChatId;
        } else {
          // Если telegramChatId пустой, удаляем поле
          updateData.telegramChatId = deleteField();
        }
        
        batch.update(memberRef, updateData);
        updateCount++;
      });

      // Если не нашли по userId и есть email, пробуем найти по email
      if (updateCount === 0 && userEmail) {
        logger.info('[syncTelegramChatIdToMembers] No members found by userId, trying to find by email', {
          userId,
          userEmail
        });
        
        const membersByEmailQuery = query(
          collectionGroup(db, 'members'),
          where('email', '==', userEmail)
        );
        
        const emailSnapshot = await getDocs(membersByEmailQuery);
        logger.info('[syncTelegramChatIdToMembers] Found members by email', {
          userId,
          userEmail,
          membersFound: emailSnapshot.docs.length,
          memberPaths: emailSnapshot.docs.map(d => d.ref.path)
        });
        
        if (emailSnapshot.docs.length > 0) {
          const emailBatch = writeBatch(db);
          let emailUpdateCount = 0;
          
          emailSnapshot.docs.forEach((memberDoc) => {
            const memberRef = memberDoc.ref;
            const updateData: any = {};
            
            if (telegramChatId) {
              updateData.telegramChatId = telegramChatId;
            } else {
              updateData.telegramChatId = deleteField();
            }
            
            emailBatch.update(memberRef, updateData);
            emailUpdateCount++;
          });
          
          if (emailUpdateCount > 0) {
            await emailBatch.commit();
            logger.info('[syncTelegramChatIdToMembers] Successfully synced telegramChatId by email', {
              userId,
              userEmail,
              telegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty',
              membersUpdated: emailUpdateCount,
              memberPaths: emailSnapshot.docs.map(d => d.ref.path)
            });
            updateCount = emailUpdateCount;
          }
        }
      }
      
      if (updateCount > 0) {
        logger.info('[syncTelegramChatIdToMembers] Successfully synced telegramChatId', {
          userId,
          userEmail,
          telegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty',
          membersUpdated: updateCount
        });
      } else {
        logger.warn('[syncTelegramChatIdToMembers] No members found to update', { 
          userId,
          userEmail,
          telegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty',
          note: 'Make sure the user is a member of at least one workspace'
        });
      }
    } catch (error) {
      logger.error('[syncTelegramChatIdToMembers] Failed to sync', {
        userId,
        telegramChatId: telegramChatId ? `${telegramChatId.substring(0, 5)}...` : 'empty',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
};
