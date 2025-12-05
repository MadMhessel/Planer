/**
 * Репозиторий для работы с участниками workspace в Firestore
 * Инкапсулирует всю логику доступа к данным members и invites
 */
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import { User, UserRole, WorkspaceInvite, WorkspaceMember } from '../../types';
import { logger } from '../../utils/logger';
import { getMoscowISOString, getMoscowDate } from '../../utils/dateUtils';

/**
 * Репозиторий для работы с участниками workspace
 */
export class MemberRepository {
  /**
   * Подписывается на изменения участников workspace
   * @param workspaceId ID рабочего пространства
   * @param callback Функция обратного вызова, вызываемая при изменении списка участников
   * @returns Функция для отмены подписки
   */
  subscribeToMembers(workspaceId: string, callback: (members: WorkspaceMember[]) => void): () => void {
    const membersRef = collection(db, 'workspaces', workspaceId, 'members');
    return onSnapshot(membersRef, (snapshot) => {
      const members: WorkspaceMember[] = snapshot.docs
        .map(docSnap => ({
          ...(docSnap.data() as WorkspaceMember),
          id: docSnap.id
        }))
        // Фильтруем members с валидными userId
        .filter(m => m.userId && typeof m.userId === 'string' && m.userId.trim() !== '');
      
      // Логируем информацию о members с telegramChatId для диагностики
      const membersWithTelegram = members.filter(m => m.telegramChatId);
      const invalidMembers = snapshot.docs
        .map(docSnap => ({
          ...(docSnap.data() as WorkspaceMember),
          id: docSnap.id
        }))
        .filter(m => !m.userId || typeof m.userId !== 'string' || m.userId.trim() === '');
      
      if (invalidMembers.length > 0) {
        logger.warn('[MemberRepository.subscribeToMembers] Found members with invalid userId', {
          workspaceId,
          invalidCount: invalidMembers.length,
          invalidMembers: invalidMembers.map(m => ({ id: m.id, email: m.email, userId: m.userId }))
        });
      }
      
      logger.info('[MemberRepository.subscribeToMembers] Members updated', {
        workspaceId,
        totalMembers: members.length,
        membersWithTelegram: membersWithTelegram.length,
        membersWithTelegramDetails: membersWithTelegram.map(m => ({
          userId: m.userId,
          email: m.email,
          telegramChatId: m.telegramChatId ? `${m.telegramChatId.substring(0, 5)}...` : 'none'
        })),
        allMembersDetails: members.map(m => ({
          userId: m.userId,
          email: m.email,
          hasTelegramChatId: !!m.telegramChatId
        }))
      });
      
      callback(members);
    }, (error) => {
      logger.error('[MemberRepository.subscribeToMembers] Error in snapshot', { 
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code
      });
    });
  }

