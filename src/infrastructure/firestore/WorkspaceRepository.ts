/**
 * Репозиторий для работы с рабочими пространствами в Firestore
 * Инкапсулирует всю логику доступа к данным workspace
 */
import { 
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where
} from 'firebase/firestore';
import { db } from '../../firebase';
import { User, Workspace, WorkspaceMember } from '../../types';
import { logger } from '../../utils/logger';
import { getMoscowISOString } from '../../utils/dateUtils';

/**
 * Репозиторий для работы с рабочими пространствами
 */
export class WorkspaceRepository {
  /**
   * Подписывается на изменения рабочих пространств пользователя
   * Находит все workspace, где пользователь является владельцем или участником
   * @param user Пользователь, для которого нужно получить workspace
   * @param callback Функция обратного вызова, вызываемая при изменении списка workspace
   * @returns Функция для отмены подписки
   */
  subscribeToWorkspaces(user: User, callback: (workspaces: Workspace[]) => void): () => void {
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
      logger.info('[WorkspaceRepository.subscribeToWorkspaces] updateCallback', { 
        workspaceIds: allWorkspaceIds,
        mapSize: workspaceMap.size
      });
      
      // Загружаем данные workspace для тех, которых еще нет
      for (const workspaceId of allWorkspaceIds) {
        if (!workspaceMap.has(workspaceId)) {
          try {
            const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
            if (workspaceDoc.exists()) {
              const w = workspaceDoc.data() as Workspace;
              workspaceMap.set(workspaceId, { ...w, id: workspaceId });
              logger.info('[WorkspaceRepository.subscribeToWorkspaces] Loaded workspace in updateCallback', { workspaceId, name: w.name });
            }
          } catch (error) {
            logger.error('[WorkspaceRepository.subscribeToWorkspaces] Error in updateCallback', { 
              workspaceId, 
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
      
      const workspaces: Workspace[] = Array.from(workspaceMap.values());
      logger.info('[WorkspaceRepository.subscribeToWorkspaces] Calling callback with workspaces', { 
        count: workspaces.length,
        workspaceIds: workspaces.map(w => w.id)
      });
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
      logger.info('[WorkspaceRepository.subscribeToWorkspaces] Member query snapshot', { 
        count: snapshot.docs.length,
        userId: user.id,
        hasError: snapshot.metadata.hasPendingWrites
      });
      
      const workspaceIds = new Set<string>();
      
      snapshot.docs.forEach(memberDoc => {
        // Путь к member: workspaces/{workspaceId}/members/{memberId}
        const pathParts = memberDoc.ref.path.split('/');
        const workspaceIdIndex = pathParts.indexOf('workspaces');
        if (workspaceIdIndex !== -1 && workspaceIdIndex + 1 < pathParts.length) {
          const workspaceId = pathParts[workspaceIdIndex + 1];
          workspaceIds.add(workspaceId);
          logger.info('[WorkspaceRepository.subscribeToWorkspaces] Found member', { 
            workspaceId, 
            memberId: memberDoc.id,
            memberData: memberDoc.data()
          });
        } else {
          logger.warn('[WorkspaceRepository.subscribeToWorkspaces] Invalid member path', { path: memberDoc.ref.path });
        }
      });

      logger.info('[WorkspaceRepository.subscribeToWorkspaces] Workspace IDs from members', { 
        workspaceIds: Array.from(workspaceIds),
        currentMapSize: workspaceMap.size
      });

      // Загружаем workspace для каждого найденного workspaceId
      for (const workspaceId of workspaceIds) {
        if (!workspaceMap.has(workspaceId)) {
          try {
            const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
            if (workspaceDoc.exists()) {
              const w = workspaceDoc.data() as Workspace;
              workspaceMap.set(workspaceId, { ...w, id: workspaceId });
              logger.info('[WorkspaceRepository.subscribeToWorkspaces] Loaded workspace', { workspaceId, name: w.name });
            } else {
              logger.warn('[WorkspaceRepository.subscribeToWorkspaces] Workspace not found', { workspaceId });
            }
          } catch (error) {
            logger.error('[WorkspaceRepository.subscribeToWorkspaces] Error loading workspace', { 
              workspaceId, 
              error: error instanceof Error ? error.message : String(error)
            });
          }
        } else {
          logger.info('[WorkspaceRepository.subscribeToWorkspaces] Workspace already in map', { workspaceId });
        }
      }
      
      logger.info('[WorkspaceRepository.subscribeToWorkspaces] Calling updateCallback', { 
        finalMapSize: workspaceMap.size,
        workspaceIds: Array.from(workspaceMap.keys())
      });
      updateCallback();
    }, (error: any) => {
      // Улучшенное логирование ошибки
      const errorInfo: any = {
        userId: user.id,
        errorMessage: error?.message || String(error),
        errorCode: error?.code,
        errorName: error?.name,
        errorStack: error?.stack
      };
      
      // Если это FirebaseError, добавляем дополнительную информацию
      if (error?.code) {
        errorInfo.firebaseErrorCode = error.code;
      }
      
      logger.error('[WorkspaceRepository.subscribeToWorkspaces] Member query error', errorInfo);
      
      // Если это ошибка прав доступа, выводим более понятное сообщение
      if (error?.code === 'permission-denied') {
        logger.error('[WorkspaceRepository.subscribeToWorkspaces] Permission denied - check Firestore rules for collection group queries on members', {
          userId: user.id,
          suggestion: 'Ensure rule allows: resource.data.userId == request.auth.uid for collection group queries'
        });
      }
    });

    return () => {
      ownedUnsubscribe?.();
      memberUnsubscribe?.();
    };
  }

  /**
   * Создает новое рабочее пространство и добавляет владельца как участника
   * Использует транзакцию для атомарности операции
   * @param name Название workspace
   * @param owner Владелец workspace
   * @returns Созданное workspace
   */
  async createWorkspace(name: string, owner: User): Promise<Workspace> {
    logger.info('[WorkspaceRepository.createWorkspace] Начало создания workspace', {
      name,
      ownerId: owner.id,
      ownerEmail: owner.email,
      ownerDisplayName: owner.displayName
    });

    const workspaceRef = doc(collection(db, 'workspaces'));
    const now = getMoscowISOString();

    const workspace: Workspace = {
      id: workspaceRef.id,
      name,
      description: '',
      createdAt: now,
      ownerId: owner.id,
      plan: 'FREE'
    };

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

    logger.info('[WorkspaceRepository.createWorkspace] Данные для транзакции', {
      workspaceId: workspaceRef.id,
      workspacePath: workspaceRef.path,
      workspaceData: workspace,
      memberId: memberRef.id,
      memberPath: memberRef.path,
      memberData: member
    });

    try {
      // Используем транзакцию, чтобы гарантировать атомарность создания workspace и member
      await runTransaction(db, async (transaction) => {
        logger.info('[WorkspaceRepository.createWorkspace] Начало транзакции');
        transaction.set(workspaceRef, workspace);
        logger.info('[WorkspaceRepository.createWorkspace] Workspace добавлен в транзакцию');
        transaction.set(memberRef, member);
        logger.info('[WorkspaceRepository.createWorkspace] Member добавлен в транзакцию');
      });
      logger.info('[WorkspaceRepository.createWorkspace] Транзакция успешно завершена', { workspaceId: workspaceRef.id });
    } catch (error) {
      const errorDetails = error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: (error as any).code,
        serverResponse: (error as any).serverResponse
      } : { error: String(error) };
      
      logger.error('[WorkspaceRepository.createWorkspace] Ошибка при создании workspace', {
        workspaceId: workspaceRef.id,
        ownerId: owner.id,
        ownerEmail: owner.email,
        workspaceData: workspace,
        errorDetails
      });
      
      throw error;
    }

    return workspace;
  }
}

// Экспортируем единственный экземпляр репозитория
export const workspaceRepository = new WorkspaceRepository();
