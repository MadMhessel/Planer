import { Task, Project, Notification, WorkspaceMember } from '../types';
import { NOTIFICATION_TYPES } from '../constants/notifications';
import { getStatusLabel, getPriorityLabel } from './taskHelpers';
import { getMoscowISOString, formatMoscowDate } from './dateUtils';
import { logger } from './logger';

export const createTaskNotification = (
  workspaceId: string,
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED',
  task: Task,
  changes?: Partial<Task>,
  recipients?: string[]
): Omit<Notification, 'id'> => {
  const assigneeName = changes?.assigneeId 
    ? 'назначена' 
    : task.assigneeId 
    ? 'назначена' 
    : 'создана';

  const notification: Omit<Notification, 'id'> = {
    workspaceId,
    type,
    title: type === 'TASK_ASSIGNED' ? 'Новая задача создана' : 'Задача обновлена',
    message: `Задача "${task.title}" ${assigneeName}`,
    createdAt: getMoscowISOString(),
    readBy: []
  };

  // Добавляем recipients только если они определены и не пусты
  if (recipients && recipients.length > 0) {
    notification.recipients = recipients;
  }

  return notification;
};

export const createTelegramMessage = (
  type: 'TASK_ASSIGNED' | 'TASK_UPDATED' | 'TASK_DELETED' | 'PROJECT_CREATED' | 'PROJECT_UPDATED' | 'PROJECT_DELETED',
  taskOrProject: Task | Project,
  changes?: Partial<Task> | Partial<Project>,
  oldTask?: Task,
  projectName?: string
): string => {
  if (type === 'TASK_ASSIGNED') {
    const task = taskOrProject as Task;
    const projectText = projectName ? `\n📁 Проект: ${projectName}` : '';
    const dueDate = task.dueDate 
      ? `\n📅 Срок: ${formatMoscowDate(task.dueDate)}` 
      : '';
    const priorityText = getPriorityLabel(task.priority);
    
    let text = `🆕 <b>Новая задача</b>\n\n📝 <b>${task.title}</b>`;
    if (task.description) {
      text += `\n\n${task.description}`;
    }
    if (projectText) {
      text += projectText;
    }
    if (dueDate) {
      text += dueDate;
    }
    text += `\n⚡ Приоритет: ${priorityText}`;
    return text;
  }

  if (type === 'TASK_UPDATED' && oldTask) {
    const task = taskOrProject as Task;
    const changesTyped = changes as Partial<Task>;

    // Смена статуса
    if (changesTyped.status && changesTyped.status !== oldTask.status) {
      const oldStatusText = getStatusLabel(oldTask.status);
      const newStatusText = getStatusLabel(changesTyped.status);
      return `🔄 <b>Обновление статуса</b>\n\n📝 <b>${oldTask.title}</b>\n\n${oldStatusText} ➡️ <b>${newStatusText}</b>`;
    }

    // Смена дедлайна
    if (changesTyped.dueDate && changesTyped.dueDate !== oldTask.dueDate) {
      const newDueDate = formatMoscowDate(changesTyped.dueDate);
      return `📅 <b>Обновление сроков</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый дедлайн: <b>${newDueDate}</b>`;
    }

    // Назначение исполнителя
    if (changesTyped.assigneeId && changesTyped.assigneeId !== oldTask.assigneeId) {
      return `👉 <b>Вам назначена задача</b>\n\n📝 <b>${oldTask.title}</b>`;
    }

    // Смена приоритета
    if (changesTyped.priority && changesTyped.priority !== oldTask.priority) {
      const priorityText = getPriorityLabel(changesTyped.priority);
      return `⚡ <b>Изменен приоритет</b>\n\n📝 <b>${oldTask.title}</b>\n\nНовый приоритет: <b>${priorityText}</b>`;
    }

    // Обновление названия/описания
    if (changesTyped.title || changesTyped.description) {
      return `✏️ <b>Задача обновлена</b>\n\n📝 <b>${changesTyped.title || oldTask.title}</b>`;
    }
  }

  if (type === 'TASK_DELETED') {
    const task = taskOrProject as Task;
    return `🗑️ <b>Задача удалена</b>\n\n📝 <b>${task.title}</b>`;
  }

  if (type === 'PROJECT_CREATED') {
    const project = taskOrProject as Project;
    return `📁 <b>Новый проект</b>\n\n<b>${project.name}</b>${project.description ? `\n\n${project.description}` : ''}`;
  }

  if (type === 'PROJECT_UPDATED') {
    const project = taskOrProject as Project;
    const changesTyped = changes as Partial<Project>;
    let text = `📁 <b>Проект обновлен</b>\n\n<b>${changesTyped.name || project.name}</b>`;
    if (changesTyped.status) {
      text += `\n\nСтатус: <b>${changesTyped.status}</b>`;
    }
    return text;
  }

  if (type === 'PROJECT_DELETED') {
    const project = taskOrProject as Project;
    return `🗑️ <b>Проект удален</b>\n\n<b>${project.name}</b>`;
  }

  return '';
};