  /**
   * Получает список участников workspace (одноразовый запрос)
   * @param workspaceId ID рабочего пространства
   * @returns Список участников
   */
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const membersRef = collection(db, 'workspaces', workspaceId, 'members');
    const snapshot = await getDocs(membersRef);
    return snapshot.docs.map(docSnap => ({
      ...(docSnap.data() as WorkspaceMember),
      id: docSnap.id
    }));
  }

  /**
   * Удаляет участника из workspace
   * @param workspaceId ID рабочего пространства
   * @param memberId ID участника для удаления
   * @param actingUser Пользователь, выполняющий действие (для проверки прав)
   */
  async removeMember(workspaceId: string, memberId: string, actingUser: WorkspaceMember): Promise<void> {
    logger.info('[MemberRepository.removeMember] Called', {
      workspaceId,
      memberId,
      actingUser: {
        userId: actingUser.userId,
        email: actingUser.email,
        role: actingUser.role
      }
    });

    const memberRef = doc(db, 'workspaces', workspaceId, 'members', memberId);
    const memberSnap = await getDoc(memberRef);
    if (!memberSnap.exists()) {
      logger.warn('[MemberRepository.removeMember] Member not found', { workspaceId, memberId });
      return;
    }

    const member = memberSnap.data() as WorkspaceMember;
    logger.info('[MemberRepository.removeMember] Member to delete:', {
      userId: member.userId,
      email: member.email,
      role: member.role
    });

    if (member.role === 'OWNER') {
      throw new Error('Нельзя удалить владельца рабочей области');
    }

    if (actingUser.role === 'MEMBER' || actingUser.role === 'VIEWER') {
      throw new Error('Недостаточно прав для удаления участника');
    }

    logger.info('[MemberRepository.removeMember] Attempting deleteDoc', {
      path: `workspaces/${workspaceId}/members/${memberId}`
    });

    try {
      await deleteDoc(memberRef);
      logger.info('[MemberRepository.removeMember] Member deleted successfully');
    } catch (error: any) {
      logger.error('[MemberRepository.removeMember] Error deleting member', error);
      // Добавляем дополнительную информацию об ошибке
      if (error?.code === 'permission-denied') {
        throw new Error(`Ошибка прав доступа: ${error.message}. Проверьте правила Firestore и наличие поля isSuperAdmin в документе пользователя.`);
      }
      throw error;
    }
  }

  /**
   * Создает приглашение для добавления участника в workspace
   * @param workspaceId ID рабочего пространства
   * @param email Email приглашаемого пользователя
   * @param role Роль, которая будет назначена участнику
   * @param invitedBy ID пользователя, который отправляет приглашение
   * @returns Созданное приглашение
   */
  async createInvite(workspaceId: string, email: string, role: UserRole, invitedBy: string): Promise<WorkspaceInvite> {
    // создаём документ заранее и используем его id как token
    const inviteRef = doc(collection(db, 'workspaces', workspaceId, 'invites'));
    const token = inviteRef.id;

    const now = getMoscowDate();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    const invite: WorkspaceInvite = {
      id: token,
      token,
      email: email.toLowerCase(),
      role,
      workspaceId,
      invitedBy,
      status: 'PENDING',
      createdAt: getMoscowISOString(),
      expiresAt: expiresAt.toISOString()
    };

    await setDoc(inviteRef, invite);

    return invite;
  }

  /**
   * Отзывает приглашение
   * @param workspaceId ID рабочего пространства
   * @param token Токен приглашения
   */
  async revokeInvite(workspaceId: string, token: string): Promise<void> {
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) return;

    const invite = inviteSnap.data() as WorkspaceInvite;
    if (invite.status !== 'PENDING') return;

    await updateDoc(inviteRef, {
      status: 'REVOKED',
      revokedAt: serverTimestamp()
    } as any);
  }

  /**
   * Получает приглашение по токену
   * @param workspaceId ID рабочего пространства
   * @param token Токен приглашения
   * @returns Приглашение или null, если не найдено
   */
  async getInvite(workspaceId: string, token: string): Promise<WorkspaceInvite | null> {
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const snap = await getDoc(inviteRef);
    if (!snap.exists()) return null;
    return { ...(snap.data() as WorkspaceInvite), id: snap.id };
  }

  /**
   * Подписывается на изменения приглашений в workspace
   * @param workspaceId ID рабочего пространства
   * @param callback Функция обратного вызова, вызываемая при изменении списка приглашений
   * @returns Функция для отмены подписки
   */
  subscribeToInvites(workspaceId: string, callback: (invites: WorkspaceInvite[]) => void): () => void {
    const invitesRef = collection(db, 'workspaces', workspaceId, 'invites');
    return onSnapshot(invitesRef, (snapshot) => {
      const invites: WorkspaceInvite[] = snapshot.docs.map(docSnap => ({
        ...(docSnap.data() as WorkspaceInvite),
        id: docSnap.id
      }));
      callback(invites);
    }, (error) => {
      logger.error('[MemberRepository.subscribeToInvites] Error in snapshot', { 
        workspaceId,
        error: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code
      });
    });
  }

  /**
   * Принимает приглашение и добавляет пользователя как участника workspace
   * Использует транзакцию для атомарности операции
   * @param workspaceId ID рабочего пространства
   * @param token Токен приглашения
   * @param user Пользователь, принимающий приглашение
   */
  async acceptInvite(workspaceId: string, token: string, user: User): Promise<void> {
    logger.info('[MemberRepository.acceptInvite] Starting', { workspaceId, token, userId: user.id, userEmail: user.email });
    
    const workspaceRef = doc(db, 'workspaces', workspaceId);
    const inviteRef = doc(db, 'workspaces', workspaceId, 'invites', token);
    const memberRef = doc(db, 'workspaces', workspaceId, 'members', user.id);

    try {
      await runTransaction(db, async (transaction) => {
        // ВСЕ ЧТЕНИЯ ДОЛЖНЫ БЫТЬ ВЫПОЛНЕНЫ ПЕРВЫМИ, ДО ВСЕХ ЗАПИСЕЙ
        
        // 1. Читаем приглашение
        const inviteSnap = await transaction.get(inviteRef);
        if (!inviteSnap.exists()) {
          logger.error('[MemberRepository.acceptInvite] Invite not found', { workspaceId, token });
          throw new Error('Приглашение не найдено');
        }

        const invite = inviteSnap.data() as WorkspaceInvite;
        logger.info('[MemberRepository.acceptInvite] Invite found', { 
          status: invite.status, 
          email: invite.email,
          role: invite.role 
        });
        
        if (invite.status !== 'PENDING') {
          throw new Error('Приглашение уже использовано или отозвано');
        }

        const now = getMoscowDate();
        if (new Date(invite.expiresAt) < now) {
          throw new Error('Срок действия приглашения истёк');
        }

        if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
          throw new Error('Это приглашение предназначено для другого пользователя');
        }

        // 2. Читаем member (если существует)
        const memberSnap = await transaction.get(memberRef);
        logger.info('[MemberRepository.acceptInvite] Member check', { exists: memberSnap.exists() });
        
        // 3. Читаем workspace (проверяем существование)
        const workspaceSnap = await transaction.get(workspaceRef);
        if (!workspaceSnap.exists()) {
          logger.error('[MemberRepository.acceptInvite] Workspace not found', { workspaceId });
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
            joinedAt: getMoscowISOString(),
            invitedBy: invite.invitedBy,
            status: 'ACTIVE'
          };
          logger.info('[MemberRepository.acceptInvite] Creating member', { 
            workspaceId, 
            memberId: user.id,
            role: invite.role 
          });
          transaction.set(memberRef, newMember);
        } else {
          logger.info('[MemberRepository.acceptInvite] Updating existing member', { workspaceId, memberId: user.id });
          transaction.update(memberRef, {
            role: invite.role,
            status: 'ACTIVE',
            joinedAt: now.toISOString()
          } as any);
        }

        // 5. Обновляем статус приглашения
        logger.info('[MemberRepository.acceptInvite] Updating invite status', { workspaceId, token });
        transaction.update(inviteRef, {
          status: 'ACCEPTED',
          acceptedAt: serverTimestamp()
        } as any);
      });
      
      logger.info('[MemberRepository.acceptInvite] Transaction completed successfully', { workspaceId, userId: user.id });
    } catch (error) {
      logger.error('[MemberRepository.acceptInvite] Transaction failed', { 
        workspaceId, 
        userId: user.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Экспортируем единственный экземпляр репозитория
export const memberRepository = new MemberRepository();