export const getRecipientsForTask = (
  task: Partial<Task>,
  allMembers: WorkspaceMember[],
  creatorId?: string
): string[] => {
  const recipients: string[] = [];
  const recipientChatIds = new Set<string>();
  
  // Фильтруем members с валидными userId
  const validMembers = allMembers.filter(m => m.userId && typeof m.userId === 'string' && m.userId.trim() !== '');
  
  // Логируем для диагностики (всегда, чтобы видеть проблему)
  logger.info('[getRecipientsForTask] Starting', {
    taskId: (task as any)?.id,
    taskTitle: (task as any)?.title,
    hasAssigneeId: !!task.assigneeId,
    assigneeId: task.assigneeId,
    hasAssigneeIds: !!task.assigneeIds,
    assigneeIds: task.assigneeIds,
    assigneeIdsCount: task.assigneeIds?.length || 0,
    membersCount: allMembers.length,
    validMembersCount: validMembers.length,
    membersWithInvalidUserId: allMembers.filter(m => !m.userId || typeof m.userId !== 'string').length,
    membersWithTelegram: validMembers.filter(m => m.telegramChatId).length,
    allMembersDetails: allMembers.map(m => ({
      userId: m.userId,
      email: m.email,
      hasTelegramChatId: !!m.telegramChatId,
      telegramChatId: m.telegramChatId ? `${m.telegramChatId.substring(0, 5)}...` : 'none',
      isValid: !!(m.userId && typeof m.userId === 'string' && m.userId.trim() !== '')
    })),
    creatorId
  });
  
  // Обрабатываем assigneeIds (приоритет над assigneeId)
  if (task.assigneeIds && Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) {
    logger.info('[getRecipientsForTask] Processing assigneeIds', {
      assigneeIds: task.assigneeIds,
      membersCount: allMembers.length,
      validMembersCount: validMembers.length,
      memberUserIds: validMembers.map(m => m.userId),
      memberEmails: validMembers.map(m => m.email)
    });
    
    task.assigneeIds.forEach(assigneeId => {
      if (assigneeId) {
        // Ищем только среди валидных members
        let assignee = validMembers.find(m => m.userId === assigneeId);
        
        // Если не нашли по userId, пробуем найти по email
        if (!assignee && assigneeId.includes('@')) {
          assignee = validMembers.find(m => m.email === assigneeId);
          if (assignee) {
            logger.info('[getRecipientsForTask] Found assignee by email', {
              assigneeId,
              assigneeUserId: assignee.userId,
              assigneeEmail: assignee.email
            });
          }
        }
        
        // Если все еще не нашли, пробуем найти среди всех members (включая невалидные)
        // Это может помочь, если assigneeId не совпадает с userId в members
        if (!assignee) {
          assignee = allMembers.find(m => m.userId === assigneeId);
          if (assignee) {
            logger.warn('[getRecipientsForTask] Found assignee in invalid members (should fix data)', {
              assigneeId,
              assigneeUserId: assignee.userId,
              assigneeEmail: assignee.email,
              isValid: !!(assignee.userId && typeof assignee.userId === 'string' && assignee.userId.trim() !== '')
            });
          }
        }
        
        if (assignee) {
          logger.info('[getRecipientsForTask] Found assignee', {
            assigneeId,
            assigneeUserId: assignee.userId,
            assigneeEmail: assignee.email,
            hasTelegramChatId: !!assignee.telegramChatId,
            telegramChatId: assignee.telegramChatId ? `${assignee.telegramChatId.substring(0, 5)}...` : 'none'
          });
          if (assignee.telegramChatId && !recipientChatIds.has(assignee.telegramChatId)) {
            recipients.push(assignee.telegramChatId);
            recipientChatIds.add(assignee.telegramChatId);
          } else if (!assignee.telegramChatId) {
            logger.warn('[getRecipientsForTask] Assignee has no telegramChatId', { 
              assigneeId,
              assigneeUserId: assignee.userId,
              assigneeEmail: assignee.email 
            });
          }
        } else {
          logger.error('[getRecipientsForTask] Assignee not found in valid members', { 
            assigneeId,
            validMemberUserIds: validMembers.map(m => m.userId),
            validMemberEmails: validMembers.map(m => m.email),
            allMemberUserIds: allMembers.map(m => m.userId),
            allMemberEmails: allMembers.map(m => m.email)
          });
        }
      }
    });
  } else if (task.assigneeId) {
    // Обратная совместимость: используем assigneeId, если assigneeIds нет
    logger.info('[getRecipientsForTask] Looking for assignee (legacy)', {
      assigneeId: task.assigneeId,
      membersCount: allMembers.length,
      validMembersCount: validMembers.length,
      validMemberUserIds: validMembers.map(m => m.userId),
      validMemberEmails: validMembers.map(m => m.email),
      invalidMembers: allMembers.filter(m => !m.userId || typeof m.userId !== 'string').map(m => ({ email: m.email, userId: m.userId }))
    });
    
    // Ищем только среди валидных members
    let assignee = validMembers.find(m => m.userId === task.assigneeId);
    
    // Если не нашли в валидных, пробуем найти среди всех members
    if (!assignee) {
      assignee = allMembers.find(m => m.userId === task.assigneeId);
      if (assignee) {
        logger.warn('[getRecipientsForTask] Found assignee in invalid members (legacy, should fix data)', {
          assigneeId: task.assigneeId,
          assigneeUserId: assignee.userId,
          assigneeEmail: assignee.email,
          isValid: !!(assignee.userId && typeof assignee.userId === 'string' && assignee.userId.trim() !== '')
        });
      }
    }
    
    if (assignee) {
      logger.info('[getRecipientsForTask] Found assignee (legacy)', {
        assigneeId: task.assigneeId,
        assigneeEmail: assignee.email,
        hasTelegramChatId: !!assignee.telegramChatId,
        telegramChatId: assignee.telegramChatId ? `${assignee.telegramChatId.substring(0, 5)}...` : 'none'
      });
      if (assignee.telegramChatId && !recipientChatIds.has(assignee.telegramChatId)) {
        recipients.push(assignee.telegramChatId);
        recipientChatIds.add(assignee.telegramChatId);
      } else if (!assignee.telegramChatId) {
        logger.warn('[getRecipientsForTask] Assignee has no telegramChatId (legacy)', { 
          assigneeId: task.assigneeId,
          assigneeEmail: assignee.email 
        });
      }
    } else {
      // Пробуем найти по email, если не нашли по userId
      // Это может произойти, если assigneeId - это Firebase Auth ID, а не WorkspaceMember.userId
      logger.warn('[getRecipientsForTask] Assignee not found in members by userId (legacy), trying to find by email or currentUser', { 
        assigneeId: task.assigneeId,
        allMemberUserIds: allMembers.map(m => m.userId),
        allMemberEmails: allMembers.map(m => m.email)
      });
      
      // Если assigneeId это email, попробуем найти по email
      if (task.assigneeId.includes('@')) {
        const assigneeByEmail = validMembers.find(m => m.email === task.assigneeId);
        if (assigneeByEmail) {
          logger.info('[getRecipientsForTask] Found assignee by email (legacy)', {
            assigneeId: task.assigneeId,
            assigneeUserId: assigneeByEmail.userId,
            assigneeEmail: assigneeByEmail.email,
            hasTelegramChatId: !!assigneeByEmail.telegramChatId,
            telegramChatId: assigneeByEmail.telegramChatId ? `${assigneeByEmail.telegramChatId.substring(0, 5)}...` : 'none'
          });
          if (assigneeByEmail.telegramChatId && !recipientChatIds.has(assigneeByEmail.telegramChatId)) {
            recipients.push(assigneeByEmail.telegramChatId);
            recipientChatIds.add(assigneeByEmail.telegramChatId);
          }
        } else {
          logger.error('[getRecipientsForTask] Assignee not found in valid members by email (legacy)', { 
            assigneeId: task.assigneeId,
            validMemberEmails: validMembers.map(m => m.email),
            allMemberEmails: allMembers.map(m => m.email)
          });
        }
      } else {
        // Если assigneeId не найден, возможно это Firebase Auth ID
        // Попробуем найти текущего пользователя по email из members
        // Это временное решение - правильное решение - использовать правильный userId при создании задачи
        logger.error('[getRecipientsForTask] Assignee not found in valid members (legacy)', { 
          assigneeId: task.assigneeId,
          validMemberUserIds: validMembers.map(m => m.userId),
          validMemberEmails: validMembers.map(m => m.email),
          allMemberUserIds: allMembers.map(m => m.userId),
          allMemberEmails: allMembers.map(m => m.email),
          note: 'This assigneeId might be a Firebase Auth ID that does not match WorkspaceMember.userId. The task should be updated to use the correct userId from WorkspaceMember.'
        });
      }
    }
  }
  
  // Добавляем создателя, если он не является участником задачи
  if (creatorId) {
    const isCreatorAssignee = task.assigneeIds?.includes(creatorId) || task.assigneeId === creatorId;
    if (!isCreatorAssignee) {
      // Ищем только среди валидных members
      const creator = validMembers.find(m => m.userId === creatorId);
      if (creator) {
        if (process.env.NODE_ENV === 'development') {
          logger.debug('[getRecipientsForTask] Found creator', {
            creatorId,
            hasTelegramChatId: !!creator.telegramChatId,
            telegramChatId: creator.telegramChatId ? `${creator.telegramChatId.substring(0, 5)}...` : 'none'
          });
        }
        if (creator.telegramChatId && !recipientChatIds.has(creator.telegramChatId)) {
          recipients.push(creator.telegramChatId);
          recipientChatIds.add(creator.telegramChatId);
        } else if (!creator.telegramChatId) {
          logger.warn('[getRecipientsForTask] Creator has no telegramChatId', { 
            creatorId,
            creatorEmail: creator.email 
          });
        }
      } else {
        logger.warn('[getRecipientsForTask] Creator not found in members', { creatorId });
      }
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    logger.debug('[getRecipientsForTask] Result', {
      recipientsCount: recipients.length,
      recipients: recipients.map(r => `${r.substring(0, 5)}...`)
    });
  }
  
  // Логируем результат
  logger.info('[getRecipientsForTask] Result', {
    taskId: (task as any)?.id,
    recipientsCount: recipients.length,
    recipients: recipients.map(r => `${r.substring(0, 5)}...`),
    hasAssigneeId: !!task.assigneeId,
    hasAssigneeIds: !!task.assigneeIds,
    assigneeIdsCount: task.assigneeIds?.length || 0
  });
  
  // Логируем предупреждение, если нет получателей, но есть участники задачи
  if (recipients.length === 0 && (task.assigneeId || (task.assigneeIds && task.assigneeIds.length > 0))) {
    logger.warn('[getRecipientsForTask] ⚠️ No Telegram recipients found despite having assignees', {
      taskId: (task as any)?.id,
      taskTitle: (task as any)?.title,
      hasAssigneeId: !!task.assigneeId,
      assigneeId: task.assigneeId,
      hasAssigneeIds: !!task.assigneeIds,
      assigneeIds: task.assigneeIds,
      assigneeIdsCount: task.assigneeIds?.length || 0,
      membersWithTelegram: allMembers.filter(m => m.telegramChatId).length,
      totalMembers: allMembers.length,
      membersDetails: allMembers.map(m => ({
        userId: m.userId,
        email: m.email,
        hasTelegramChatId: !!m.telegramChatId
      }))
    });
  }
  
  return recipients;
};

export const getAllTelegramRecipients = (allMembers: WorkspaceMember[]): string[] => {
  return allMembers
    .filter(m => m.telegramChatId && m.status === 'ACTIVE')
    .map(m => m.telegramChatId!)
    .filter((id, index, self) => self.indexOf(id) === index);
};

